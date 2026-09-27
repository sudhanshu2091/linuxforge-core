import { describe, expect, it } from "vitest";
import { InMemoryLabJobStore, LabWorker, newLifecycleJob } from "./worker";

describe("worker/provider dispatch boundary", () => {
  it("passes typed lifecycle jobs to the executor without exposing shell input", async () => {
    const store = new InMemoryLabJobStore();
    const job = newLifecycleJob({ instanceId: "i-1", userId: "u-1", kind: "RESET" }, 0);
    await store.enqueue(job);
    let received: string | null = null;
    const worker = new LabWorker(
      store,
      {
        execute: async (receivedJob) => {
          received = receivedJob.kind;
        },
      },
      "worker-a",
    );

    await worker.runOnce(0);
    expect(received).toBe("RESET");
  });
});
