import { describe, expect, it } from "vitest";
import { assertBindingActive } from "./lab-isolation";
import {
  authorizeVerifiedRuntimeAccess,
  createCredentialClaims,
  createRuntimeBinding,
  ensureRuntimeIdentity,
  hashRuntimeSecret,
  verifyAndPersistRuntimeIsolation,
} from "./runtime-identity.server";
import type { Database } from "@/integrations/supabase/types";

const NOW = new Date("2026-09-20T00:00:00.000Z");

type IdentityRow = Database["public"]["Tables"]["lab_runtime_identities"]["Row"];

type VerificationRow = Database["public"]["Tables"]["lab_isolation_verifications"]["Row"];

type InstanceRow = {
  id: string;
  lab_id: string;
  user_id: string;
  runtime_node_id: string | null;
  runtime_binding_generation: number;
};

function makeIdentityDb(options?: { instances?: InstanceRow[]; identities?: IdentityRow[] }) {
  const instances = new Map((options?.instances ?? []).map((row) => [row.id, row]));
  const identities = new Map((options?.identities ?? []).map((row) => [row.instance_id, row]));
  const verifications: VerificationRow[] = [];
  const locks = new Map<string, Promise<void>>();

  async function withInstanceLock<T>(instanceId: string, work: () => Promise<T>): Promise<T> {
    const previous = locks.get(instanceId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    locks.set(
      instanceId,
      previous.then(() => current),
    );
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (locks.get(instanceId) === current) locks.delete(instanceId);
    }
  }

  const db = {
    async rpc(name: string, args: Record<string, unknown>) {
      if (name === "v49_ensure_runtime_identity") {
        const instanceId = String(args["p_instance_id"]);
        const generation = Number(args["p_binding_generation"]);
        const ttlMs = Number(args["p_ttl_ms"]);
        const now = new Date(String(args["p_now"]));
        return withInstanceLock(instanceId, async () => {
          await Promise.resolve();
          const instance = instances.get(instanceId);
          if (!instance) return { data: null, error: new Error("Lab instance does not exist.") };
          if (generation !== Math.max(1, instance.runtime_binding_generation))
            return {
              data: null,
              error: new Error(
                "Runtime binding generation does not match the authoritative lab instance.",
              ),
            };
          if (!Number.isInteger(generation) || generation < 1)
            return { data: null, error: new Error("Runtime binding generation is invalid.") };
          if (!Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 86_400_000)
            return { data: null, error: new Error("Runtime binding TTL is invalid.") };

          const existing = identities.get(instanceId);
          if (!existing) {
            const row: IdentityRow = {
              runtime_id: crypto.randomUUID(),
              instance_id: instanceId,
              lab_id: instance.lab_id,
              user_id: instance.user_id,
              node_id: instance.runtime_node_id,
              binding_generation: generation,
              status: "ACTIVE",
              credential_version: 1,
              issued_at: now.toISOString(),
              expires_at: new Date(now.getTime() + ttlMs).toISOString(),
              revoked_at: null,
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            };
            identities.set(instanceId, row);
            return { data: [row], error: null };
          }

          if (existing.lab_id !== instance.lab_id || existing.user_id !== instance.user_id) {
            return {
              data: null,
              error: new Error("Runtime identity ownership does not match its lab instance."),
            };
          }
          if (existing.status !== "ACTIVE") {
            return {
              data: null,
              error: new Error(`Runtime identity is ${existing.status} and cannot be reactivated.`),
            };
          }
          if (generation < existing.binding_generation) {
            return { data: null, error: new Error("Runtime binding generation is stale.") };
          }
          if (generation === existing.binding_generation) {
            return { data: [existing], error: null };
          }

          const refreshed: IdentityRow = {
            ...existing,
            node_id: instance.runtime_node_id,
            binding_generation: generation,
            credential_version: existing.credential_version + 1,
            issued_at: now.toISOString(),
            expires_at: new Date(now.getTime() + ttlMs).toISOString(),
            updated_at: now.toISOString(),
            revoked_at: null,
          };
          identities.set(instanceId, refreshed);
          return { data: [refreshed], error: null };
        });
      }

      if (name === "v49_persist_isolation_verification") {
        const runtimeId = String(args["p_runtime_id"]);
        const instanceId = String(args["p_instance_id"]);
        const identity = identities.get(instanceId);
        if (!identity || identity.runtime_id !== runtimeId) {
          return {
            data: null,
            error: new Error("Canonical runtime identity was not found for this instance."),
          };
        }
        if (identity.status !== "ACTIVE")
          return { data: null, error: new Error("Runtime identity is not active.") };
        if (identity.lab_id !== args["p_lab_id"] || identity.user_id !== args["p_user_id"]) {
          return {
            data: null,
            error: new Error(
              "Isolation verification ownership does not match the runtime identity.",
            ),
          };
        }
        if (identity.binding_generation !== Number(args["p_binding_generation"])) {
          return {
            data: null,
            error: new Error(
              "Isolation verification binding generation does not match the canonical runtime identity.",
            ),
          };
        }
        verifications.push({
          verification_id: String(args["p_verification_id"]),
          runtime_id: runtimeId,
          instance_id: instanceId,
          lab_id: String(args["p_lab_id"]),
          user_id: String(args["p_user_id"]),
          binding_generation: Number(args["p_binding_generation"]),
          state: String(args["p_state"]),
          checks: args[
            "p_checks"
          ] as Database["public"]["Tables"]["lab_isolation_verifications"]["Row"]["checks"],
          reason: String(args["p_reason"]),
          checked_at: String(args["p_checked_at"]),
          created_at: String(args["p_checked_at"]),
        });
        return { data: null, error: null };
      }

      throw new Error(`Unexpected RPC: ${name}`);
    },
  };

  return { db: db as never, instances, identities, verifications };
}

