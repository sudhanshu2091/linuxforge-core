import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { LabJob, LabJobKind, LabJobStatus, SchedulerPolicy } from "./scheduler";
import { DEFAULT_SCHEDULER_POLICY } from "./scheduler";
import type { LabJobStore } from "./worker";

type Db = SupabaseClient<Database>;
type LabJobRow = Database["public"]["Tables"]["lab_jobs"]["Row"];

export type LabSupervisionCandidate = {
  instanceId: string;
  userId: string;
  status: string;
  lastActiveAt: number;
  expiresAt: number | null;
};

const toJob = (row: LabJobRow): LabJob => ({
  id: row.id,
  instanceId: row.instance_id,
  userId: row.user_id,
  kind: row.kind as LabJobKind,
  status: row.status as LabJobStatus,
  attempts: row.attempts,
  maxAttempts: row.max_attempts,
  priority: row.priority,
  availableAt: new Date(row.available_at).getTime(),
  createdAt: new Date(row.created_at).getTime(),
  leaseUntil: row.lease_until ? new Date(row.lease_until).getTime() : null,
  workerId: row.worker_id,
  lastError: row.last_error,
});

/**
 * Persistent queue adapter for the server-side worker pool.
 *
 * This adapter intentionally uses dedicated PostgreSQL RPCs rather than
 * client-side read/modify/write sequences. Claim, heartbeat, completion,
 * retry, and lease recovery therefore remain atomic under concurrency.
 *
 * The db passed here MUST be an internal worker client. The migration grants
 * these queue-management functions only to service_role; learner-facing
 * publishable/authenticated clients cannot claim jobs for other learners.
 */
export class SupabaseLabJobStore implements LabJobStore {
  constructor(
    private readonly db: Db,
    private readonly policy: SchedulerPolicy = DEFAULT_SCHEDULER_POLICY,
  ) {}

  async enqueue(job: LabJob): Promise<void> {
    const result = await this.db.rpc("enqueue_lab_job", {
      p_id: job.id,
      p_instance_id: job.instanceId,
      p_user_id: job.userId,
      p_kind: job.kind,
      p_priority: job.priority,
      p_max_attempts: job.maxAttempts,
      p_available_at: new Date(job.availableAt).toISOString(),
    });
    if (result.error) throw new Error(result.error.message);
  }

  async enqueueReconciliation(
    instanceId: string,
    userId: string,
    now = Date.now(),
  ): Promise<LabJob | null> {
    const result = await this.db.rpc("enqueue_reconcile_lab_job", {
      p_instance_id: instanceId,
      p_user_id: userId,
      p_now: new Date(now).toISOString(),
    });
    if (result.error) throw new Error(result.error.message);
    const row = result.data?.[0];
    return row ? toJob(row) : null;
  }

  async claimNext(workerId: string, now = Date.now()): Promise<LabJob | null> {
    const result = await this.db.rpc("claim_next_lab_job", {
      p_worker_id: workerId,
      p_lease_seconds: Math.round(this.policy.workerLeaseMs / 1000),
      p_now: new Date(now).toISOString(),
    });
    if (result.error) throw new Error(result.error.message);
    const row = result.data?.[0];
    return row ? toJob(row) : null;
  }

  async heartbeat(jobId: string, workerId: string, now = Date.now()): Promise<LabJob | null> {
    const result = await this.db.rpc("heartbeat_lab_job", {
      p_job_id: jobId,
      p_worker_id: workerId,
      p_lease_seconds: Math.round(this.policy.workerLeaseMs / 1000),
      p_now: new Date(now).toISOString(),
    });
    if (result.error) throw new Error(result.error.message);
    const row = result.data?.[0];
    return row ? toJob(row) : null;
  }

  async complete(jobId: string, workerId: string, now = Date.now()): Promise<LabJob | null> {
    const result = await this.db.rpc("complete_lab_job", {
      p_job_id: jobId,
      p_worker_id: workerId,
      p_now: new Date(now).toISOString(),
    });
    if (result.error) throw new Error(result.error.message);
    const row = result.data?.[0];
    return row ? toJob(row) : null;
  }

  async fail(
    jobId: string,
    workerId: string,
    error: string,
    now = Date.now(),
  ): Promise<LabJob | null> {
    const result = await this.db.rpc("fail_lab_job", {
      p_job_id: jobId,
      p_worker_id: workerId,
      p_error: error.slice(0, 2000),
      p_retry_base_seconds: Math.max(1, Math.round(this.policy.retryBaseDelayMs / 1000)),
      p_retry_max_seconds: Math.max(1, Math.round(this.policy.retryMaxDelayMs / 1000)),
      p_now: new Date(now).toISOString(),
    });
    if (result.error) throw new Error(result.error.message);
    const row = result.data?.[0];
    return row ? toJob(row) : null;
  }

  async cancelQueued(jobId: string, userId: string, now = Date.now()): Promise<LabJob | null> {
    const result = await this.db.rpc("cancel_queued_lab_job", {
      p_job_id: jobId,
      p_user_id: userId,
      p_now: new Date(now).toISOString(),
    });
    if (result.error) throw new Error(result.error.message);
    const row = result.data?.[0];
    return row ? toJob(row) : null;
  }

  async recoverExpired(now = Date.now()): Promise<number> {
    const result = await this.db.rpc("recover_expired_lab_jobs", {
      p_now: new Date(now).toISOString(),
      p_retry_base_seconds: Math.max(1, Math.round(this.policy.retryBaseDelayMs / 1000)),
    });
    if (result.error) throw new Error(result.error.message);
    return result.data ?? 0;
  }

  async listSupervisionCandidates(
    now = Date.now(),
    reconcileAfterMs = 60_000,
    limit = 100,
  ): Promise<LabSupervisionCandidate[]> {
    const result = await this.db.rpc("list_lab_supervision_candidates", {
      p_now: new Date(now).toISOString(),
      p_reconcile_after_seconds: Math.max(1, Math.round(reconcileAfterMs / 1000)),
      p_limit: Math.max(1, Math.min(500, limit)),
    });
    if (result.error) throw new Error(result.error.message);
    return (result.data ?? []).map((row) => ({
      instanceId: row.id,
      userId: row.user_id,
      status: row.status,
      lastActiveAt: new Date(row.last_active_at).getTime(),
      expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
    }));
  }

  async enqueueExpiration(
    instanceId: string,
    userId: string,
    now = Date.now(),
  ): Promise<LabJob | null> {
    const result = await this.db.rpc("enqueue_expire_lab_job", {
      p_instance_id: instanceId,
      p_user_id: userId,
      p_now: new Date(now).toISOString(),
    });
    if (result.error) throw new Error(result.error.message);
    const row = result.data?.[0];
    return row ? toJob(row) : null;
  }
}
