import {
  claimJob,
  completeJob,
  createLabJob,
  failJob,
  recoverExpiredLease,
  type LabJob,
  type LabJobKind,
  type SchedulerPolicy,
  DEFAULT_SCHEDULER_POLICY,
} from "./scheduler";

export type LabJobStore = {
  enqueue(job: LabJob): Promise<void>;
  enqueueReconciliation?(instanceId: string, userId: string, now?: number): Promise<LabJob | null>;
  claimNext(workerId: string, now?: number): Promise<LabJob | null>;
  heartbeat(jobId: string, workerId: string, now?: number): Promise<LabJob | null>;
  complete(jobId: string, workerId: string, now?: number): Promise<LabJob | null>;
  fail(jobId: string, workerId: string, error: string, now?: number): Promise<LabJob | null>;
  cancelQueued(jobId: string, userId: string, now?: number): Promise<LabJob | null>;
  recoverExpired(now?: number): Promise<number>;
};

export type LabJobExecutor = {
  execute(job: LabJob): Promise<void>;
};

export type WorkerRunResult =
  { kind: "IDLE" } | { kind: "SUCCEEDED"; job: LabJob } | { kind: "FAILED"; job: LabJob };

export type LabWorkerOptions = {
  /** How often the worker renews an owned job lease while provider work runs. */
  heartbeatIntervalMs?: number;
};

/**
 * Provider-neutral worker boundary. The worker owns queue/lease semantics;
 * the injected executor owns the actual lifecycle dispatch. This keeps queue
 * infrastructure independent from Docker, a VM/microVM, or a future remote
 * runtime.
 */
export class LabWorker {
  constructor(
    private readonly store: LabJobStore,
    private readonly executor: LabJobExecutor,
    private readonly workerId: string,
    private readonly options: LabWorkerOptions = {},
  ) {
    if (!workerId.trim()) throw new Error("Worker id is required.");
    if (
      options.heartbeatIntervalMs !== undefined &&
      (!Number.isFinite(options.heartbeatIntervalMs) || options.heartbeatIntervalMs <= 0)
    ) {
      throw new Error("Worker heartbeat interval must be positive.");
    }
  }

  private heartbeatIntervalMs(): number {
    return this.options.heartbeatIntervalMs ?? 10_000;
  }

  async runOnce(now = Date.now()): Promise<WorkerRunResult> {
    const job = await this.store.claimNext(this.workerId, now);
    if (!job) return { kind: "IDLE" };

    let heartbeatInFlight: Promise<void> | null = null;
    let leaseLost = false;
    const heartbeat = () => {
      if (heartbeatInFlight || leaseLost) return;
      heartbeatInFlight = this.store
        .heartbeat(job.id, this.workerId, Date.now())
        .then((updated) => {
          if (!updated) leaseLost = true;
        })
        .catch(() => {
          leaseLost = true;
        })
        .finally(() => {
          heartbeatInFlight = null;
        });
    };

    const timer = setInterval(heartbeat, this.heartbeatIntervalMs());
    try {
      await this.executor.execute(job);
      if (heartbeatInFlight) await heartbeatInFlight;
      if (leaseLost) {
        throw new Error("Job lease was lost while provider execution was in progress.");
      }
      const completed = await this.store.complete(job.id, this.workerId, Date.now());
      if (!completed) throw new Error("Job completion was rejected; ownership may have expired.");
      return { kind: "SUCCEEDED", job: completed };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failed = await this.store.fail(job.id, this.workerId, message, Date.now());
      if (!failed) throw new Error("Job failure update was rejected; ownership may have expired.");
      return { kind: "FAILED", job: failed };
    } finally {
      clearInterval(timer);
    }
  }
}

/** Small deterministic store used by local development and unit tests. */
export class InMemoryLabJobStore implements LabJobStore {
  private readonly jobs = new Map<string, LabJob>();

  constructor(private readonly policy: SchedulerPolicy = DEFAULT_SCHEDULER_POLICY) {}

  async enqueue(job: LabJob): Promise<void> {
    if (this.jobs.has(job.id)) throw new Error(`Job ${job.id} already exists.`);
    this.jobs.set(job.id, job);
  }

  async enqueueReconciliation(
    instanceId: string,
    userId: string,
    now = Date.now(),
  ): Promise<LabJob | null> {
    if (
      [...this.jobs.values()].some(
        (job) =>
          job.instanceId === instanceId && (job.status === "QUEUED" || job.status === "RUNNING"),
      )
    )
      return null;

    const job = createLabJob(
      { instanceId, userId, kind: "RECONCILE", priority: -100 },
      now,
      this.policy,
    );
    await this.enqueue(job);
    return job;
  }

  async claimNext(workerId: string, now = Date.now()): Promise<LabJob | null> {
    const candidates = [...this.jobs.values()]
      .filter((job) => job.status === "QUEUED" && job.availableAt <= now)
      .filter(
        (job) =>
          ![...this.jobs.values()].some(
            (other) =>
              other.id !== job.id &&
              other.instanceId === job.instanceId &&
              (other.status === "RUNNING" || other.status === "QUEUED"),
          ),
      )
      .sort(
        (a, b) => b.priority - a.priority || a.createdAt - b.createdAt || a.id.localeCompare(b.id),
      );

    const job = candidates[0];
    if (!job) return null;
    const claimed = { ...claimJob(job, workerId, now, this.policy), workerId };
    this.jobs.set(job.id, claimed);
    return claimed;
  }

  async heartbeat(jobId: string, workerId: string, now = Date.now()): Promise<LabJob | null> {
    const job = this.jobs.get(jobId);
    if (
      !job ||
      job.status !== "RUNNING" ||
      job.workerId !== workerId ||
      job.leaseUntil === null ||
      job.leaseUntil <= now
    )
      return null;
    const updated = { ...job, leaseUntil: now + this.policy.workerLeaseMs };
    this.jobs.set(jobId, updated);
    return updated;
  }

  async complete(jobId: string, workerId: string, now = Date.now()): Promise<LabJob | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.workerId !== workerId) return null;
    const updated = completeJob(job, now);
    this.jobs.set(jobId, updated);
    return updated;
  }

  async fail(
    jobId: string,
    workerId: string,
    error: string,
    now = Date.now(),
  ): Promise<LabJob | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.workerId !== workerId) return null;
    const updated = failJob(job, error, now, this.policy);
    this.jobs.set(jobId, updated);
    return updated;
  }

  async cancelQueued(jobId: string, userId: string, now = Date.now()): Promise<LabJob | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.userId != userId || job.status !== "QUEUED") return null;
    const updated = {
      ...job,
      status: "CANCELLED" as const,
      leaseUntil: null,
      workerId: null,
      availableAt: now,
    };
    this.jobs.set(jobId, updated);
    return updated;
  }

  async recoverExpired(now = Date.now()): Promise<number> {
    let recovered = 0;
    for (const [id, job] of this.jobs) {
      const next = recoverExpiredLease(job, now, this.policy);
      if (next !== job) {
        this.jobs.set(id, { ...next, workerId: next.status === "RUNNING" ? job.workerId : null });
        recovered += 1;
      }
    }
    return recovered;
  }

  get(jobId: string): LabJob | null {
    return this.jobs.get(jobId) ?? null;
  }
}

export function newLifecycleJob(
  input: Pick<LabJob, "instanceId" | "userId"> & { kind: LabJobKind },
  now = Date.now(),
  policy: SchedulerPolicy = DEFAULT_SCHEDULER_POLICY,
): LabJob {
  return createLabJob(input, now, policy);
}
