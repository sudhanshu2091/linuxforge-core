/** V45 server-side runtime identity and credential primitives. */
import type {
  IsolationVerification,
  RuntimeBinding,
  RuntimeCredentialClaims,
} from "./lab-isolation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { authorizeRuntimeAccess, verificationFromRuntimeHealth } from "./lab-isolation";
import { hashRuntimeCredential } from "./runtime-infrastructure";

export function createRuntimeBinding(input: {
  runtimeId: string;
  labId: string;
  learnerId: string;
  nodeId?: string | null;
  bindingGeneration: number;
  ttlMs: number;
  now?: Date;
}): RuntimeBinding {
  if (!input.runtimeId || !input.labId || !input.learnerId) {
    throw new Error("Runtime identity ownership is required.");
  }
  if (!Number.isInteger(input.bindingGeneration) || input.bindingGeneration < 1) {
    throw new Error("Runtime binding generation is invalid.");
  }
  if (!Number.isInteger(input.ttlMs) || input.ttlMs < 1_000 || input.ttlMs > 86_400_000) {
    throw new Error("Runtime binding TTL is invalid.");
  }
  const now = input.now ?? new Date();
  return {
    runtimeId: input.runtimeId,
    labId: input.labId,
    learnerId: input.learnerId,
    nodeId: input.nodeId ?? null,
    bindingGeneration: input.bindingGeneration,
    status: "ACTIVE",
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + input.ttlMs).toISOString(),
  };
}

export async function createCredentialClaims(input: {
  credentialId: string;
  binding: RuntimeBinding;
  credentialVersion: number;
}): Promise<RuntimeCredentialClaims> {
  if (!input.credentialId) {
    throw new Error("Runtime credential identity is required.");
  }
  if (!Number.isInteger(input.credentialVersion) || input.credentialVersion < 1) {
    throw new Error("Runtime credential version is invalid.");
  }
  return {
    credentialId: input.credentialId,
    runtimeId: input.binding.runtimeId,
    labId: input.binding.labId,
    learnerId: input.binding.learnerId,
    bindingGeneration: input.binding.bindingGeneration,
    issuedAt: input.binding.issuedAt,
    expiresAt: input.binding.expiresAt,
    credentialVersion: input.credentialVersion,
  };
}

export async function hashRuntimeSecret(secret: string): Promise<string> {
  return hashRuntimeCredential(secret);
}

type IdentityDb = SupabaseClient<Database>;

type RuntimeIdentityRow = Database["public"]["Tables"]["lab_runtime_identities"]["Row"];

function bindingFromIdentity(row: RuntimeIdentityRow): RuntimeBinding {
  return {
    runtimeId: row.runtime_id,
    labId: row.lab_id,
    learnerId: row.user_id,
    nodeId: row.node_id,
    bindingGeneration: row.binding_generation,
    status: row.status as RuntimeBinding["status"],
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
  };
}

/**
 * Resolve the one canonical runtime identity for a lab instance.
 *
 * All sensitive persistence is performed by the service-role-only database
 * function. The database locks the authoritative lab_instances row, derives
 * ownership from it, preserves the existing runtime_id, rejects stale
 * generations, and never reactivates revoked/quarantined identities.
 */
export async function ensureRuntimeIdentity(
  db: IdentityDb,
  input: {
    instanceId: string;
    labId: string;
    learnerId: string;
    bindingGeneration: number;
    ttlMs?: number;
    now?: Date;
  },
): Promise<RuntimeBinding> {
  if (!input.instanceId || !input.labId || !input.learnerId) {
    throw new Error("Runtime identity ownership is required.");
  }
  if (!Number.isInteger(input.bindingGeneration) || input.bindingGeneration < 1) {
    throw new Error("Runtime binding generation is invalid.");
  }
  const ttlMs = input.ttlMs ?? 60 * 60 * 1000;
  if (!Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 86_400_000) {
    throw new Error("Runtime binding TTL is invalid.");
  }

  const { data, error } = await db.rpc("v49_ensure_runtime_identity", {
    p_instance_id: input.instanceId,
    p_binding_generation: input.bindingGeneration,
    p_ttl_ms: ttlMs,
    p_now: (input.now ?? new Date()).toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length !== 1) {
    throw new Error("Runtime identity was not resolved to exactly one canonical persisted row.");
  }

  const binding = bindingFromIdentity(data[0]!);
  if (binding.labId !== input.labId || binding.learnerId !== input.learnerId) {
    throw new Error(
      "Canonical runtime identity ownership does not match the requested lab session.",
    );
  }
  if (binding.bindingGeneration !== input.bindingGeneration) {
    throw new Error(
      "Canonical runtime identity generation does not match the requested lab session.",
    );
  }

  return binding;
}

/**
 * Re-check runtime health and persist a security verification against the
 * canonical identity in one server-side database transaction boundary.
 */
export async function verifyAndPersistRuntimeIsolation(
  db: IdentityDb,
  input: {
    binding: RuntimeBinding;
    instanceId: string;
    health: Parameters<typeof verificationFromRuntimeHealth>[0];
  },
): Promise<IsolationVerification> {
  if (input.health.runtimeId !== input.binding.runtimeId) {
    throw new Error("Runtime health identity does not match the canonical runtime binding.");
  }
  if (input.health.labId !== input.binding.labId) {
    throw new Error("Runtime health lab identity does not match the canonical runtime binding.");
  }
  if (input.health.bindingGeneration !== input.binding.bindingGeneration) {
    throw new Error(
      "Runtime health binding generation does not match the canonical runtime binding.",
    );
  }

  const verification = verificationFromRuntimeHealth(input.health);
  const { error } = await db.rpc("v49_persist_isolation_verification", {
    p_verification_id: verification.verificationId,
    p_runtime_id: verification.runtimeId,
    p_instance_id: input.instanceId,
    p_lab_id: verification.labId,
    p_user_id: input.binding.learnerId,
    p_binding_generation: verification.bindingGeneration,
    p_state: verification.state,
    p_checks: verification.checks,
    p_reason: verification.reason,
    p_checked_at: verification.checkedAt,
  });
  if (error) {
    throw new Error(error.message);
  }
  return verification;
}

export function authorizeVerifiedRuntimeAccess(input: {
  binding: RuntimeBinding;
  verification: IsolationVerification;
  learnerId: string;
  labId: string;
  runtimeId: string;
  bindingGeneration: number;
  now?: Date;
}): void {
  authorizeRuntimeAccess(input);
}
