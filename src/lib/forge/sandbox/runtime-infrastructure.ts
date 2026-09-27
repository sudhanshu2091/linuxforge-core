/**
 * v17 runtime-infrastructure coordination.
 *
 * This is the control-plane protocol immediately above a VM/microVM runtime
 * service. It models two durable concepts that must survive process crashes:
 *
 * 1. node leases: a capacity reservation owned by one control-plane worker;
 * 2. operation records: idempotent lifecycle intents with execution leases.
 *
 * The in-memory implementation is deterministic for tests. PostgreSQL is the
 * production persistence target (see the v17 migration).
 */
import type { RuntimeClass } from "./contract";
import type { RuntimeNode } from "./runtime-backend";

export type RuntimeNodeStatus = "ACTIVE" | "DRAINING" | "DISABLED" | "OFFLINE";

export type RuntimeNodeLease = {
  leaseId: string;
  nodeId: string;
  ownerId: string;
  acquiredAt: string;
  expiresAt: string;
  heartbeatAt: string;
};

export type RuntimeNodeRegistration = RuntimeNode & {
  status: RuntimeNodeStatus;
  lastHeartbeatAt: string;
  heartbeatTtlMs: number;
  registrationGeneration: number;
};

export type RuntimeOperationKind =
  "LAUNCH" | "START" | "STOP" | "RESET" | "PAUSE" | "RESUME" | "SNAPSHOT" | "RESTORE" | "DESTROY";

export type RuntimeOperationStatus =
  "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "UNKNOWN";

export type RuntimeOperation = {
  operationId: string;
  idempotencyKey: string;
  kind: RuntimeOperationKind;
  environmentId: string;
  nodeId: string | null;
  status: RuntimeOperationStatus;
  attempt: number;
  createdAt: string;
  updatedAt: string;
  leaseUntil: string | null;
  ownerId: string | null;
  resultRef: string | null;
  error: string | null;
};

export type RuntimeNodeRegistryV17 = {
  register(node: RuntimeNode, now?: Date): RuntimeNodeRegistration;
  heartbeatNode(nodeId: string, generation: number, now?: Date): RuntimeNodeRegistration;
  markExpired(now?: Date): RuntimeNodeRegistration[];
  getNode(nodeId: string, now?: Date): RuntimeNodeRegistration | null;
  select(runtimeClass: RuntimeClass, now?: Date): RuntimeNodeRegistration;
  acquireLease(nodeId: string, ownerId: string, leaseMs: number, now?: Date): RuntimeNodeLease;
  heartbeatLease(lease: RuntimeNodeLease, leaseMs: number, now?: Date): RuntimeNodeLease | null;
  releaseLease(lease: RuntimeNodeLease, now?: Date): boolean;
};

export type RuntimeOperationStoreV17 = {
  begin(input: {
    idempotencyKey: string;
    kind: RuntimeOperationKind;
    environmentId: string;
    nodeId?: string | null;
    now?: Date;
  }): RuntimeOperation;
  claim(operationId: string, ownerId: string, leaseMs: number, now?: Date): RuntimeOperation | null;
  heartbeat(
    operationId: string,
    ownerId: string,
    leaseMs: number,
    now?: Date,
  ): RuntimeOperation | null;
  complete(
    operationId: string,
    ownerId: string,
    resultRef?: string | null,
    now?: Date,
  ): RuntimeOperation | null;
  fail(operationId: string, ownerId: string, error: string, now?: Date): RuntimeOperation | null;
  recoverExpired(now?: Date): RuntimeOperation[];
  get(operationId: string): RuntimeOperation | null;
};

