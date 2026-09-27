import { describe, expect, test } from "vitest";
import { InMemoryRuntimeInfrastructure } from "./runtime-infrastructure";

describe("runtime operation crash semantics", () => {
  test("a worker can renew and finish an operation only while it owns the lease", () => {
    const infra = new InMemoryRuntimeInfrastructure();
    const now = new Date("2026-01-01T00:00:00.000Z");
    const op = infra.begin({
      idempotencyKey: "env-1:launch",
      kind: "LAUNCH",
      environmentId: "env-1",
      now,
    });
    expect(infra.claim(op.operationId, "worker-a", 10_000, now)?.attempt).toBe(1);
    expect(
      infra.heartbeat(op.operationId, "worker-b", 10_000, new Date(now.getTime() + 1_000)),
    ).toBeNull();
    expect(
      infra.heartbeat(op.operationId, "worker-a", 10_000, new Date(now.getTime() + 1_000))?.status,
    ).toBe("RUNNING");
    expect(
      infra.complete(op.operationId, "worker-a", "env-1", new Date(now.getTime() + 2_000))?.status,
    ).toBe("SUCCEEDED");
  });

  test("an expired operation can be reclaimed only after reconciliation marks it unknown", () => {
    const infra = new InMemoryRuntimeInfrastructure();
    const now = new Date("2026-01-01T00:00:00.000Z");
    const op = infra.begin({
      idempotencyKey: "env-2:stop",
      kind: "STOP",
      environmentId: "env-2",
      now,
    });
    infra.claim(op.operationId, "worker-a", 10_000, now);
    expect(infra.recoverExpired(new Date(now.getTime() + 10_001))[0]?.status).toBe("UNKNOWN");
    expect(
      infra.claim(op.operationId, "worker-b", 10_000, new Date(now.getTime() + 10_002))?.ownerId,
    ).toBe("worker-b");
  });
});
