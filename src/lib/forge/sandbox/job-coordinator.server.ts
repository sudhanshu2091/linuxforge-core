import type { LabJob, LabJobKind, SchedulerPolicy } from "./scheduler";
import { createLabJob, DEFAULT_SCHEDULER_POLICY } from "./scheduler";
import { LabWorker, type LabJobExecutor, type LabJobStore, type WorkerRunResult } from "./worker";

export type LabJobCoordinator = {
  enqueueLifecycle(
    input: Pick<LabJob, "instanceId" | "userId"> & { kind: LabJobKind; priority?: number },
  ): Promise<LabJob>;
  enqueueReconciliation(input: Pick<LabJob, "instanceId" | "userId">): Promise<LabJob | null>;
  runWorkerOnce(now?: number): Promise<WorkerRunResult>;
  cancelQueued(jobId: string, userId: string, now?: number): Promise<LabJob | null>;
  recoverExpired(now?: number): Promise<number>;
};

/**
 * Small composition boundary connecting durable queue storage to a worker.
 * Scheduling policy stays in one place; the executor remains the only layer
 * allowed to know how a lifecycle job reaches the Lab Orchestrator.
 */
export function createLabJobCoordinator(
  store: LabJobStore,
  executor: LabJobExecutor,
  workerId: string,
  policy: SchedulerPolicy = DEFAULT_SCHEDULER_POLICY,
): LabJobCoordinator {
  const worker = new LabWorker(store, executor, workerId);

  return {
    async enqueueLifecycle(input) {
      const job = createLabJob(input, Date.now(), policy);
      await store.enqueue(job);
      return job;
    },
    async enqueueReconciliation(input) {
      if ("enqueueReconciliation" in store && typeof store.enqueueReconciliation === "function") {
        return store.enqueueReconciliation(input.instanceId, input.userId, Date.now());
      }
      const job = createLabJob({ ...input, kind: "RECONCILE", priority: -100 }, Date.now(), policy);
      await store.enqueue(job);
      return job;
    },
    runWorkerOnce(now) {
      return worker.runOnce(now);
    },
    cancelQueued(jobId, userId, now) {
      return store.cancelQueued(jobId, userId, now);
    },
    recoverExpired(now) {
      return store.recoverExpired(now);
    },
  };
}
