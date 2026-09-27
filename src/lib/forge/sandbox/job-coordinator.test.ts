import { describe, expect, it } from "vitest";
import { createLabJobCoordinator } from "./job-coordinator.server";
import { InMemoryLabJobStore } from "./worker";

describe("lab job coordinator", () => {
  it("persists a lifecycle job before a worker can execute it", async () => {
    const store = new InMemoryLabJobStore();
    const executed: string[] = [];
    const coordinator = createLabJobCoordinator(
      store,
      {
        execute: async (job) => {
          executed.push(job.kind);
        },
      },
      "worker-a",
    );

    const job = await coordinator.enqueueLifecycle({
      instanceId: "i-1",
      userId: "u-1",
      kind: "START",
    });
    expect(store.get(job.id)?.status).toBe("QUEUED");

    const result = await coordinator.runWorkerOnce(job.createdAt);
    expect(result.kind).toBe("SUCCEEDED");
    expect(executed).toEqual(["START"]);
  });

  it("exposes expired-job recovery as a control-plane operation", async () => {
    const store = new InMemoryLabJobStore();
    const coordinator = createLabJobCoordinator(store, { execute: async () => {} }, "worker-a");
    const job = await coordinator.enqueueLifecycle({
      instanceId: "i-1",
      userId: "u-1",
      kind: "RESET",
    });

    await store.claimNext("worker-a", job.createdAt);
    expect(await coordinator.recoverExpired(job.createdAt + 30_001)).toBe(1);
    expect(store.get(job.id)?.status).toBe("QUEUED");
  });

  it("cancels a queued lifecycle job through the coordinator", async () => {
    const store = new InMemoryLabJobStore();
    const coordinator = createLabJobCoordinator(
      store,
      { execute: async () => undefined },
      "worker-a",
    );

    const job = await coordinator.enqueueLifecycle({
      instanceId: "instance-a",
      userId: "user-a",
      kind: "RESET",
    });

    const cancelled = await coordinator.cancelQueued(job.id, "user-a", job.createdAt + 1);
    expect(cancelled?.status).toBe("CANCELLED");
  });
  it("deduplicates reconciliation work for an instance", async () => {
    const store = new InMemoryLabJobStore();
    const coordinator = createLabJobCoordinator(store, { execute: async () => {} }, "worker-a");

    const first = await coordinator.enqueueReconciliation({
      instanceId: "instance-a",
      userId: "user-a",
    });
    const second = await coordinator.enqueueReconciliation({
      instanceId: "instance-a",
      userId: "user-a",
    });

    expect(first?.kind).toBe("RECONCILE");
    expect(second).toBeNull();
  });
});
