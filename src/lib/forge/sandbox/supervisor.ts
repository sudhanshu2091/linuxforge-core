import type { LabJob } from "./scheduler";

export type SupervisionCandidate = {
  instanceId: string;
  userId: string;
  status: string;
  lastActiveAt: number;
  expiresAt: number | null;
};

export type LabSupervisionStore = {
  recoverExpired(now?: number): Promise<number>;
  listSupervisionCandidates(
    now?: number,
    reconcileAfterMs?: number,
    limit?: number,
  ): Promise<SupervisionCandidate[]>;
  enqueueReconciliation(instanceId: string, userId: string, now?: number): Promise<LabJob | null>;
  enqueueExpiration(instanceId: string, userId: string, now?: number): Promise<LabJob | null>;
};

export type LabRuntimeSupervisorOptions = {
  reconcileAfterMs?: number;
  batchSize?: number;
};

export type SupervisionTickResult = {
  recoveredJobs: number;
  inspectedInstances: number;
  enqueuedReconciliations: number;
  enqueuedExpirations: number;
};

const TERMINAL = new Set(["STOPPED", "EXPIRED"]);

/**
 * Control-plane supervisor. It never touches a runtime directly: it only
 * turns stale/expired durable state into typed queue work. Provider execution
 * remains the worker/orchestrator responsibility.
 */
export class LabRuntimeSupervisor {
  constructor(
    private readonly store: LabSupervisionStore,
    private readonly options: LabRuntimeSupervisorOptions = {},
  ) {
    if (options.reconcileAfterMs !== undefined && options.reconcileAfterMs <= 0)
      throw new Error("Reconciliation interval must be positive.");
    if (
      options.batchSize !== undefined &&
      (!Number.isInteger(options.batchSize) || options.batchSize <= 0)
    )
      throw new Error("Supervision batch size must be a positive integer.");
  }

  async tick(now = Date.now()): Promise<SupervisionTickResult> {
    const reconcileAfterMs = this.options.reconcileAfterMs ?? 60_000;
    const batchSize = this.options.batchSize ?? 100;
    const recoveredJobs = await this.store.recoverExpired(now);
    const candidates = await this.store.listSupervisionCandidates(now, reconcileAfterMs, batchSize);
    let enqueuedReconciliations = 0;
    let enqueuedExpirations = 0;

    for (const candidate of candidates) {
      if (TERMINAL.has(candidate.status)) continue;
      if (candidate.expiresAt !== null && candidate.expiresAt <= now) {
        if (await this.store.enqueueExpiration(candidate.instanceId, candidate.userId, now))
          enqueuedExpirations += 1;
        continue;
      }
      if (now - candidate.lastActiveAt >= reconcileAfterMs) {
        if (await this.store.enqueueReconciliation(candidate.instanceId, candidate.userId, now))
          enqueuedReconciliations += 1;
      }
    }

    return {
      recoveredJobs,
      inspectedInstances: candidates.length,
      enqueuedReconciliations,
      enqueuedExpirations,
    };
  }
}
