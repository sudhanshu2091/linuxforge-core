import { describe, expect, it } from "vitest";
import {
  LabRuntimeSupervisor,
  type LabSupervisionStore,
  type SupervisionCandidate,
} from "./supervisor";
import type { LabJob } from "./scheduler";

const job = (kind: LabJob["kind"]): LabJob => ({
  id: crypto.randomUUID(),
  instanceId: "i",
  userId: "u",
  kind,
  status: "QUEUED",
  attempts: 0,
  maxAttempts: 3,
  priority: 0,
  availableAt: 0,
  createdAt: 0,
  leaseUntil: null,
  workerId: null,
  lastError: null,
});

class Store implements LabSupervisionStore {
  candidates: SupervisionCandidate[] = [];
  reconciles = 0;
  expirations = 0;
  recovered = 0;
  async recoverExpired() {
    return this.recovered;
  }
  async listSupervisionCandidates() {
    return this.candidates;
  }
  async enqueueReconciliation() {
    this.reconciles += 1;
    return job("RECONCILE");
  }
  async enqueueExpiration() {
    this.expirations += 1;
    return job("EXPIRE");
  }
}

describe("lab runtime supervisor", () => {
  it("enqueues expiration for expired active instances", async () => {
    const store = new Store();
    store.recovered = 2;
    store.candidates = [
      { instanceId: "i-1", userId: "u-1", status: "RUNNING", lastActiveAt: 1, expiresAt: 9_000 },
    ];
    const result = await new LabRuntimeSupervisor(store).tick(10_000);
    expect(result).toEqual({
      recoveredJobs: 2,
      inspectedInstances: 1,
      enqueuedReconciliations: 0,
      enqueuedExpirations: 1,
    });
  });

  it("reconciles stale but unexpired instances", async () => {
    const store = new Store();
    store.candidates = [
      { instanceId: "i-1", userId: "u-1", status: "READY", lastActiveAt: 0, expiresAt: 120_000 },
    ];
    const result = await new LabRuntimeSupervisor(store, { reconcileAfterMs: 60_000 }).tick(60_001);
    expect(result.enqueuedReconciliations).toBe(1);
    expect(store.reconciles).toBe(1);
  });

  it("does not enqueue work for terminal instances", async () => {
    const store = new Store();
    store.candidates = [
      { instanceId: "i-1", userId: "u-1", status: "STOPPED", lastActiveAt: 0, expiresAt: 1 },
      { instanceId: "i-2", userId: "u-2", status: "EXPIRED", lastActiveAt: 0, expiresAt: 1 },
    ];
    const result = await new LabRuntimeSupervisor(store).tick(10_000);
    expect(result.enqueuedReconciliations).toBe(0);
    expect(result.enqueuedExpirations).toBe(0);
  });
});
