import { describe, expect, it } from "vitest";
import { InMemoryLabJobStore, LabWorker, newLifecycleJob } from "./worker";

describe("lab worker dispatch", () => {
  it("claims, executes and durably completes a job", async () => {
    const store = new InMemoryLabJobStore();
    const job = newLifecycleJob({ instanceId: "i-1", userId: "u-1", kind: "START" }, 0);
    await store.enqueue(job);
    const executed: string[] = [];
    const worker = new LabWorker(
      store,
      {
        execute: async (j) => {
          executed.push(j.kind);
        },
      },
      "worker-a",
    );

    const result = await worker.runOnce(0);
    expect(result.kind).toBe("SUCCEEDED");
    expect(executed).toEqual(["START"]);
    expect(store.get(job.id)?.status).toBe("SUCCEEDED");
  });

  it("records a retryable provider failure instead of losing the job", async () => {
    const store = new InMemoryLabJobStore();
    const job = newLifecycleJob({ instanceId: "i-1", userId: "u-1", kind: "RESET" }, 0);
    await store.enqueue(job);
    const worker = new LabWorker(
      store,
      {
        execute: async () => {
          throw new Error("provider unavailable");
        },
      },
      "worker-a",
    );

    const result = await worker.runOnce(0);
    expect(result.kind).toBe("FAILED");
    expect(store.get(job.id)?.status).toBe("QUEUED");
    expect(store.get(job.id)?.lastError).toBe("provider unavailable");
  });

  it("rejects completion from a different worker", async () => {
    const store = new InMemoryLabJobStore();
    const job = newLifecycleJob({ instanceId: "i-1", userId: "u-1", kind: "STOP" }, 0);
    await store.enqueue(job);
    const claimed = await store.claimNext("worker-a", 0);
    expect(claimed?.workerId).toBe("worker-a");
    expect(await store.complete(job.id, "worker-b", 1)).toBeNull();
  });

  it("cancels only a queued job owned by the learner", async () => {
    const store = new InMemoryLabJobStore();
    const job = newLifecycleJob({ instanceId: "instance-a", userId: "user-a", kind: "RESET" }, 0);
    await store.enqueue(job);

    const cancelled = await store.cancelQueued(job.id, "user-a", 100);
    expect(cancelled?.status).toBe("CANCELLED");
    expect(await store.claimNext("worker-a", 100)).toBeNull();
  });

  it("does not cancel a running job", async () => {
    const store = new InMemoryLabJobStore();
    const job = newLifecycleJob({ instanceId: "instance-a", userId: "user-a", kind: "RESET" }, 0);
    await store.enqueue(job);
    await store.claimNext("worker-a", 0);

    expect(await store.cancelQueued(job.id, "user-a", 1)).toBeNull();
  });

  it("heartbeats an owned job and recovers an abandoned lease", async () => {
    const store = new InMemoryLabJobStore();
    const job = newLifecycleJob({ instanceId: "i-1", userId: "u-1", kind: "START" }, 0);
    await store.enqueue(job);
    await store.claimNext("worker-a", 0);
    const heartbeat = await store.heartbeat(job.id, "worker-a", 10_000);
    expect(heartbeat?.leaseUntil).toBe(10_000 + 30_000);

    const recovered = await store.recoverExpired(40_001);
    expect(recovered).toBe(1);
    expect(store.get(job.id)?.status).toBe("QUEUED");
    expect(store.get(job.id)?.workerId).toBeNull();
  });
});
