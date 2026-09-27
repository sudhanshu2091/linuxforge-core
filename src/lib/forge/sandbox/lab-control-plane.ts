/**
 * V44 Production Lab Control Plane.
 *
 * Pure deterministic policy/state machine. It owns lifecycle intent, operation
 * identity, resource/expiry decisions, reconciliation classification and
 * recovery policy. It never executes a provider operation.
 */
import type { EnvironmentStatus, ResourcePolicy } from "./contract";

export const LAB_CONTROL_OPERATION_KINDS = [
  "CREATE",
  "START",
  "STOP",
  "RESTART",
  "RESET",
  "PAUSE",
  "RESUME",
  "SNAPSHOT",
  "RESTORE",
  "DESTROY",
  "EXPIRE",
  "RECONCILE",
] as const;
export type LabControlOperationKind = (typeof LAB_CONTROL_OPERATION_KINDS)[number];

export const LAB_CONTROL_OPERATION_STATUSES = [
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "UNKNOWN",
] as const;
export type LabControlOperationStatus = (typeof LAB_CONTROL_OPERATION_STATUSES)[number];

export type LabControlOperation = {
  operationId: string;
  idempotencyKey: string;
  instanceId: string;
  userId: string;
  kind: LabControlOperationKind;
  status: LabControlOperationStatus;
  attempt: number;
  createdAt: string;
  updatedAt: string;
  leaseUntil: string | null;
  workerId: string | null;
  resultRef: string | null;
  error: string | null;
};

export type LabControlTransition = { from: EnvironmentStatus; to: EnvironmentStatus };

const transitions: Record<EnvironmentStatus, readonly EnvironmentStatus[]> = {
  CREATING: ["READY", "ERROR", "EXPIRED"],
  READY: ["RUNNING", "RESETTING", "PAUSED", "STOPPED", "EXPIRED", "ERROR"],
  RUNNING: ["READY", "PAUSED", "RESETTING", "STOPPED", "EXPIRED", "ERROR"],
  PAUSED: ["RUNNING", "READY", "STOPPED", "EXPIRED", "ERROR"],
  RESETTING: ["READY", "RUNNING", "ERROR", "EXPIRED"],
  STOPPED: ["CREATING", "RUNNING", "EXPIRED"],
  ERROR: ["CREATING", "READY", "STOPPED", "EXPIRED"],
  EXPIRED: ["CREATING"],
};

const terminal = new Set<LabControlOperationStatus>(["SUCCEEDED", "FAILED", "CANCELLED"]);

export function allowedTransitions(from: EnvironmentStatus): readonly EnvironmentStatus[] {
  return transitions[from];
}

export function canTransition(from: EnvironmentStatus, to: EnvironmentStatus): boolean {
  return from === to || transitions[from].includes(to);
}

export function assertControlTransition(
  from: EnvironmentStatus,
  to: EnvironmentStatus,
): LabControlTransition {
  if (!canTransition(from, to))
    throw new Error(`Invalid lab lifecycle transition: ${from} -> ${to}`);
  return { from, to };
}

export function operationKindForAction(
  action: Exclude<LabControlOperationKind, "RECONCILE" | "EXPIRE">,
): LabControlOperationKind {
  return action;
}

export function desiredStatusForOperation(
  kind: LabControlOperationKind,
): EnvironmentStatus | "DESTROYED" {
  switch (kind) {
    case "CREATE":
    case "START":
    case "RESTART":
    case "RESUME":
    case "RESET":
    case "RESTORE":
      return "RUNNING";
    case "STOP":
    case "DESTROY":
    case "EXPIRE":
      return "STOPPED";
    case "PAUSE":
      return "PAUSED";
    case "SNAPSHOT":
      return "RUNNING";
    case "RECONCILE":
      return "RUNNING";
  }
}

export type ReconciliationObservation = {
  exists: boolean;
  instanceId: string;
  environmentId: string;
  status: EnvironmentStatus;
  runtimeNodeId: string | null;
};

export type ReconciliationDecision =
  | { kind: "CONFIRMED"; status: EnvironmentStatus; reason: string }
  | { kind: "NOT_PROVEN"; reason: string }
  | { kind: "CONFLICT"; reason: string };

export function reconcileOperation(
  operation: Pick<LabControlOperation, "kind" | "instanceId" | "status">,
  observation: ReconciliationObservation | null,
): ReconciliationDecision {
  if (operation.status !== "UNKNOWN")
    return { kind: "NOT_PROVEN", reason: "Operation is not awaiting reconciliation." };
  if (!observation) {
    return operation.kind === "DESTROY" || operation.kind === "EXPIRE"
      ? {
          kind: "CONFIRMED",
          status: "STOPPED",
          reason: "Runtime is absent after destructive operation.",
        }
      : { kind: "NOT_PROVEN", reason: "Runtime is absent; outcome cannot be inferred safely." };
  }
  if (observation.instanceId !== operation.instanceId)
    return { kind: "CONFLICT", reason: "Observed instance does not match operation." };
  const desired = desiredStatusForOperation(operation.kind);
  if (desired !== "DESTROYED" && observation.status === desired) {
    return {
      kind: "CONFIRMED",
      status: observation.status,
      reason: `Observed runtime state matches ${desired}.`,
    };
  }
  return {
    kind: "NOT_PROVEN",
    reason: `Observed runtime state ${observation.status} does not prove ${desired}.`,
  };
}

