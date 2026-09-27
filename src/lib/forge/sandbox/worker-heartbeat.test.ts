import { describe, expect, it, vi } from "vitest";
import { InMemoryLabJobStore, LabWorker, newLifecycleJob } from "./worker";

describe("lab worker heartbeat", () => {
  it("renews an owned lease while provider execution is still running", async () => {
    vi.useFakeTimers({ now: 0 });
    try {
      const store = new InMemoryLabJobStore();
      const job = newLifecycleJob({ instanceId: "i-1", userId: "u-1", kind: "START" }, 0);
      await store.enqueue(job);

      let release!: () => void;
      const running = new Promise<void>((resolve) => {
        release = resolve;
      });
      const worker = new LabWorker(store, { execute: async () => running }, "worker-a", {
        heartbeatIntervalMs: 10_000,
      });

      const run = worker.runOnce(0);
      await vi.advanceTimersByTimeAsync(10_000);
      expect(store.get(job.id)?.leaseUntil).toBe(40_000);

      release();
      const result = await run;
      expect(result.kind).toBe("SUCCEEDED");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not renew an already-expired lease", async () => {
    const store = new InMemoryLabJobStore();
    const job = newLifecycleJob({ instanceId: "i-1", userId: "u-1", kind: "START" }, 0);
    await store.enqueue(job);
    await store.claimNext("worker-a", 0);

    expect(await store.heartbeat(job.id, "worker-a", 30_000)).toBeNull();
  });
});