const iso = (date: Date) => date.toISOString();
const activeStatuses = new Set<RuntimeNodeStatus>(["ACTIVE", "DRAINING"]);
const terminalOperationStatuses = new Set<RuntimeOperationStatus>([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

function assertPositiveLease(leaseMs: number): void {
  if (!Number.isInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 300_000) {
    throw new Error("Runtime lease must be between 1 and 300 seconds.");
  }
}

export async function hashRuntimeCredential(secret: string): Promise<string> {
  if (!secret) throw new Error("Runtime credential is required.");
  const bytes = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class InMemoryRuntimeInfrastructure
  implements RuntimeNodeRegistryV17, RuntimeOperationStoreV17
{
  private readonly nodes = new Map<string, RuntimeNodeRegistration>();
  private readonly nodeLeases = new Map<string, RuntimeNodeLease>();
  private readonly operations = new Map<string, RuntimeOperation>();
  private readonly operationByKey = new Map<string, string>();

  register(node: RuntimeNode, now = new Date()): RuntimeNodeRegistration {
    if (this.nodes.has(node.nodeId))
      throw new Error(`Runtime node ${node.nodeId} is already registered.`);
    if (node.activeEnvironments < 0)
      throw new Error("Runtime node active count cannot be negative.");
    const registration: RuntimeNodeRegistration = {
      ...node,
      status: node.enabled ? "ACTIVE" : "DISABLED",
      lastHeartbeatAt: iso(now),
      heartbeatTtlMs: 30_000,
      registrationGeneration: 1,
      metadata: { ...node.metadata },
    };
    this.nodes.set(node.nodeId, registration);
    return this.copyNode(registration);
  }

  heartbeatNode(nodeId: string, generation: number, now = new Date()): RuntimeNodeRegistration {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Runtime node ${nodeId} is not registered.`);
    if (node.registrationGeneration !== generation)
      throw new Error("Runtime node registration generation is stale.");
    if (node.status === "DISABLED") throw new Error("Disabled runtime nodes cannot heartbeat.");
    const heartbeatAge = now.getTime() - new Date(node.lastHeartbeatAt).getTime();
    if (node.status === "OFFLINE" || heartbeatAge > node.heartbeatTtlMs) {
      node.status = "OFFLINE";
      node.enabled = false;
      throw new Error("Runtime node heartbeat is stale or expired.");
    }
    node.lastHeartbeatAt = iso(now);
    node.status = "ACTIVE";
    node.enabled = true;
    return this.copyNode(node);
  }

  markExpired(now = new Date()): RuntimeNodeRegistration[] {
    const expired: RuntimeNodeRegistration[] = [];
    for (const node of this.nodes.values()) {
      const age = now.getTime() - new Date(node.lastHeartbeatAt).getTime();
      if (activeStatuses.has(node.status) && age > node.heartbeatTtlMs) {
        node.status = "OFFLINE";
        node.enabled = false;
        expired.push(this.copyNode(node));
      }
    }
    return expired;
  }

  getNode(nodeId: string, now = new Date()): RuntimeNodeRegistration | null {
    this.markExpired(now);
    const node = this.nodes.get(nodeId);
    return node ? this.copyNode(node) : null;
  }

  select(runtimeClass: RuntimeClass, now = new Date()): RuntimeNodeRegistration {
    this.markExpired(now);
    const candidates = [...this.nodes.values()].filter((node) => {
      if (node.status !== "ACTIVE") return false;
      if (node.runtimeClass !== runtimeClass) return false;
      if (node.maxEnvironments !== null && node.activeEnvironments >= node.maxEnvironments)
        return false;
      return true;
    });
    const selected = candidates.sort((a, b) => {
      const capacityA =
        a.maxEnvironments === null
          ? Number.POSITIVE_INFINITY
          : a.maxEnvironments - a.activeEnvironments;
      const capacityB =
        b.maxEnvironments === null
          ? Number.POSITIVE_INFINITY
          : b.maxEnvironments - b.activeEnvironments;
      return (
        capacityB - capacityA ||
        a.activeEnvironments - b.activeEnvironments ||
        a.nodeId.localeCompare(b.nodeId)
      );
    })[0];
    if (!selected) throw new Error(`No active runtime node is available for ${runtimeClass}.`);
    return this.copyNode(selected);
  }

  acquireLease(
    nodeId: string,
    ownerId: string,
    leaseMs: number,
    now = new Date(),
  ): RuntimeNodeLease {
    assertPositiveLease(leaseMs);
    if (!ownerId) throw new Error("Runtime node lease owner is required.");
    this.markExpired(now);
    const node = this.nodes.get(nodeId);
    if (!node || node.status !== "ACTIVE") throw new Error("Runtime node is not active.");
    const existing = this.nodeLeases.get(nodeId);
    if (existing && new Date(existing.expiresAt).getTime() > now.getTime()) {
      throw new Error(`Runtime node ${nodeId} is already leased.`);
    }
    const lease: RuntimeNodeLease = {
      leaseId: crypto.randomUUID(),
      nodeId,
      ownerId,
      acquiredAt: iso(now),
      expiresAt: iso(new Date(now.getTime() + leaseMs)),
      heartbeatAt: iso(now),
    };
    this.nodeLeases.set(nodeId, lease);
    return { ...lease };
  }

  heartbeatLease(
    lease: RuntimeNodeLease,
    leaseMs: number,
    now = new Date(),
  ): RuntimeNodeLease | null {
    assertPositiveLease(leaseMs);
    const current = this.nodeLeases.get(lease.nodeId);
    if (!current || current.leaseId !== lease.leaseId || current.ownerId !== lease.ownerId)
      return null;
    if (new Date(current.expiresAt).getTime() <= now.getTime()) return null;
    current.heartbeatAt = iso(now);
    current.expiresAt = iso(new Date(now.getTime() + leaseMs));
    return { ...current };
  }

  releaseLease(lease: RuntimeNodeLease, now = new Date()): boolean {
    const current = this.nodeLeases.get(lease.nodeId);
    if (!current || current.leaseId !== lease.leaseId || current.ownerId !== lease.ownerId)
      return false;
    this.nodeLeases.delete(lease.nodeId);
    return true;
  }

  begin(input: {
    idempotencyKey: string;
    kind: RuntimeOperationKind;
    environmentId: string;
    nodeId?: string | null;
    now?: Date;
  }): RuntimeOperation {
    const now = input.now ?? new Date();
    if (!input.idempotencyKey.trim())
      throw new Error("Runtime operation idempotency key is required.");
    if (!input.environmentId) throw new Error("Runtime operation environment is required.");
    const existingId = this.operationByKey.get(input.idempotencyKey);
    if (existingId) {
      const existing = this.operations.get(existingId)!;
      if (existing.kind !== input.kind || existing.environmentId !== input.environmentId) {
        throw new Error("Idempotency key is already bound to a different runtime operation.");
      }
      return this.copyOperation(existing);
    }
    const operation: RuntimeOperation = {
      operationId: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      kind: input.kind,
      environmentId: input.environmentId,
      nodeId: input.nodeId ?? null,
      status: "QUEUED",
      attempt: 0,
      createdAt: iso(now),
      updatedAt: iso(now),
      leaseUntil: null,
      ownerId: null,
      resultRef: null,
      error: null,
    };
    this.operations.set(operation.operationId, operation);
    this.operationByKey.set(operation.idempotencyKey, operation.operationId);
    return this.copyOperation(operation);
  }

  claim(
    operationId: string,
    ownerId: string,
    leaseMs: number,
    now = new Date(),
  ): RuntimeOperation | null {
    assertPositiveLease(leaseMs);
    const op = this.operations.get(operationId);
    if (!op || terminalOperationStatuses.has(op.status)) return null;
    if (
      op.status === "RUNNING" &&
      op.leaseUntil &&
      new Date(op.leaseUntil).getTime() > now.getTime()
    )
      return null;
    op.status = "RUNNING";
    op.attempt += 1;
    op.ownerId = ownerId;
    op.leaseUntil = iso(new Date(now.getTime() + leaseMs));
    op.updatedAt = iso(now);
    op.error = null;
    return this.copyOperation(op);
  }

  heartbeat(
    operationId: string,
    ownerId: string,
    leaseMs: number,
    now = new Date(),
  ): RuntimeOperation | null {
    assertPositiveLease(leaseMs);
    const op = this.operations.get(operationId);
    if (!op || op.status !== "RUNNING" || op.ownerId !== ownerId || !op.leaseUntil) return null;
    if (new Date(op.leaseUntil).getTime() <= now.getTime()) return null;
    op.leaseUntil = iso(new Date(now.getTime() + leaseMs));
    op.updatedAt = iso(now);
    return this.copyOperation(op);
  }

  complete(
    operationId: string,
    ownerId: string,
    resultRef: string | null = null,
    now = new Date(),
  ): RuntimeOperation | null {
    const op = this.operations.get(operationId);
    if (!this.ownedRunning(op, ownerId, now)) return null;
    op.status = "SUCCEEDED";
    op.leaseUntil = null;
    op.ownerId = null;
    op.resultRef = resultRef;
    op.updatedAt = iso(now);
    return this.copyOperation(op);
  }

  fail(
    operationId: string,
    ownerId: string,
    error: string,
    now = new Date(),
  ): RuntimeOperation | null {
    const op = this.operations.get(operationId);
    if (!this.ownedRunning(op, ownerId, now)) return null;
    op.status = "FAILED";
    op.leaseUntil = null;
    op.ownerId = null;
    op.error = error.slice(0, 2000);
    op.updatedAt = iso(now);
    return this.copyOperation(op);
  }

  recoverExpired(now = new Date()): RuntimeOperation[] {
    const recovered: RuntimeOperation[] = [];
    for (const op of this.operations.values()) {
      if (
        op.status !== "RUNNING" ||
        !op.leaseUntil ||
        new Date(op.leaseUntil).getTime() > now.getTime()
      )
        continue;
      op.status = "UNKNOWN";
      op.leaseUntil = null;
      op.ownerId = null;
      op.error = "Runtime operation lease expired; outcome requires reconciliation.";
      op.updatedAt = iso(now);
      recovered.push(this.copyOperation(op));
    }
    return recovered;
  }

  get(operationId: string): RuntimeOperation | null {
    const op = this.operations.get(operationId);
    return op ? this.copyOperation(op) : null;
  }

  private ownedRunning(
    op: RuntimeOperation | undefined,
    ownerId: string,
    now: Date,
  ): op is RuntimeOperation {
    if (!op || op.status !== "RUNNING" || op.ownerId !== ownerId || !op.leaseUntil) return false;
    return new Date(op.leaseUntil).getTime() > now.getTime();
  }

  private copyNode(node: RuntimeNodeRegistration): RuntimeNodeRegistration {
    return { ...node, capabilities: { ...node.capabilities }, metadata: { ...node.metadata } };
  }

  private copyOperation(operation: RuntimeOperation): RuntimeOperation {
    return { ...operation };
  }
}
