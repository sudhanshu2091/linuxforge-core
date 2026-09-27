/**
 * v18 Runtime Infrastructure Service protocol.
 *
 * This is the authenticated request/reconciliation boundary between the
 * control plane and a VM/microVM runtime service. It deliberately contains
 * no hypervisor-specific code.
 */
import type {
  RuntimeOperation,
  RuntimeOperationKind,
  RuntimeOperationStatus,
} from "./runtime-infrastructure";

export type RuntimeServiceRequest = {
  method: string;
  path: string;
  timestampMs: number;
  nonce: string;
  body: string;
  operationId: string;
  environmentId: string;
  nodeId: string;
  idempotencyKey: string;
};

export type RuntimeServiceSignature = {
  keyId: string;
  signature: string;
};

export type RuntimeServiceAuthPolicy = {
  maxClockSkewMs: number;
  nonceTtlMs: number;
};

export type RuntimeObservedState = {
  exists: boolean;
  environmentId: string;
  nodeId: string;
  state: "CREATING" | "READY" | "RUNNING" | "PAUSED" | "STOPPED" | "ERROR";
};

export type RuntimeReconciliationResult = {
  status: "SUCCEEDED" | "UNKNOWN" | "IGNORED";
  reason: string;
};

const encoder = new TextEncoder();

function canonical(request: RuntimeServiceRequest): string {
  return [
    request.method.toUpperCase(),
    request.path,
    String(request.timestampMs),
    request.nonce,
    request.operationId,
    request.environmentId,
    request.nodeId,
    request.idempotencyKey,
    request.body,
  ].join("\n");
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signRuntimeRequest(
  request: RuntimeServiceRequest,
  secret: string,
): Promise<RuntimeServiceSignature> {
  if (!secret) throw new Error("Runtime service signing secret is required.");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(canonical(request)));
  return { keyId: request.nodeId, signature: hex(signature) };
}

export class RuntimeRequestAuthenticator {
  private readonly seen = new Map<string, number>();
  private readonly policy: RuntimeServiceAuthPolicy;

  constructor(policy: RuntimeServiceAuthPolicy = { maxClockSkewMs: 30_000, nonceTtlMs: 60_000 }) {
    if (policy.maxClockSkewMs < 1_000 || policy.nonceTtlMs < policy.maxClockSkewMs) {
      throw new Error("Invalid runtime request authentication policy.");
    }
    this.policy = { ...policy };
  }

  async verify(
    request: RuntimeServiceRequest,
    auth: RuntimeServiceSignature,
    secret: string,
    nowMs: number,
  ): Promise<void> {
    if (
      !request.operationId ||
      !request.environmentId ||
      !request.nodeId ||
      !request.idempotencyKey
    ) {
      throw new Error("Runtime request identity is incomplete.");
    }
    if (auth.keyId !== request.nodeId) throw new Error("Runtime request key identity mismatch.");
    if (Math.abs(nowMs - request.timestampMs) > this.policy.maxClockSkewMs) {
      throw new Error("Runtime request timestamp is outside the allowed clock skew.");
    }
    this.prune(nowMs);
    if (this.seen.has(request.nonce))
      throw new Error("Runtime request nonce has already been used.");
    const expected = await signRuntimeRequest(request, secret);
    if (!timingSafeEqual(expected.signature, auth.signature))
      throw new Error("Runtime request signature is invalid.");
    this.seen.set(request.nonce, nowMs + this.policy.nonceTtlMs);
  }

  private prune(nowMs: number): void {
    for (const [nonce, expiresAt] of this.seen) if (expiresAt <= nowMs) this.seen.delete(nonce);
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const desiredState: Record<RuntimeOperationKind, RuntimeObservedState["state"] | "DESTROYED"> = {
  LAUNCH: "RUNNING",
  START: "RUNNING",
  STOP: "STOPPED",
  RESET: "RUNNING",
  PAUSE: "PAUSED",
  RESUME: "RUNNING",
  SNAPSHOT: "RUNNING",
  RESTORE: "RUNNING",
  DESTROY: "DESTROYED",
};

export function reconcileRuntimeOperation(
  operation: Pick<RuntimeOperation, "kind" | "environmentId" | "nodeId" | "status">,
  observed: RuntimeObservedState | null,
): RuntimeReconciliationResult {
  if (operation.status !== "UNKNOWN")
    return { status: "IGNORED", reason: "Operation is not awaiting reconciliation." };
  if (!observed) {
    return operation.kind === "DESTROY"
      ? {
          status: "SUCCEEDED",
          reason: "Runtime environment is absent after destroy reconciliation.",
        }
      : {
          status: "UNKNOWN",
          reason: "Runtime environment is absent; outcome cannot be inferred safely.",
        };
  }
  if (observed.environmentId !== operation.environmentId)
    return { status: "UNKNOWN", reason: "Observed environment does not match operation." };
  if (operation.nodeId && observed.nodeId !== operation.nodeId)
    return { status: "UNKNOWN", reason: "Observed runtime node does not match operation." };
  const desired = desiredState[operation.kind];
  if (desired !== "DESTROYED" && observed.state === desired) {
    return { status: "SUCCEEDED", reason: `Observed runtime state matches ${desired}.` };
  }
  return {
    status: "UNKNOWN",
    reason: `Observed runtime state ${observed.state} does not prove ${desired}.`,
  };
}

export function isRuntimeOperationTerminal(status: RuntimeOperationStatus): boolean {
  return status === "SUCCEEDED" || status === "FAILED" || status === "CANCELLED";
}
