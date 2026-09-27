import { describe, expect, test } from "vitest";
import { InMemoryRuntimeInfrastructure, hashRuntimeCredential } from "./runtime-infrastructure";
import type { RuntimeNode } from "./runtime-backend";

const node = (id: string): RuntimeNode => ({
  nodeId: id,
  backendId: "microvm-backend",
  runtimeClass: "microvm",
  runtimeVersion: "test",
  capabilities: {
    runtimeClass: "microvm",
    snapshot: true,
    pauseResume: true,
    networkPolicy: true,
    immutableImages: true,
    guestRoot: true,
  },
  maxEnvironments: 2,
  activeEnvironments: 0,
  enabled: true,
  registeredAt: "2026-01-01T00:00:00.000Z",
  metadata: {},
});

const t0 = new Date("2026-01-01T00:00:00.000Z");

describe("runtime infrastructure v17", () => {
  test("node heartbeat uses a registration generation and expires stale nodes", () => {
    const infra = new InMemoryRuntimeInfrastructure();
    const registered = infra.register(node("n1"), t0);
    expect(
      infra.heartbeatNode("n1", registered.registrationGeneration, new Date(t0.getTime() + 10_000))
        .status,
    ).toBe("ACTIVE");
    expect(infra.getNode("n1", new Date(t0.getTime() + 41_000))?.status).toBe("OFFLINE");
    expect(() =>
      infra.heartbeatNode("n1", registered.registrationGeneration, new Date(t0.getTime() + 42_000)),
    ).toThrow(/heartbeat/);
  });

  test("node capacity is protected by an expiring lease", () => {
    const infra = new InMemoryRuntimeInfrastructure();
    infra.register(node("n1"), t0);
    const lease = infra.acquireLease("n1", "worker-a", 10_000, t0);
    expect(() =>
      infra.acquireLease("n1", "worker-b", 10_000, new Date(t0.getTime() + 1_000)),
    ).toThrow(/already leased/);
    const renewed = infra.heartbeatLease(lease, 10_000, new Date(t0.getTime() + 5_000));
    expect(renewed?.ownerId).toBe("worker-a");
    expect(infra.heartbeatLease(lease, 10_000, new Date(t0.getTime() + 20_000))).toBeNull();
    expect(
      infra.acquireLease("n1", "worker-b", 10_000, new Date(t0.getTime() + 20_001)).ownerId,
    ).toBe("worker-b");
  });

  test("operation idempotency returns the original operation and prevents cross-operation key reuse", () => {
    const infra = new InMemoryRuntimeInfrastructure();
    const first = infra.begin({
      idempotencyKey: "lab-1:create",
      kind: "LAUNCH",
      environmentId: "env-1",
      nodeId: "n1",
      now: t0,
    });
    const second = infra.begin({
      idempotencyKey: "lab-1:create",
      kind: "LAUNCH",
      environmentId: "env-1",
      nodeId: "n1",
      now: new Date(t0.getTime() + 1000),
    });
    expect(second.operationId).toBe(first.operationId);
    expect(() =>
      infra.begin({
        idempotencyKey: "lab-1:create",
        kind: "STOP",
        environmentId: "env-1",
        nodeId: "n1",
        now: t0,
      }),
    ).toThrow(/different runtime operation/);
  });

  test("expired operation ownership becomes UNKNOWN instead of guessing success", () => {
    const infra = new InMemoryRuntimeInfrastructure();
    const op = infra.begin({
      idempotencyKey: "env-1:start",
      kind: "START",
      environmentId: "env-1",
      now: t0,
    });
    expect(infra.claim(op.operationId, "worker-a", 10_000, t0)?.status).toBe("RUNNING");
    expect(infra.recoverExpired(new Date(t0.getTime() + 10_001))[0]?.status).toBe("UNKNOWN");
    expect(
      infra.complete(op.operationId, "worker-a", null, new Date(t0.getTime() + 10_002)),
    ).toBeNull();
  });

  test("runtime credentials are stored as one-way hashes", async () => {
    expect(await hashRuntimeCredential("secret")).toBe(await hashRuntimeCredential("secret"));
    expect(await hashRuntimeCredential("secret")).not.toBe(await hashRuntimeCredential("other"));
  });
});