export type ExpirationDecision = "KEEP" | "EXPIRE";
export function expirationDecision(input: {
  status: EnvironmentStatus;
  expiresAt: string | null;
  now: Date;
}): ExpirationDecision {
  if (input.status === "STOPPED" || input.status === "EXPIRED") return "KEEP";
  if (!input.expiresAt) return "KEEP";
  return new Date(input.expiresAt).getTime() <= input.now.getTime() ? "EXPIRE" : "KEEP";
}

export function refreshExpiry(now: Date, policy: ResourcePolicy): string {
  return new Date(now.getTime() + policy.idleExpiryMs).toISOString();
}

export function resourcePolicyFingerprint(policy: ResourcePolicy): string {
  return [
    policy.executionTimeoutMs,
    policy.idleExpiryMs,
    policy.cpuMillicores,
    policy.memoryMiB,
    policy.storageMiB,
    policy.maxProcesses,
    policy.maxOpenFiles,
    policy.maxOutputBytes,
    policy.network,
    ...policy.egressAllowlist,
    policy.allowPrivilegeEscalation,
    policy.allowHostFilesystem,
  ].join("|");
}

export function isTerminalOperation(status: LabControlOperationStatus): boolean {
  return terminal.has(status);
}

export function operationIsRecoverable(
  operation: Pick<LabControlOperation, "status" | "attempt">,
  maxAttempts = 3,
): boolean {
  return (
    operation.status === "UNKNOWN" ||
    (operation.status === "FAILED" && operation.attempt < maxAttempts)
  );
}

export class InMemoryLabControlPlane {
  private readonly operations = new Map<string, LabControlOperation>();
  private readonly byKey = new Map<string, string>();

  begin(input: {
    operationId?: string;
    idempotencyKey: string;
    instanceId: string;
    userId: string;
    kind: LabControlOperationKind;
    now?: Date;
  }): LabControlOperation {
    if (!input.idempotencyKey.trim()) throw new Error("Lab operation idempotency key is required.");
    if (!input.instanceId || !input.userId) throw new Error("Lab operation ownership is required.");
    const existingId = this.byKey.get(`${input.userId}:${input.idempotencyKey}`);
    if (existingId) {
      const existing = this.operations.get(existingId)!;
      if (existing.instanceId !== input.instanceId || existing.kind !== input.kind) {
        throw new Error("Idempotency key is already bound to another lab operation.");
      }
      return { ...existing };
    }
    const now = input.now ?? new Date();
    const operation: LabControlOperation = {
      operationId: input.operationId ?? crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      instanceId: input.instanceId,
      userId: input.userId,
      kind: input.kind,
      status: "QUEUED",
      attempt: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      leaseUntil: null,
      workerId: null,
      resultRef: null,
      error: null,
    };
    this.operations.set(operation.operationId, operation);
    this.byKey.set(`${input.userId}:${input.idempotencyKey}`, operation.operationId);
    return { ...operation };
  }

  claim(
    operationId: string,
    workerId: string,
    leaseMs = 30_000,
    now = new Date(),
  ): LabControlOperation | null {
    if (!workerId.trim() || leaseMs < 1_000 || leaseMs > 300_000)
      throw new Error("Invalid control operation lease.");
    const op = this.operations.get(operationId);
    if (!op || isTerminalOperation(op.status)) return null;
    if (
      op.status === "RUNNING" &&
      op.leaseUntil &&
      new Date(op.leaseUntil).getTime() > now.getTime()
    )
      return null;
    op.status = "RUNNING";
    op.attempt += 1;
    op.workerId = workerId;
    op.leaseUntil = new Date(now.getTime() + leaseMs).toISOString();
    op.updatedAt = now.toISOString();
    op.error = null;
    return { ...op };
  }

  heartbeat(
    operationId: string,
    workerId: string,
    leaseMs = 30_000,
    now = new Date(),
  ): LabControlOperation | null {
    const op = this.operations.get(operationId);
    if (!op || op.status !== "RUNNING" || op.workerId !== workerId || !op.leaseUntil) return null;
    if (new Date(op.leaseUntil).getTime() <= now.getTime()) return null;
    op.leaseUntil = new Date(now.getTime() + leaseMs).toISOString();
    op.updatedAt = now.toISOString();
    return { ...op };
  }

