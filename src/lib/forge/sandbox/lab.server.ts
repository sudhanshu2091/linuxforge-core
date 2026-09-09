/**
 * Authenticated lab lifecycle + execution recording (server only).
 *
 * Every function here runs behind Supabase auth, resolves the caller's OWN lab
 * rows through RLS-scoped queries, and only then dispatches to a provider that
 * this build is allowed to use. There is no generic "run this shell string"
 * endpoint: execution always goes through `executeInLab`, which is bound to the
 * caller's environment and records a redacted event.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Mutation } from "../executor.server";
import {
  DEFAULT_RESOURCE_POLICY,
  MOCK_PROVIDER_ID,
  isEnvironmentStatus,
  providerFail,
  providerOk,
  type EnvironmentDescriptor,
  type EnvironmentHandle,
  type ExecutionRecord,
  type ProviderResult,
  type SandboxFsObject,
  type SandboxFsView,
  type SandboxStatusView,
} from "./contract";
import type { MockBackingStore, SandboxInstanceRecord } from "./mock-provider.server";
import { selectProvider } from "./registry.server";

export type Db = SupabaseClient<Database>;

export const LAB_KEY = "forge-core";

type LabRow = Database["public"]["Tables"]["learner_labs"]["Row"];

/** The learner's story lab row, created on first use. */
export async function ensureLab(db: Db, userId: string): Promise<LabRow> {
  const existing = await db
    .from("learner_labs")
    .select("*")
    .eq("user_id", userId)
    .eq("lab_key", LAB_KEY)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data;
  const created = await db
    .from("learner_labs")
    .insert({ user_id: userId, lab_key: LAB_KEY, title: "Forge training lab" })
    .select("*")
    .single();
  if (created.error) throw new Error(created.error.message);
  return created.data;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asString = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

function stringMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(asRecord(value))) if (typeof v === "string") out[k] = v;
  return out;
}

type InstanceRow = Database["public"]["Tables"]["lab_instances"]["Row"];

const toInstanceRecord = (row: InstanceRow): SandboxInstanceRecord => ({
  environmentId: row.environment_id,
  userId: row.user_id,
  labId: row.lab_id,
  status: isEnvironmentStatus(row.status) ? row.status : "ERROR",
  snapshotId: row.snapshot_id ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastActiveAt: row.last_active_at,
  expiresAt: row.expires_at ?? null,
  metadata: stringMap(row.metadata),
});

/**
 * Supabase-backed store for the modelled provider. All reads and writes are
 * filtered by the caller's user id in addition to RLS, so a provider adapter can
 * never observe or mutate another learner's environment.
 */
