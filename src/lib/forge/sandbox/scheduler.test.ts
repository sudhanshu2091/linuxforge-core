import { describe, expect, it } from "vitest";
import {
  claimJob,
  completeJob,
  createLabJob,
  DEFAULT_SCHEDULER_POLICY,
  failJob,
  hasActiveInstanceJob,
  recoverExpiredLease,
  selectNextJob,
} from "./scheduler";

describe("lab scheduler", () => {
  const base = { instanceId: "instance-1", userId: "user-1", kind: "START" as const };

  it("orders runnable jobs by priority and then age", () => {
    const first = createLabJob({ ...base, priority: 1 }, 100);
    const second = createLabJob({ ...base, priority: 5 }, 200);
    const third = createLabJob({ ...base, priority: 5 }, 300);

    expect(selectNextJob([first, second, third], 400)?.id).toBe(second.id);
  });

  it("claims a job and completes it exactly once", () => {
    const job = createLabJob(base, 100);
    const claimed = claimJob(job, "worker-a", 200);
    expect(claimed.status).toBe("RUNNING");
    expect(claimed.attempts).toBe(1);
    expect(claimed.leaseUntil).toBe(200 + DEFAULT_SCHEDULER_POLICY.workerLeaseMs);

    const completed = completeJob(claimed, 250);
    expect(completed.status).toBe("SUCCEEDED");
    expect(completed.leaseUntil).toBeNull();
    expect(() => completeJob(completed, 300)).toThrow();
  });

  it("retries failures with bounded exponential backoff", () => {
    let job = createLabJob({ ...base, maxAttempts: 3 }, 0);
    job = claimJob(job, "worker-a", 0);
    job = failJob(job, "runtime unavailable", 0);
    expect(job.status).toBe("QUEUED");
    expect(job.availableAt).toBe(1000);

    job = claimJob(job, "worker-a", 1000);
    job = failJob(job, "runtime unavailable", 1000);
    expect(job.status).toBe("QUEUED");
    expect(job.availableAt).toBe(3000);

    job = claimJob(job, "worker-a", 3000);
    job = failJob(job, "runtime unavailable", 3000);
    expect(job.status).toBe("FAILED");
  });

  it("recovers an abandoned worker lease", () => {
    const job = claimJob(createLabJob(base, 0), "worker-a", 0);
    const recovered = recoverExpiredLease(job, DEFAULT_SCHEDULER_POLICY.workerLeaseMs + 1);
    expect(recovered.status).toBe("QUEUED");
    expect(recovered.lastError).toContain("lease expired");
  });

  it("prevents overlapping lifecycle jobs for the same instance", () => {
    const a = createLabJob(base, 0);
    const b = createLabJob({ ...base, kind: "RESET" }, 1);
    const other = createLabJob({ ...base, instanceId: "instance-2" }, 2);

    expect(hasActiveInstanceJob([a], "instance-1")).toBe(true);
    expect(hasActiveInstanceJob([a, b], "instance-1")).toBe(true);
    expect(hasActiveInstanceJob([a], "instance-2")).toBe(false);
    expect(hasActiveInstanceJob([other], "instance-2")).toBe(true);
  });
});
