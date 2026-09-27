import type { LabLifecycleStatus } from "./orchestrator.server";

export type LabJobKind =
  "CREATE" | "START" | "STOP" | "RESET" | "PAUSE" | "RESUME" | "RECONCILE" | "SNAPSHOT" | "EXPIRE";

export type LabJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export type LabJob = {
  id: string;
  instanceId: string;
  userId: string;
  kind: LabJobKind;
  status: LabJobStatus;
  attempts: number;
  maxAttempts: number;
  priority: number;
  availableAt: number;
  createdAt: number;
  leaseUntil: number | null;
  workerId: string | null;
  lastError: string | null;
};

export type SchedulerPolicy = {
  maxAttempts: number;
  workerLeaseMs: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
};

export const DEFAULT_SCHEDULER_POLICY: SchedulerPolicy = {
  maxAttempts: 3,
  workerLeaseMs: 30_000,
  retryBaseDelayMs: 1_000,
  retryMaxDelayMs: 30_000,
};

export function createLabJob(
  input: Pick<LabJob, "instanceId" | "userId" | "kind"> &
    Partial<Pick<LabJob, "priority" | "maxAttempts">>,
  now = Date.now(),
  policy: SchedulerPolicy = DEFAULT_SCHEDULER_POLICY,
): LabJob {
  return {
    id: crypto.randomUUID(),
    instanceId: input.instanceId,
    userId: input.userId,
    kind: input.kind,
    status: "QUEUED",
    attempts: 0,
    maxAttempts: input.maxAttempts ?? policy.maxAttempts,
    priority: input.priority ?? 0,
    availableAt: now,
    createdAt: now,
    leaseUntil: null,
    workerId: null,
    lastError: null,
  };
}

export function isRunnable(job: LabJob, now = Date.now()): boolean {
  return job.status === "QUEUED" && job.availableAt <= now;
}

/**
 * Deterministic ordering: ready jobs first, then priority, then age.
 * A scheduler must never use learner-controlled fields as ordering keys.
 */
export function compareJobs(a: LabJob, b: LabJob): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.id.localeCompare(b.id);
}

export function selectNextJob(jobs: readonly LabJob[], now = Date.now()): LabJob | null {
  const candidate = jobs
    .filter((job) => isRunnable(job, now))
    .slice()
    .sort(compareJobs)[0];
  return candidate ?? null;
}

export function claimJob(
  job: LabJob,
  workerId: string,
  now = Date.now(),
  policy: SchedulerPolicy = DEFAULT_SCHEDULER_POLICY,
): LabJob {
  if (job.status !== "QUEUED") throw new Error(`Job ${job.id} is not queued.`);
  if (job.availableAt > now) throw new Error(`Job ${job.id} is not available yet.`);
  if (job.leaseUntil !== null && job.leaseUntil > now)
    throw new Error(`Job ${job.id} is already leased.`);
  if (!workerId.trim()) throw new Error("Worker id is required.");

  return {
    ...job,
    status: "RUNNING",
    attempts: job.attempts + 1,
    leaseUntil: now + policy.workerLeaseMs,
    workerId,
  };
}

export function completeJob(job: LabJob, now = Date.now()): LabJob {
  if (job.status !== "RUNNING") throw new Error(`Job ${job.id} is not running.`);
  return {
    ...job,
    status: "SUCCEEDED",
    leaseUntil: null,
    workerId: null,
    lastError: null,
    availableAt: now,
  };
}

export function cancelJob(job: LabJob): LabJob {
  if (job.status === "SUCCEEDED" || job.status === "CANCELLED")
    throw new Error(`Job ${job.id} is already terminal.`);
  return { ...job, status: "CANCELLED", leaseUntil: null, workerId: null };
}

export function failJob(
  job: LabJob,
  error: string,
  now = Date.now(),
  policy: SchedulerPolicy = DEFAULT_SCHEDULER_POLICY,
): LabJob {
  if (job.status !== "RUNNING") throw new Error(`Job ${job.id} is not running.`);

  const retryable = job.attempts < job.maxAttempts;
  if (!retryable) {
    return {
      ...job,
      status: "FAILED",
      leaseUntil: null,
      workerId: null,
      lastError: error,
      availableAt: now,
    };
  }

  const exponent = Math.max(0, job.attempts - 1);
  const delay = Math.min(policy.retryMaxDelayMs, policy.retryBaseDelayMs * 2 ** exponent);
  return {
    ...job,
    status: "QUEUED",
    leaseUntil: null,
    workerId: null,
    lastError: error,
    availableAt: now + delay,
  };
}

export function recoverExpiredLease(
  job: LabJob,
  now = Date.now(),
  policy: SchedulerPolicy = DEFAULT_SCHEDULER_POLICY,
): LabJob {
  if (job.status !== "RUNNING" || job.leaseUntil === null || job.leaseUntil > now) return job;

  if (job.attempts >= job.maxAttempts) {
    return {
      ...job,
      status: "FAILED",
      leaseUntil: null,
      workerId: null,
      lastError: "Worker lease expired.",
    };
  }

  return {
    ...job,
    status: "QUEUED",
    leaseUntil: null,
    workerId: null,
    lastError: "Worker lease expired; requeued.",
    availableAt: now + policy.retryBaseDelayMs,
  };
}

/** Jobs are tied to a single lab instance; only one lifecycle mutation may be active per instance. */
export function hasActiveInstanceJob(jobs: readonly LabJob[], instanceId: string): boolean {
  return jobs.some(
    (job) => job.instanceId === instanceId && (job.status === "QUEUED" || job.status === "RUNNING"),
  );
}

export type LifecycleCommand = {
  kind: LabJobKind;
  expectedStatus?: LabLifecycleStatus;
};

export function lifecycleCommandForStatus(
  status: LabLifecycleStatus,
  desired: "ready" | "running" | "paused" | "stopped",
): LifecycleCommand | null {
  if (desired === "ready") {
    if (status === "CREATING" || status === "RESETTING") return { kind: "RECONCILE" };
    if (status === "RUNNING" || status === "PAUSED") return { kind: "STOP" };
    if (status === "STOPPED" || status === "ERROR" || status === "EXPIRED")
      return { kind: "CREATE" };
    return null;
  }
  if (desired === "running") {
    if (status === "READY" || status === "PAUSED") return { kind: "START" };
    if (status === "STOPPED" || status === "ERROR" || status === "EXPIRED")
      return { kind: "CREATE" };
    return null;
  }
  if (desired === "paused") {
    return status === "RUNNING" ? { kind: "PAUSE" } : null;
  }
  return status !== "STOPPED" && status !== "EXPIRED" ? { kind: "STOP" } : null;
}