export function createSupabaseMockStore(db: Db, userId: string): MockBackingStore {
  const own = (handle: EnvironmentHandle) => handle.userId === userId;

  return {
    async readInstance(handle) {
      if (!own(handle)) return null;
      const res = await db
        .from("lab_instances")
        .select("*")
        .eq("user_id", userId)
        .eq("environment_id", handle.environmentId)
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data ? toInstanceRecord(res.data) : null;
    },

    async createInstance(input) {
      const environmentId = `mock-env-${crypto.randomUUID()}`;
      const now = new Date();
      const res = await db
        .from("lab_instances")
        .insert({
          user_id: userId,
          lab_id: input.labId,
          provider: MOCK_PROVIDER_ID,
          environment_id: environmentId,
          status: "READY",
          metadata: input.metadata,
          last_active_at: now.toISOString(),
          expires_at: new Date(now.getTime() + DEFAULT_RESOURCE_POLICY.idleExpiryMs).toISOString(),
        })
        .select("*")
        .single();
      if (res.error) throw new Error(res.error.message);
      return toInstanceRecord(res.data);
    },

    async patchInstance(handle, patch) {
      if (!own(handle)) throw new Error("Not your lab environment");
      const res = await db
        .from("lab_instances")
        .update({
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.snapshotId !== undefined ? { snapshot_id: patch.snapshotId } : {}),
          ...(patch.lastActiveAt ? { last_active_at: patch.lastActiveAt } : {}),
          ...(patch.expiresAt !== undefined ? { expires_at: patch.expiresAt } : {}),
          ...(patch.metadata ? { metadata: patch.metadata } : {}),
        })
        .eq("user_id", userId)
        .eq("environment_id", handle.environmentId)
        .select("*")
        .single();
      if (res.error) throw new Error(res.error.message);
      return toInstanceRecord(res.data);
    },

    async readFilesystem(handle) {
      const view: SandboxFsView = new Map();
      if (!own(handle)) return view;
      const res = await db
        .from("lab_world_objects")
        .select("*")
        .eq("user_id", userId)
        .eq("lab_id", handle.labId)
        .eq("active", true);
      if (res.error) throw new Error(res.error.message);
      for (const r of res.data ?? []) {
        const state = asRecord(r.current_state);
        const objectType = r.object_type === "directory" ? ("directory" as const) : ("file" as const);
        const obj: SandboxFsObject = {
          objectId: r.object_id,
          objectType,
          path: r.path,
          name: r.name,
          permissions: asString(state["permissions"], objectType === "directory" ? "755" : "644"),
          content: asString(state["content"], ""),
          active: true,
          createdByChallenge: r.created_by_challenge ?? null,
          lastModifiedByChallenge: r.last_modified_by_challenge ?? null,
          createdAt: r.created_at,
        };
        view.set(obj.path, obj);
      }
      return view;
    },

    async applyMutations(handle, challengeRef, mutations: Mutation[]) {
      if (!own(handle)) throw new Error("Not your lab environment");
      for (const m of mutations) {
        if (m.kind === "create") {
          const res = await db
            .from("lab_world_objects")
            .insert({
              user_id: userId,
              lab_id: handle.labId,
              object_type: m.objectType,
              path: m.path,
              name: m.path.split("/").pop() ?? m.path,
              created_by_challenge: challengeRef,
              last_modified_by_challenge: challengeRef,
              current_state: { permissions: m.permissions, content: m.content },
            })
            .select("object_id")
            .maybeSingle();
          if (res.error && !`${res.error.message}`.includes("duplicate")) throw new Error(res.error.message);
        } else {
          const current = await db
            .from("lab_world_objects")
            .select("current_state")
            .eq("user_id", userId)
            .eq("lab_id", handle.labId)
            .eq("path", m.path)
            .maybeSingle();
          if (current.error) throw new Error(current.error.message);
          const state = asRecord(current.data?.current_state);
          const res = await db
            .from("lab_world_objects")
            .update({
              current_state: {
                permissions: m.permissions ?? asString(state["permissions"], "644"),
                content: m.content ?? asString(state["content"], ""),
              },
              last_modified_by_challenge: challengeRef,
            })
            .eq("user_id", userId)
            .eq("lab_id", handle.labId)
            .eq("path", m.path);
          if (res.error) throw new Error(res.error.message);
        }
      }
    },

    async clearFilesystem(handle) {
      if (!own(handle)) throw new Error("Not your lab environment");
      const res = await db
        .from("lab_world_objects")
        .update({ active: false })
        .eq("user_id", userId)
        .eq("lab_id", handle.labId);
      if (res.error) throw new Error(res.error.message);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Lifecycle API (authorised before every provider dispatch)           */
/* ------------------------------------------------------------------ */

export type LabSession = {
  provider: ReturnType<typeof selectProvider>["provider"];
  providerId: ReturnType<typeof selectProvider>["providerId"];
  realLinux: { available: boolean; reason: string };
  handle: EnvironmentHandle;
  instanceId: string;
  descriptor: EnvironmentDescriptor;
};

/** Create-or-restore the caller's lab environment; the only entry point. */
export async function ensureLabSession(db: Db, userId: string): Promise<ProviderResult<LabSession>> {
  const lab = await ensureLab(db, userId);
  const store = createSupabaseMockStore(db, userId);
  const selection = selectProvider(store);

  const existing = await db
    .from("lab_instances")
    .select("*")
    .eq("user_id", userId)
    .eq("lab_id", lab.id)
    .eq("provider", selection.providerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  let row = existing.data;
  if (!row) {
    const created = await selection.provider.createEnvironment({
      userId,
      labId: lab.id,
      resourcePolicy: DEFAULT_RESOURCE_POLICY,
      metadata: { lab_key: LAB_KEY, lab_title: lab.title },
    });
    if (!created.ok) return created;
    const reread = await db
      .from("lab_instances")
      .select("*")
      .eq("user_id", userId)
      .eq("environment_id", created.value.handle.environmentId)
      .single();
    if (reread.error) throw new Error(reread.error.message);
    row = reread.data;
  }

  const record = toInstanceRecord(row);
  const handle: EnvironmentHandle = {
    provider: selection.providerId,
    environmentId: record.environmentId,
    userId,
    labId: record.labId,
  };
  const started = await selection.provider.startEnvironment(handle);
  if (!started.ok) return started;

  return providerOk<LabSession>({
    provider: selection.provider,
    providerId: selection.providerId,
    realLinux: selection.realLinux,
    handle,
    instanceId: row.id,
    descriptor: started.value,
  });
}

export function statusView(session: LabSession): SandboxStatusView {
  const caps = session.descriptor.capabilities;
  return {
    provider: session.providerId,
    label: caps.label,
    description: caps.description,
    realLinux: caps.realLinux,
    modelled: caps.modelled,
    status: session.descriptor.status,
    available: true,
    unavailableReason: session.realLinux.available ? null : session.realLinux.reason,
    limits: {
      executionTimeoutMs: session.descriptor.resourcePolicy.executionTimeoutMs,
      network: session.descriptor.resourcePolicy.network,
    },
  };
}

/** Persist a redacted execution event. Never stores secrets or provider config. */
export async function recordExecutionEvent(
  db: Db,
  userId: string,
  session: LabSession,
  challengeId: string | null,
  record: ExecutionRecord,
): Promise<void> {
  const res = await db.from("lab_command_events").insert({
    user_id: userId,
    lab_instance_id: session.instanceId,
    challenge_id: challengeId,
    provider: record.provider,
    input: record.input.slice(0, 2000),
    cwd_before: record.cwdBefore,
    cwd_after: record.cwdAfter,
    stdout: record.stdout.slice(0, 20000),
    stderr: record.stderr.slice(0, 20000),
    exit_code: record.exitCode,
    duration_ms: record.durationMs,
    blocked_reason: record.blocked?.reason ?? null,
    state_change_ref: {
      filesystem: record.deltas.filesystem,
      method: record.method,
      outputTruncated: record.outputTruncated,
    },
    metadata: { ...record.metadata, redactedFields: record.redactedFields.join(",") },
  });
  if (res.error) throw new Error(res.error.message);
}

/**
 * Execute learner input in the caller's own environment.
 *
 * Ownership is checked here and again inside the provider, and only providers in
 * the allow-list can be reached. Nothing in this path can execute on the host.
 */
export async function executeInLab(
  db: Db,
  userId: string,
  session: LabSession,
  input: { kind: "raw-shell" | "stdin"; data: string },
  cwd: string,
  challengeId: string | null,
): Promise<ProviderResult<ExecutionRecord>> {
  if (session.handle.userId !== userId)
    return providerFail("OWNERSHIP_DENIED", "This lab environment belongs to another learner.");

  const request = {
    handle: session.handle,
    input: input.kind === "stdin" ? ({ kind: "stdin", data: input.data } as const) : ({ kind: "raw-shell", data: input.data } as const),
    cwd,
    challengeRef: challengeId,
    timeoutMs: session.descriptor.resourcePolicy.executionTimeoutMs,
  };

  const result =
    input.kind === "stdin"
      ? await session.provider.sendInput(request)
      : await session.provider.executeCommand(request);

  if (result.ok) await recordExecutionEvent(db, userId, session, challengeId, result.value);
  return result;
}

/* Lifecycle wrappers used by the authenticated server functions. */

export const resetLab = async (session: LabSession) => session.provider.resetEnvironment(session.handle);
export const pauseLab = async (session: LabSession) => session.provider.pauseEnvironment(session.handle);
export const resumeLab = async (session: LabSession) => session.provider.resumeEnvironment(session.handle);
export const snapshotLab = async (session: LabSession) => session.provider.snapshotEnvironment(session.handle);
export const restoreLab = async (session: LabSession, snapshotId: string) =>
  session.provider.restoreEnvironment(session.handle, snapshotId);
export const destroyLab = async (session: LabSession) => session.provider.destroyEnvironment(session.handle);
export const labState = async (session: LabSession) => session.provider.getEnvironmentState(session.handle);
export const labFilesystem = async (session: LabSession, cwd: string) =>
  session.provider.getFilesystemState(session.handle, cwd);