function instance(id: string, lab = "lab-a", user = "user-a", node = "node-a"): InstanceRow {
  return { id, lab_id: lab, user_id: user, runtime_node_id: node, runtime_binding_generation: 1 };
}

const baseInput = (instanceId = "instance-a", generation = 1) => ({
  instanceId,
  labId: "lab-a",
  learnerId: "user-a",
  bindingGeneration: generation,
  ttlMs: 60_000,
  now: NOW,
});

describe("v45 runtime identity primitives", () => {
  it("creates an expiring lab-bound runtime identity", () => {
    const binding = createRuntimeBinding({
      runtimeId: "r1",
      labId: "l1",
      learnerId: "u1",
      bindingGeneration: 4,
      ttlMs: 60_000,
      now: NOW,
    });
    expect(binding.labId).toBe("l1");
    expect(binding.bindingGeneration).toBe(4);
    expect(binding.status).toBe("ACTIVE");
    expect(() => assertBindingActive(binding, new Date("2026-09-20T00:00:30Z"))).not.toThrow();
  });

  it("binds credentials to runtime and generation", async () => {
    const binding = createRuntimeBinding({
      runtimeId: "r1",
      labId: "l1",
      learnerId: "u1",
      bindingGeneration: 2,
      ttlMs: 60_000,
    });
    const claims = await createCredentialClaims({
      credentialId: "c1",
      binding,
      credentialVersion: 1,
    });
    expect(claims.runtimeId).toBe("r1");
    expect(claims.bindingGeneration).toBe(2);
  });

  it("hashes secrets without exposing the secret", async () => {
    const a = await hashRuntimeSecret("secret-a");
    const b = await hashRuntimeSecret("secret-b");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("V49.1 runtime identity hardening", () => {
  it.each([2, 4, 10])(
    "converges %i concurrent first requests on one canonical runtime_id",
    async (count) => {
      const fake = makeIdentityDb({ instances: [instance("instance-concurrent")] });
      const results = await Promise.all(
        Array.from({ length: count }, () =>
          ensureRuntimeIdentity(fake.db, baseInput("instance-concurrent")),
        ),
      );
      expect(new Set(results.map((result) => result.runtimeId)).size).toBe(1);
      expect(fake.identities.size).toBe(1);
      expect(fake.identities.get("instance-concurrent")?.runtime_id).toBe(results[0]!.runtimeId);
    },
  );

  it("keeps different logical instances isolated", async () => {
    const fake = makeIdentityDb({ instances: [instance("instance-a"), instance("instance-b")] });
    const [a, b] = await Promise.all([
      ensureRuntimeIdentity(fake.db, baseInput("instance-a")),
      ensureRuntimeIdentity(fake.db, baseInput("instance-b")),
    ]);
    expect(a.runtimeId).not.toBe(b.runtimeId);
    expect(fake.identities.get("instance-a")?.runtime_id).toBe(a.runtimeId);
    expect(fake.identities.get("instance-b")?.runtime_id).toBe(b.runtimeId);
  });

  it("is idempotent for repeated calls at the same generation", async () => {
    const fake = makeIdentityDb({ instances: [instance("instance-idempotent")] });
    const first = await ensureRuntimeIdentity(fake.db, baseInput("instance-idempotent"));
    const firstRow = fake.identities.get("instance-idempotent")!;
    const second = await ensureRuntimeIdentity(fake.db, baseInput("instance-idempotent"));
    const secondRow = fake.identities.get("instance-idempotent")!;

    expect(second.runtimeId).toBe(first.runtimeId);
    expect(secondRow.credential_version).toBe(firstRow.credential_version);
    expect(secondRow.issued_at).toBe(firstRow.issued_at);
    expect(secondRow.expires_at).toBe(firstRow.expires_at);
  });

  it("preserves runtime_id while advancing a binding generation", async () => {
    const fake = makeIdentityDb({ instances: [instance("instance-refresh")] });
    const first = await ensureRuntimeIdentity(fake.db, baseInput("instance-refresh", 1));
    fake.instances.get("instance-refresh")!.runtime_binding_generation = 2;
    const refreshed = await ensureRuntimeIdentity(fake.db, {
      ...baseInput("instance-refresh", 2),
      now: new Date("2026-09-20T00:05:00Z"),
    });
    const row = fake.identities.get("instance-refresh")!;

    expect(refreshed.runtimeId).toBe(first.runtimeId);
    expect(refreshed.bindingGeneration).toBe(2);
    expect(row.credential_version).toBe(2);
    expect(row.runtime_id).toBe(first.runtimeId);
  });

  it("rejects stale generation requests instead of rolling identity state backward", async () => {
    const fake = makeIdentityDb({ instances: [instance("instance-stale")] });
    fake.instances.get("instance-stale")!.runtime_binding_generation = 3;
    const current = await ensureRuntimeIdentity(fake.db, baseInput("instance-stale", 3));
    fake.instances.get("instance-stale")!.runtime_binding_generation = 2;
    await expect(ensureRuntimeIdentity(fake.db, baseInput("instance-stale", 2))).rejects.toThrow(
      /stale/i,
    );
    expect(fake.identities.get("instance-stale")?.runtime_id).toBe(current.runtimeId);
    expect(fake.identities.get("instance-stale")?.binding_generation).toBe(3);
  });

  it.each(["REVOKED", "QUARANTINED"] as const)(
    "never silently reactivates a %s identity",
    async (status) => {
      const existing: IdentityRow = {
        runtime_id: crypto.randomUUID(),
        instance_id: "instance-lifecycle",
        lab_id: "lab-a",
        user_id: "user-a",
        node_id: "node-a",
        binding_generation: 1,
        status,
        credential_version: 2,
        issued_at: NOW.toISOString(),
        expires_at: new Date(NOW.getTime() + 60_000).toISOString(),
        revoked_at: status === "REVOKED" ? NOW.toISOString() : null,
        created_at: NOW.toISOString(),
        updated_at: NOW.toISOString(),
      };
      const fake = makeIdentityDb({
        instances: [instance("instance-lifecycle")],
        identities: [existing],
      });
      fake.instances.get("instance-lifecycle")!.runtime_binding_generation = 2;
      await expect(
        ensureRuntimeIdentity(fake.db, baseInput("instance-lifecycle", 2)),
      ).rejects.toThrow(/cannot be reactivated/i);
      expect(fake.identities.get("instance-lifecycle")?.status).toBe(status);
      expect(fake.identities.get("instance-lifecycle")?.runtime_id).toBe(existing.runtime_id);
    },
  );

  it("persists isolation verification only for the canonical persisted runtime_id", async () => {
    const fake = makeIdentityDb({ instances: [instance("instance-verify")] });
    const binding = await ensureRuntimeIdentity(fake.db, baseInput("instance-verify"));
    const health = {
      verificationId: "verification-1",
      runtimeId: binding.runtimeId,
      labId: binding.labId,
      bindingGeneration: binding.bindingGeneration,
      checkedAt: new Date("2026-09-20T00:00:10Z").toISOString(),
      healthy: true,
      ready: true,
      security: {
        networkIsolationEnforced: true,
        hostFilesystemBlocked: true,
        privilegeEscalationBlocked: true,
        metadataAccessBlocked: true,
      },
    };

    const verification = await verifyAndPersistRuntimeIsolation(fake.db, {
      binding,
      instanceId: "instance-verify",
      health,
    });
    expect(verification.runtimeId).toBe(binding.runtimeId);
    expect(fake.verifications).toHaveLength(1);
    expect(fake.verifications[0]?.runtime_id).toBe(binding.runtimeId);

    await expect(
      verifyAndPersistRuntimeIsolation(fake.db, {
        binding,
        instanceId: "instance-verify",
        health: { ...health, verificationId: "verification-2", runtimeId: crypto.randomUUID() },
      }),
    ).rejects.toThrow(/identity does not match/i);
    expect(fake.verifications).toHaveLength(1);
  });

  it("does not authorize a verification from another generation", () => {
    const binding = createRuntimeBinding({
      runtimeId: "runtime-a",
      labId: "lab-a",
      learnerId: "user-a",
      bindingGeneration: 2,
      ttlMs: 60_000,
      now: NOW,
    });
    const verification = {
      verificationId: "verification-a",
      runtimeId: "runtime-a",
      labId: "lab-a",
      bindingGeneration: 1,
      state: "PASS" as const,
      checkedAt: NOW.toISOString(),
      checks: {
        identity: "PASS" as const,
        filesystem: "PASS" as const,
        processes: "PASS" as const,
        network: "PASS" as const,
        secrets: "PASS" as const,
        resources: "PASS" as const,
        terminal: "PASS" as const,
        crossLab: "PASS" as const,
      },
      reason: "ok",
    };
    expect(() =>
      authorizeVerifiedRuntimeAccess({
        binding,
        verification,
        learnerId: "user-a",
        labId: "lab-a",
        runtimeId: "runtime-a",
        bindingGeneration: 2,
        now: NOW,
      }),
    ).toThrow(/does not match runtime binding/i);
  });
});
