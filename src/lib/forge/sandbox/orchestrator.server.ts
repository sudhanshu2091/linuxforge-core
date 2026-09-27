import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  providerFail,
  providerOk,
  type EnvironmentDescriptor,
  type EnvironmentHandle,
  type EnvironmentStatus,
  type ProviderResult,
} from "./contract";
import { selectProvider } from "./registry.server";

export type LabLifecycleStatus = EnvironmentStatus;
export type LabLease = {
  instanceId: string;
  token: string;
  expiresAt: string;
  heartbeatAt: string;
};

const TERMINAL = new Set<LabLifecycleStatus>(["STOPPED", "EXPIRED"]);
const ALLOWED: Record<LabLifecycleStatus, readonly LabLifecycleStatus[]> = {
  CREATING: ["READY", "ERROR", "EXPIRED"],
  READY: ["RUNNING", "RESETTING", "PAUSED", "STOPPED", "EXPIRED", "ERROR"],
  RUNNING: ["READY", "PAUSED", "RESETTING", "STOPPED", "EXPIRED", "ERROR"],
  PAUSED: ["RUNNING", "READY", "STOPPED", "EXPIRED", "ERROR"],
  RESETTING: ["READY", "RUNNING", "ERROR", "EXPIRED"],
  STOPPED: ["CREATING", "EXPIRED"],
  ERROR: ["CREATING", "READY", "STOPPED", "EXPIRED"],
  EXPIRED: ["CREATING"],
};

export function canTransition(from: LabLifecycleStatus, to: LabLifecycleStatus): boolean {
  return from === to || ALLOWED[from].includes(to);
}

export function assertTransition(from: LabLifecycleStatus, to: LabLifecycleStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid lab lifecycle transition: ${from} -> ${to}`);
  }
}

export function isTerminalStatus(status: LabLifecycleStatus): boolean {
  return TERMINAL.has(status);
}

export function newLeaseToken(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}

async function digestToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

type Db = SupabaseClient<Database>;

export async function claimLabLease(
  db: Db,
  userId: string,
  instanceId: string,
  leaseSeconds = 60,
): Promise<LabLease | null> {
  const token = newLeaseToken();
  const hash = await digestToken(token);
  const result = await db.rpc("claim_lab_instance_lease", {
    p_instance_id: instanceId,
    p_user_id: userId,
    p_lease_token_hash: hash,
    p_lease_seconds: leaseSeconds,
  });
  if (result.error) throw new Error(result.error.message);
  const row = result.data?.[0];
  if (!row) return null;
  return {
    instanceId,
    token,
    expiresAt: row.lease_expires_at,
    heartbeatAt: row.last_heartbeat_at,
  };
}

export async function heartbeatLabLease(
  db: Db,
  userId: string,
  lease: LabLease,
  leaseSeconds = 60,
): Promise<LabLease | null> {
  const hash = await digestToken(lease.token);
  const result = await db.rpc("heartbeat_lab_instance_lease", {
    p_instance_id: lease.instanceId,
    p_user_id: userId,
    p_lease_token_hash: hash,
    p_lease_seconds: leaseSeconds,
  });
  if (result.error) throw new Error(result.error.message);
  const row = result.data?.[0];
  if (!row) return null;
  return {
    ...lease,
    expiresAt: row.lease_expires_at,
    heartbeatAt: row.last_heartbeat_at,
  };
}

export async function releaseLabLease(db: Db, userId: string, lease: LabLease): Promise<boolean> {
  const hash = await digestToken(lease.token);
  const result = await db.rpc("release_lab_instance_lease", {
    p_instance_id: lease.instanceId,
    p_user_id: userId,
    p_lease_token_hash: hash,
  });
  if (result.error) throw new Error(result.error.message);
  return result.data === true;
}

/* ------------------------------------------------------------------ */
/* Control-plane orchestration                                         */
/* ------------------------------------------------------------------ */

/**
 * A lifecycle operation is coordinated in three stages:
 *
 * 1. acquire a short control-plane lease so two callers cannot mutate the same
 *    environment at the same time;
 * 2. ask the provider to perform the operation;
 * 3. persist the provider's descriptor only after the provider succeeds.
 *
 * The provider remains the source of truth for runtime state. Supabase is the
 * durable control-plane projection.
 */
export async function withLabControlLease<T>(
  db: Db,
  userId: string,
  instanceId: string,
  operation: (lease: LabLease) => Promise<T>,
): Promise<T> {
  const lease = await claimLabLease(db, userId, instanceId, 60);
  if (!lease) throw new Error("Lab instance is unavailable or already controlled.");

  try {
    return await operation(lease);
  } finally {
    // Best-effort release: the lease naturally expires if the request failed
    // before release. Do not hide the primary provider/database error.
    try {
      await releaseLabLease(db, userId, lease);
    } catch {
      // Intentionally ignored; expiry is the recovery mechanism.
    }
  }
}

/**
 * Persist a lifecycle transition with an optimistic `from` guard.
 * This prevents stale requests from overwriting a newer control-plane state.
 */
export async function persistLifecycleTransition(
  db: Db,
  userId: string,
  instanceId: string,
  from: LabLifecycleStatus,
  to: LabLifecycleStatus,
): Promise<boolean> {
  assertTransition(from, to);

  const result = await db
    .from("lab_instances")
    .update({ status: to })
    .eq("id", instanceId)
    .eq("user_id", userId)
    .eq("status", from)
    .select("id")
    .maybeSingle();

  if (result.error) throw new Error(result.error.message);
  return Boolean(result.data);
}

export type ReconciliationResult = {
  changed: boolean;
  persistedStatus: LabLifecycleStatus;
  providerStatus: LabLifecycleStatus;
};

/**
 * Reconcile durable control-plane state with provider state.
 *
 * Reconciliation is deliberately conservative: a provider may move the
 * environment forward, but an unexpected backwards/unsafe transition is
 * surfaced as an error instead of being silently written to the database.
 */
export async function reconcileLabInstance(
  db: Db,
  userId: string,
  session: {
    provider: ReturnType<typeof selectProvider>["provider"];
    handle: EnvironmentHandle;
    instanceId: string;
    descriptor: EnvironmentDescriptor;
  },
): Promise<ProviderResult<ReconciliationResult>> {
  if (session.handle.userId !== userId)
    return providerFail("OWNERSHIP_DENIED", "This lab environment belongs to another learner.");

  const observed = await session.provider.getEnvironmentState(session.handle);
  if (!observed.ok) return observed;

  const current = session.descriptor.status;
  const next = observed.value.status;

  if (!canTransition(current, next)) {
    return providerFail(
      "INTERNAL",
      `Provider reported invalid lifecycle transition: ${current} -> ${next}`,
      false,
    );
  }

  if (current !== next) {
    const persisted = await persistLifecycleTransition(
      db,
      userId,
      session.instanceId,
      current,
      next,
    );
    if (!persisted) {
      return providerFail(
        "INTERNAL",
        "Lab state changed concurrently; reconcile the session before retrying.",
        true,
      );
    }
  }

  return providerOk({
    changed: current !== next,
    persistedStatus: next,
    providerStatus: observed.value.status,
  });
}
