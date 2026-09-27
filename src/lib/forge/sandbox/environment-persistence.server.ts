import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/integrations/supabase/server-admin";
import type { Database, Json } from "@/integrations/supabase/types";
import type { EnvironmentPersistence, EnvironmentPersistenceState } from "./contract";
import {
  assertPersistenceTransition,
  nextArtifactVersion,
  nextEnvironmentGeneration,
} from "./environment-state";

export type EnvironmentDb = SupabaseClient<Database>;
type StateRow = Database["public"]["Tables"]["lab_environment_state"]["Row"];

const toState = (row: StateRow): EnvironmentPersistence => ({
  state: row.state as EnvironmentPersistenceState,
  environmentGeneration: row.environment_generation,
  artifactVersion: row.artifact_version,
  artifactRef: row.artifact_ref,
  integrityStatus: row.integrity_status as EnvironmentPersistence["integrityStatus"],
  integrityFingerprint: row.integrity_fingerprint,
  lastPersistedAt: row.last_persisted_at,
  lastVerifiedAt: row.last_verified_at,
  lastRestoredAt: row.last_restored_at,
  destroyedAt: row.destroyed_at,
});

export async function recordEnvironmentEvent(
  row: StateRow,
  eventType: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const result = await createSupabaseAdminClient()
    .from("lab_environment_events")
    .insert({
      environment_id: row.environment_id,
      instance_id: row.instance_id,
      user_id: row.user_id,
      event_type: eventType,
      environment_generation: row.environment_generation,
      artifact_version: row.artifact_version,
      data: JSON.parse(JSON.stringify(data)) as Json,
    });
  if (result.error) throw new Error(result.error.message);
}

export async function getEnvironmentPersistence(
  db: EnvironmentDb,
  userId: string,
  environmentId: string,
): Promise<EnvironmentPersistence | null> {
  const result = await db
    .from("lab_environment_state")
    .select("*")
    .eq("user_id", userId)
    .eq("environment_id", environmentId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data ? toState(result.data) : null;
}

export async function ensureEnvironmentPersistence(input: {
  db: EnvironmentDb;
  userId: string;
  labId: string;
  instanceId: string;
  environmentId: string;
  artifactRef?: string | null;
}): Promise<EnvironmentPersistence> {
  const existing = await getEnvironmentPersistence(input.db, input.userId, input.environmentId);
  if (existing) return existing;

  const result = await input.db
    .from("lab_environment_state")
    .insert({
      environment_id: input.environmentId,
      instance_id: input.instanceId,
      user_id: input.userId,
      lab_id: input.labId,
      state: "PROVISIONING",
      environment_generation: 1,
      artifact_version: 1,
      artifact_ref: input.artifactRef ?? null,
      integrity_status: "UNVERIFIED",
    })
    .select("*")
    .single();

  if (!result.error) {
    await recordEnvironmentEvent(result.data, "CREATED");
    return toState(result.data);
  }

  if (result.error.code !== "23505") {
    throw new Error(result.error.message);
  }

  const raced = await getEnvironmentPersistence(input.db, input.userId, input.environmentId);
  if (!raced) {
    throw new Error(
      "Environment persistence row was concurrently created but could not be reread.",
    );
  }
  return raced;
}

async function transition(input: {
  db: EnvironmentDb;
  userId: string;
  environmentId: string;
  to: EnvironmentPersistenceState;
  patch?: Database["public"]["Tables"]["lab_environment_state"]["Update"];
  eventType?: string;
}): Promise<EnvironmentPersistence> {
  const current = await getEnvironmentPersistence(input.db, input.userId, input.environmentId);
  if (!current) throw new Error("Persistent environment state not found.");
  assertPersistenceTransition(current.state, input.to);

  // Optimistic concurrency: the state we validated must still be the state
  // stored by the database when we write. Without this predicate, two
  // concurrent lifecycle requests can overwrite each other after both read
  // the same previous state.
  const result = await input.db
    .from("lab_environment_state")
    .update({ state: input.to, ...input.patch })
    .eq("user_id", input.userId)
    .eq("environment_id", input.environmentId)
    .eq("state", current.state)
    .select("*")
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) {
    throw new Error(
      `Persistent environment state changed concurrently; expected ${current.state} before ${input.to}.`,
    );
  }

  const eventByState: Record<string, string> = {
    READY: "READY",
    ACTIVE: "STARTED",
    STOPPING: "STOPPING",
    STOPPED: "STOPPED",
    QUARANTINED: "QUARANTINED",
    DESTROYING: "DESTROYING",
    DESTROYED: "DESTROYED",
    FAILED: "RECOVERY_FAILED",
  };
  await recordEnvironmentEvent(
    result.data,
    input.eventType ?? eventByState[input.to] ?? "VERIFIED",
    { previousState: current.state },
  );
  return toState(result.data);
}

