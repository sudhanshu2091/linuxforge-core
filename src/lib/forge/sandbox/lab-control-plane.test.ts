import { describe, expect, it } from "vitest";
import { assertResourcePolicyWithinV44Limits, evaluateRuntimeHealth } from "./lab-control-plane";
import {
  InMemoryLabControlPlane,
  assertControlTransition,
  expirationDecision,
  operationIsRecoverable,
  reconcileOperation,
  refreshExpiry,
  resourcePolicyFingerprint,
} from "./lab-control-plane";
import { DEFAULT_RESOURCE_POLICY } from "./contract";

describe("V44 production lab control plane", () => {
  it("enforces lifecycle transitions", () => {
    expect(assertControlTransition("READY", "PAUSED").to).toBe("PAUSED");
    expect(() => assertControlTransition("STOPPED", "PAUSED")).toThrow();
  });

  it("is idempotent per learner and key", () => {
    const cp = new InMemoryLabControlPlane();
    const a = cp.begin({
      idempotencyKey: "lab-1:start-1",
      instanceId: "i1",
      userId: "u1",
      kind: "START",
    });
    const b = cp.begin({
      idempotencyKey: "lab-1:start-1",
      instanceId: "i1",
      userId: "u1",
      kind: "START",
    });
    expect(b.operationId).toBe(a.operationId);
    expect(() =>
      cp.begin({ idempotencyKey: "lab-1:start-1", instanceId: "i2", userId: "u1", kind: "START" }),
    ).toThrow();
  });

  it("does not allow a live operation to be claimed twice", () => {
    const cp = new InMemoryLabControlPlane();
    const op = cp.begin({ idempotencyKey: "k", instanceId: "i", userId: "u", kind: "RESET" });
    expect(cp.claim(op.operationId, "worker-a", 10_000)?.workerId).toBe("worker-a");
    expect(cp.claim(op.operationId, "worker-b", 10_000)).toBeNull();
  });

  it("recovers expired operation leases as UNKNOWN", () => {
    const cp = new InMemoryLabControlPlane();
    const now = new Date("2026-01-01T00:00:00.000Z");
    const op = cp.begin({ idempotencyKey: "k", instanceId: "i", userId: "u", kind: "STOP", now });
    cp.claim(op.operationId, "worker-a", 10_000, now);
    const recovered = cp.recoverExpired(new Date(now.getTime() + 10_001));
    expect(recovered[0]?.status).toBe("UNKNOWN");
    expect(operationIsRecoverable(recovered[0]!, 3)).toBe(true);
  });

  it("only confirms UNKNOWN operations when runtime evidence proves the outcome", () => {
    const confirmed = reconcileOperation(
      { kind: "PAUSE", instanceId: "i", status: "UNKNOWN" },
      { exists: true, instanceId: "i", environmentId: "e", status: "PAUSED", runtimeNodeId: "n" },
    );
    expect(confirmed.kind).toBe("CONFIRMED");
    const uncertain = reconcileOperation(
      { kind: "START", instanceId: "i", status: "UNKNOWN" },
      { exists: true, instanceId: "i", environmentId: "e", status: "READY", runtimeNodeId: "n" },
    );
    expect(uncertain.kind).toBe("NOT_PROVEN");
  });

  it("expires only active environments whose idle expiry has passed", () => {
    const now = new Date("2026-01-01T01:00:00.000Z");
    expect(
      expirationDecision({ status: "RUNNING", expiresAt: "2026-01-01T00:59:59.000Z", now }),
    ).toBe("EXPIRE");
    expect(
      expirationDecision({ status: "STOPPED", expiresAt: "2020-01-01T00:00:00.000Z", now }),
    ).toBe("KEEP");
    expect(refreshExpiry(now, DEFAULT_RESOURCE_POLICY)).toBe("2026-01-01T13:00:00.000Z");
  });

  it("has a stable resource-policy fingerprint", () => {
    expect(resourcePolicyFingerprint(DEFAULT_RESOURCE_POLICY)).toBe(
      resourcePolicyFingerprint({ ...DEFAULT_RESOURCE_POLICY }),
    );
  });
});

describe("V44 resource and health guard rails", () => {
  it("accepts the default policy and rejects unsafe escalation", () => {
    expect(() => assertResourcePolicyWithinV44Limits(DEFAULT_RESOURCE_POLICY)).not.toThrow();
    expect(() =>
      assertResourcePolicyWithinV44Limits({ ...DEFAULT_RESOURCE_POLICY, memoryMiB: 16 }),
    ).toThrow();
    expect(() =>
      assertResourcePolicyWithinV44Limits({
        ...DEFAULT_RESOURCE_POLICY,
        allowPrivilegeEscalation: true as false,
      }),
    ).toThrow();
  });

  it("classifies stale and unsafe runtime health conservatively", () => {
    const now = new Date("2026-01-01T00:00:30.000Z");
    const base = {
      healthy: true,
      ready: true,
      checkedAt: "2026-01-01T00:00:20.000Z",
      security: {
        networkIsolationEnforced: true,
        hostFilesystemBlocked: true,
        privilegeEscalationBlocked: true,
        metadataAccessBlocked: true,
      },
    };
    expect(evaluateRuntimeHealth({ ...base, now })).toBe("HEALTHY");
    expect(evaluateRuntimeHealth({ ...base, now: new Date("2026-01-01T00:01:00.000Z") })).toBe(
      "STALE",
    );
    expect(
      evaluateRuntimeHealth({
        ...base,
        now,
        security: { ...base.security, metadataAccessBlocked: false },
      }),
    ).toBe("UNSAFE");
  });
});

it("allows an explicit restart from a stopped runtime", () => {
  expect(assertControlTransition("STOPPED", "RUNNING").to).toBe("RUNNING");
});