  complete(
    operationId: string,
    workerId: string,
    resultRef: string | null = null,
    now = new Date(),
  ): LabControlOperation | null {
    const op = this.ownedRunning(operationId, workerId, now);
    if (!op) return null;
    op.status = "SUCCEEDED";
    op.leaseUntil = null;
    op.workerId = null;
    op.resultRef = resultRef;
    op.updatedAt = now.toISOString();
    return { ...op };
  }

  fail(
    operationId: string,
    workerId: string,
    error: string,
    now = new Date(),
  ): LabControlOperation | null {
    const op = this.ownedRunning(operationId, workerId, now);
    if (!op) return null;
    op.status = "FAILED";
    op.leaseUntil = null;
    op.workerId = null;
    op.error = error.slice(0, 2000);
    op.updatedAt = now.toISOString();
    return { ...op };
  }

  recoverExpired(now = new Date()): LabControlOperation[] {
    const recovered: LabControlOperation[] = [];
    for (const op of this.operations.values()) {
      if (
        op.status !== "RUNNING" ||
        !op.leaseUntil ||
        new Date(op.leaseUntil).getTime() > now.getTime()
      )
        continue;
      op.status = "UNKNOWN";
      op.leaseUntil = null;
      op.workerId = null;
      op.error = "Control operation lease expired; runtime reconciliation is required.";
      op.updatedAt = now.toISOString();
      recovered.push({ ...op });
    }
    return recovered;
  }

  get(operationId: string): LabControlOperation | null {
    const op = this.operations.get(operationId);
    return op ? { ...op } : null;
  }

  private ownedRunning(
    operationId: string,
    workerId: string,
    now: Date,
  ): LabControlOperation | null {
    const op = this.operations.get(operationId);
    if (!op || op.status !== "RUNNING" || op.workerId !== workerId || !op.leaseUntil) return null;
    return new Date(op.leaseUntil).getTime() > now.getTime() ? op : null;
  }
}

export type LabHealthDecision = "HEALTHY" | "STALE" | "UNSAFE";

export function evaluateRuntimeHealth(input: {
  healthy: boolean;
  ready: boolean;
  checkedAt: string;
  now: Date;
  maxAgeMs?: number;
  security: {
    networkIsolationEnforced: boolean;
    hostFilesystemBlocked: boolean;
    privilegeEscalationBlocked: boolean;
    metadataAccessBlocked: boolean;
  };
}): LabHealthDecision {
  if (
    !input.security.networkIsolationEnforced ||
    !input.security.hostFilesystemBlocked ||
    !input.security.privilegeEscalationBlocked ||
    !input.security.metadataAccessBlocked
  )
    return "UNSAFE";
  const maxAgeMs = input.maxAgeMs ?? 30_000;
  const age = input.now.getTime() - new Date(input.checkedAt).getTime();
  if (age < 0 || age > maxAgeMs) return "STALE";
  return input.healthy && input.ready ? "HEALTHY" : "STALE";
}

export function assertResourcePolicyWithinV44Limits(policy: ResourcePolicy): void {
  if (
    !Number.isInteger(policy.executionTimeoutMs) ||
    policy.executionTimeoutMs < 1_000 ||
    policy.executionTimeoutMs > 120_000
  )
    throw new Error("Execution timeout is outside the V44 limit.");
  if (
    !Number.isInteger(policy.idleExpiryMs) ||
    policy.idleExpiryMs < 60_000 ||
    policy.idleExpiryMs > 86_400_000
  )
    throw new Error("Idle expiry is outside the V44 limit.");
  if (
    !Number.isInteger(policy.cpuMillicores) ||
    policy.cpuMillicores < 100 ||
    policy.cpuMillicores > 4_000
  )
    throw new Error("CPU limit is outside the V44 limit.");
  if (!Number.isInteger(policy.memoryMiB) || policy.memoryMiB < 128 || policy.memoryMiB > 8_192)
    throw new Error("Memory limit is outside the V44 limit.");
  if (!Number.isInteger(policy.storageMiB) || policy.storageMiB < 64 || policy.storageMiB > 16_384)
    throw new Error("Storage limit is outside the V44 limit.");
  if (
    !Number.isInteger(policy.maxProcesses) ||
    policy.maxProcesses < 1 ||
    policy.maxProcesses > 512
  )
    throw new Error("Process limit is outside the V44 limit.");
  if (
    !Number.isInteger(policy.maxOpenFiles) ||
    policy.maxOpenFiles < 32 ||
    policy.maxOpenFiles > 8_192
  )
    throw new Error("Open-file limit is outside the V44 limit.");
  if (
    !Number.isInteger(policy.maxOutputBytes) ||
    policy.maxOutputBytes < 1_024 ||
    policy.maxOutputBytes > 1_048_576
  )
    throw new Error("Output limit is outside the V44 limit.");
  if (policy.allowPrivilegeEscalation !== false || policy.allowHostFilesystem !== false)
    throw new Error("Unsafe resource policy.");
  if (policy.network === "egress-allowlist" && policy.egressAllowlist.length === 0)
    throw new Error("Egress requires an explicit allowlist.");
}