export async function markEnvironmentActive(input: {
  db: EnvironmentDb;
  userId: string;
  environmentId: string;
  artifactRef?: string | null;
}): Promise<EnvironmentPersistence> {
  const current = await getEnvironmentPersistence(input.db, input.userId, input.environmentId);
  if (!current) throw new Error("Persistent environment state not found.");
  if (current.state === "QUARANTINED") {
    throw new Error(
      "Persistent environment is quarantined; verified recovery is required before activation.",
    );
  }
  const patch: Database["public"]["Tables"]["lab_environment_state"]["Update"] = {
    last_restored_at:
      current.state === "STOPPED" ? new Date().toISOString() : current.lastRestoredAt,
    artifact_ref: input.artifactRef ?? current.artifactRef,
    integrity_status: "UNVERIFIED",
  };
  return transition({ ...input, to: "ACTIVE", patch });
}

export async function markEnvironmentStopping(input: {
  db: EnvironmentDb;
  userId: string;
  environmentId: string;
  reason?: string;
}): Promise<EnvironmentPersistence> {
  const current = await getEnvironmentPersistence(input.db, input.userId, input.environmentId);
  if (!current) throw new Error("Persistent environment state not found.");
  if (current.state === "STOPPING") return current;
  return transition({
    ...input,
    to: "STOPPING",
    eventType: "STOPPING",
    ...(input.reason ? { patch: { failure_reason: input.reason.slice(0, 2000) } } : {}),
  });
}

export async function markEnvironmentStopped(input: {
  db: EnvironmentDb;
  userId: string;
  environmentId: string;
  fingerprint?: string | null;
}): Promise<EnvironmentPersistence> {
  const current = await getEnvironmentPersistence(input.db, input.userId, input.environmentId);
  if (!current) throw new Error("Persistent environment state not found.");
  return transition({
    ...input,
    to: "STOPPED",
    patch: {
      last_persisted_at: new Date().toISOString(),
      integrity_status: input.fingerprint ? "VERIFIED" : "UNVERIFIED",
      integrity_fingerprint: input.fingerprint ?? current.integrityFingerprint,
    },
  });
}

export async function markEnvironmentReady(input: {
  db: EnvironmentDb;
  userId: string;
  environmentId: string;
  fingerprint?: string | null;
}): Promise<EnvironmentPersistence> {
  const current = await getEnvironmentPersistence(input.db, input.userId, input.environmentId);
  if (!current) throw new Error("Persistent environment state not found.");
  if (current.state === "READY") return current;
  return transition({
    ...input,
    to: "READY",
    patch: {
      integrity_status: input.fingerprint ? "VERIFIED" : current.integrityStatus,
      integrity_fingerprint: input.fingerprint ?? current.integrityFingerprint,
      last_verified_at: input.fingerprint ? new Date().toISOString() : current.lastVerifiedAt,
    },
  });
}

export async function markEnvironmentReset(input: {
  db: EnvironmentDb;
  userId: string;
  environmentId: string;
}): Promise<EnvironmentPersistence> {
  const current = await getEnvironmentPersistence(input.db, input.userId, input.environmentId);
  if (!current) throw new Error("Persistent environment state not found.");
  return transition({
    ...input,
    to: "ACTIVE",
    eventType: "RESET",
    patch: {
      environment_generation: nextEnvironmentGeneration(current.environmentGeneration),
      artifact_version: nextArtifactVersion(current.artifactVersion),
      integrity_status: "UNVERIFIED",
      integrity_fingerprint: null,
      failure_reason: null,
      last_verified_at: null,
      last_restored_at: new Date().toISOString(),
    },
  });
}

export async function markEnvironmentQuarantined(input: {
  db: EnvironmentDb;
  userId: string;
  environmentId: string;
  reason: string;
}): Promise<EnvironmentPersistence> {
  const current = await getEnvironmentPersistence(input.db, input.userId, input.environmentId);
  if (!current) throw new Error("Persistent environment state not found.");
  if (current.state === "QUARANTINED") return current;
  return transition({
    ...input,
    to: "QUARANTINED",
    patch: {
      integrity_status: "FAILED",
      failure_reason: input.reason.slice(0, 2000),
    },
  });
}

export async function markEnvironmentDestroyed(input: {
  db: EnvironmentDb;
  userId: string;
  environmentId: string;
}): Promise<EnvironmentPersistence> {
  const current = await getEnvironmentPersistence(input.db, input.userId, input.environmentId);
  if (!current) throw new Error("Persistent environment state not found.");
  if (current.state === "DESTROYED") return current;

  await transition({ ...input, to: "DESTROYING" });
  return transition({
    ...input,
    to: "DESTROYED",
    patch: {
      destroyed_at: new Date().toISOString(),
      integrity_status: "VERIFIED",
    },
  });
}
