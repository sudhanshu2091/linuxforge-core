/** M3 terminal control-plane persistence.
 *
 * Terminal sessions are learner-owned control-plane objects. They are separate
 * from the underlying runtime PTY and are invalidated whenever the runtime
 * lifecycle/binding changes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/integrations/supabase/server-admin";
import type { Database, Json } from "@/integrations/supabase/types";
export type Db = SupabaseClient<Database>;

export const TERMINAL_SESSION_STATES = [
  "CREATED",
  "AUTHORIZED",
  "CONNECTED",
  "DISCONNECTED",
  "CLOSED",
  "EXPIRED",
  "FAILED",
] as const;
export type PersistentTerminalSessionState = (typeof TERMINAL_SESSION_STATES)[number];

export type PersistentTerminalSession = {
  sessionId: string;
  userId: string;
  instanceId: string;
  runtimeId: string;
  labId: string;
  shell: "bash" | "zsh" | "sh";
  cwd: string;
  state: PersistentTerminalSessionState;
  bindingGeneration: number;
  runtimeLifecycleGeneration: number;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
  closedAt: string | null;
};

const toSession = (
  row: Database["public"]["Tables"]["lab_terminal_sessions"]["Row"],
): PersistentTerminalSession => ({
  sessionId: row.session_id,
  userId: row.user_id,
  instanceId: row.instance_id,
  runtimeId: row.runtime_id,
  labId: row.lab_id,
  shell: row.shell as PersistentTerminalSession["shell"],
  cwd: row.cwd,
  state: row.state as PersistentTerminalSessionState,
  bindingGeneration: row.binding_generation,
  runtimeLifecycleGeneration: row.runtime_lifecycle_generation,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastSeenAt: row.last_seen_at,
  expiresAt: row.expires_at,
  closedAt: row.closed_at,
});

export async function recordTerminalSessionEvent(input: {
  db: Db;
  userId: string;
  instanceId: string;
  sessionId: string;
  eventType:
    | "CREATED"
    | "AUTHORIZED"
    | "CONNECTED"
    | "DISCONNECTED"
    | "RECONNECTED"
    | "CLOSED"
    | "EXPIRED"
    | "FAILED"
    | "REVOKED";
  data?: Record<string, unknown>;
  eventDb?: Db;
}): Promise<void> {
  const eventDb = input.eventDb ?? createSupabaseAdminClient();
  const result = await eventDb.from("lab_terminal_session_events").insert({
    session_id: input.sessionId,
    user_id: input.userId,
    instance_id: input.instanceId,
    event_type: input.eventType,
    data: JSON.parse(JSON.stringify(input.data ?? {})) as Json,
  });
  if (result.error) throw new Error(result.error.message);
}

export async function createTerminalSession(input: {
  db: Db;
  userId: string;
  instanceId: string;
  runtimeId: string;
  labId: string;
  sessionId: string;
  shell: PersistentTerminalSession["shell"];
  cwd: string;
  bindingGeneration: number;
  runtimeLifecycleGeneration: number;
  ttlMs?: number;
  eventDb?: Db;
}): Promise<PersistentTerminalSession> {
  const existing = await getTerminalSession(input.db, input.userId, input.sessionId);
  if (existing) {
    if (
      existing.instanceId !== input.instanceId ||
      existing.labId !== input.labId ||
      existing.runtimeId !== input.runtimeId
    ) {
      throw new Error("Terminal session is bound to a different lab runtime.");
    }
    if (
      existing.bindingGeneration !== input.bindingGeneration ||
      existing.runtimeLifecycleGeneration !== input.runtimeLifecycleGeneration
    ) {
      throw new Error("Terminal session belongs to a stale runtime generation.");
    }
    if (["CLOSED", "EXPIRED", "FAILED"].includes(existing.state)) {
      throw new Error("Terminal session is closed and cannot be reused.");
    }
  }

  const ttlMs = Math.max(15_000, Math.min(300_000, input.ttlMs ?? 120_000));
  const now = new Date();
  const row = await input.db
    .from("lab_terminal_sessions")
    .upsert(
      {
        session_id: input.sessionId,
        user_id: input.userId,
        instance_id: input.instanceId,
        runtime_id: input.runtimeId,
        lab_id: input.labId,
        shell: input.shell,
        cwd: input.cwd,
        state: "AUTHORIZED",
        binding_generation: input.bindingGeneration,
        runtime_lifecycle_generation: input.runtimeLifecycleGeneration,
        expires_at: new Date(now.getTime() + ttlMs).toISOString(),
        last_seen_at: now.toISOString(),
      },
      { onConflict: "user_id,session_id" },
    )
    .select("*")
    .single();
  if (row.error) throw new Error(row.error.message);

  const eventInput = {
    db: input.db,
    userId: input.userId,
    instanceId: input.instanceId,
    sessionId: input.sessionId,
    eventType: existing ? "RECONNECTED" : "CREATED",
    data: {
      bindingGeneration: input.bindingGeneration,
      runtimeLifecycleGeneration: input.runtimeLifecycleGeneration,
    },
  } as const;
  await recordTerminalSessionEvent(
    input.eventDb ? { ...eventInput, eventDb: input.eventDb } : eventInput,
  );
  return toSession(row.data);
}

export async function getTerminalSession(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<PersistentTerminalSession | null> {
  const result = await db
    .from("lab_terminal_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toSession(result.data) : null;
}

export async function authorizeTerminalSession(input: {
  db: Db;
  userId: string;
  sessionId: string;
  labId: string;
  runtimeId: string;
  bindingGeneration: number;
  runtimeLifecycleGeneration: number;
}): Promise<PersistentTerminalSession> {
  const session = await getTerminalSession(input.db, input.userId, input.sessionId);
  if (!session) throw new Error("Terminal session not found.");
  if (session.labId !== input.labId) {
    throw new Error("Terminal access denied: lab mismatch.");
  }
  if (session.runtimeId !== input.runtimeId) {
    throw new Error("Terminal access denied: runtime mismatch.");
  }
  if (session.bindingGeneration !== input.bindingGeneration) {
    throw new Error("Terminal access denied: stale binding generation.");
  }
  if (session.runtimeLifecycleGeneration !== input.runtimeLifecycleGeneration) {
    throw new Error("Terminal access denied: stale runtime lifecycle generation.");
  }
  if (["CLOSED", "EXPIRED", "FAILED"].includes(session.state)) {
    throw new Error("Terminal session is no longer active.");
  }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await closeTerminalSession(input.db, input.userId, input.sessionId, "EXPIRED");
    throw new Error("Terminal session has expired.");
  }
  return session;
}

export async function markTerminalSessionConnected(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<PersistentTerminalSession> {
  const result = await db
    .from("lab_terminal_sessions")
    .update({ state: "CONNECTED", last_seen_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .in("state", ["AUTHORIZED", "DISCONNECTED"])
    .select("*")
    .single();
  if (result.error) throw new Error(result.error.message);
  return toSession(result.data);
}

export async function markTerminalSessionDisconnected(
  db: Db,
  userId: string,
  sessionId: string,
): Promise<PersistentTerminalSession | null> {
  const result = await db
    .from("lab_terminal_sessions")
    .update({ state: "DISCONNECTED", last_seen_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .eq("state", "CONNECTED")
    .select("*")
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toSession(result.data) : null;
}

export async function closeTerminalSession(
  db: Db,
  userId: string,
  sessionId: string,
  state: "CLOSED" | "EXPIRED" | "FAILED" = "CLOSED",
): Promise<void> {
  const current = await getTerminalSession(db, userId, sessionId);
  if (!current) return;
  const result = await db
    .from("lab_terminal_sessions")
    .update({
      state,
      closed_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .not("state", "in", "(CLOSED,EXPIRED,FAILED)");
  if (result.error) throw new Error(result.error.message);
  await recordTerminalSessionEvent({
    db,
    userId,
    instanceId: current.instanceId,
    sessionId,
    eventType: state,
  });
}

export async function invalidateTerminalSessionsForInstance(
  db: Db,
  userId: string,
  instanceId: string,
  reason: "CLOSED" | "EXPIRED" | "FAILED" = "CLOSED",
): Promise<void> {
  const result = await db
    .from("lab_terminal_sessions")
    .update({
      state: reason,
      closed_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("instance_id", instanceId)
    .in("state", ["CREATED", "AUTHORIZED", "CONNECTED", "DISCONNECTED"]);
  if (result.error) throw new Error(result.error.message);
}

export async function listTerminalSessions(
  db: Db,
  userId: string,
  instanceId: string,
): Promise<PersistentTerminalSession[]> {
  const result = await db
    .from("lab_terminal_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("instance_id", instanceId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map(toSession);
}
