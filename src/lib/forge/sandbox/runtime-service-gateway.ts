/**
 * v20 Runtime Service HTTP gateway.
 *
 * This module turns the v18 signed-message protocol into an actual HTTP
 * boundary. It deliberately does not implement a hypervisor. A RuntimeService
 * adapter owns the runtime-specific operation and observation calls.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { RuntimeOperationKind, RuntimeOperationStatus } from "./runtime-infrastructure";
import type {
  RuntimeObservedState,
  RuntimeServiceAuthPolicy,
  RuntimeServiceRequest,
  RuntimeServiceSignature,
} from "./runtime-service";
import { RuntimeRequestAuthenticator, reconcileRuntimeOperation } from "./runtime-service";

export type RuntimeServiceGatewayHeaders = {
  timestamp: string;
  nonce: string;
  operationId: string;
  environmentId: string;
  nodeId: string;
  idempotencyKey: string;
  keyId: string;
  signature: string;
};

export type RuntimeServiceGatewayOperation = {
  operationId: string;
  idempotencyKey: string;
  kind: RuntimeOperationKind;
  environmentId: string;
  nodeId: string;
  status: RuntimeOperationStatus;
  resultRef: string | null;
  error: string | null;
};

export type RuntimeServiceGatewayAdapter = {
  execute(
    operation: RuntimeServiceGatewayOperation,
    body: unknown,
  ): Promise<{ resultRef?: string | null }>;
  observe(environmentId: string, nodeId: string): Promise<RuntimeObservedState | null>;
};

export type RuntimeServiceGatewayStore = {
  get(operationId: string): Promise<RuntimeServiceGatewayOperation | null>;
  getByIdempotencyKey(idempotencyKey: string): Promise<RuntimeServiceGatewayOperation | null>;
  put(operation: RuntimeServiceGatewayOperation): Promise<void>;
  claim(operationId: string): Promise<RuntimeServiceGatewayOperation | null>;
  complete(
    operationId: string,
    resultRef: string | null,
  ): Promise<RuntimeServiceGatewayOperation | null>;
  reconcileSuccess(
    operationId: string,
    resultRef: string | null,
  ): Promise<RuntimeServiceGatewayOperation | null>;
  fail(operationId: string, error: string): Promise<RuntimeServiceGatewayOperation | null>;
};

export type RuntimeServiceNonceStore = {
  claim(
    nonce: string,
    nodeId: string,
    operationId: string,
    expiresAtMs: number,
    nowMs: number,
  ): Promise<boolean>;
};

export type RuntimeServiceGatewayConfig = {
  nodeId: string;
  secret: string;
  authPolicy?: RuntimeServiceAuthPolicy;
  store: RuntimeServiceGatewayStore;
  nonces: RuntimeServiceNonceStore;
  adapter: RuntimeServiceGatewayAdapter;
  now?: () => number;
};

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const MAX_BODY_BYTES = 64 * 1024;
const auth = (headers: Headers): RuntimeServiceGatewayHeaders => ({
  timestamp: headers.get("x-forge-timestamp") ?? "",
  nonce: headers.get("x-forge-nonce") ?? "",
  operationId: headers.get("x-forge-operation-id") ?? "",
  environmentId: headers.get("x-forge-environment-id") ?? "",
  nodeId: headers.get("x-forge-node-id") ?? "",
  idempotencyKey: headers.get("x-forge-idempotency-key") ?? "",
  keyId: headers.get("x-forge-key-id") ?? "",
  signature: headers.get("x-forge-signature") ?? "",
});

function json(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}

function error(status: number, message: string): Response {
  return json(status, { ok: false, error: { message } });
}

function ok(value: unknown, status = 200): Response {
  return json(status, { ok: true, value });
}

function operationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/v1\/operations\/([^/]+)(?:\/reconcile)?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function parseKind(body: unknown): RuntimeOperationKind {
  if (!body || typeof body !== "object" || typeof (body as { kind?: unknown }).kind !== "string") {
    throw new Error("Runtime operation kind is required.");
  }
  const kind = (body as { kind: string }).kind.toUpperCase();
  const allowed: RuntimeOperationKind[] = [
    "LAUNCH",
    "START",
    "STOP",
    "RESET",
    "PAUSE",
    "RESUME",
    "SNAPSHOT",
    "RESTORE",
    "DESTROY",
  ];
  if (!allowed.includes(kind as RuntimeOperationKind))
    throw new Error("Unsupported runtime operation kind.");
  return kind as RuntimeOperationKind;
}

function asGatewayOperation(
  input: unknown,
  config: RuntimeServiceGatewayConfig,
  headers: RuntimeServiceGatewayHeaders,
): RuntimeServiceGatewayOperation {
  const kind = parseKind(input);
  return {
    operationId: headers.operationId,
    idempotencyKey: headers.idempotencyKey,
    kind,
    environmentId: headers.environmentId,
    nodeId: config.nodeId,
    status: "QUEUED",
    resultRef: null,
    error: null,
  };
}

export class InMemoryRuntimeServiceStore implements RuntimeServiceGatewayStore {
  private readonly operations = new Map<string, RuntimeServiceGatewayOperation>();
  private readonly byKey = new Map<string, string>();

  async get(operationId: string): Promise<RuntimeServiceGatewayOperation | null> {
    const value = this.operations.get(operationId);
    return value ? { ...value } : null;
  }

  async getByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<RuntimeServiceGatewayOperation | null> {
    const id = this.byKey.get(idempotencyKey);
    return id ? this.get(id) : null;
  }

  async put(operation: RuntimeServiceGatewayOperation): Promise<void> {
    if (this.operations.has(operation.operationId))
      throw new Error("Runtime operation already exists.");
    const existing = this.byKey.get(operation.idempotencyKey);
    if (existing && existing !== operation.operationId)
      throw new Error("Runtime idempotency key is already bound.");
    this.operations.set(operation.operationId, { ...operation });
    this.byKey.set(operation.idempotencyKey, operation.operationId);
  }

  async claim(operationId: string): Promise<RuntimeServiceGatewayOperation | null> {
    const op = this.operations.get(operationId);
    if (!op || op.status !== "QUEUED") return null;
    op.status = "RUNNING";
    return { ...op };
  }

  async complete(
    operationId: string,
    resultRef: string | null,
  ): Promise<RuntimeServiceGatewayOperation | null> {
    const op = this.operations.get(operationId);
    if (!op || op.status !== "RUNNING") return null;
    op.status = "SUCCEEDED";
    op.resultRef = resultRef;
    return { ...op };
  }

  async reconcileSuccess(
    operationId: string,
    resultRef: string | null,
  ): Promise<RuntimeServiceGatewayOperation | null> {
    const op = this.operations.get(operationId);
    if (!op || op.status !== "UNKNOWN") return null;
    op.status = "SUCCEEDED";
    op.resultRef = resultRef;
    op.error = null;
    return { ...op };
  }

  async fail(operationId: string, message: string): Promise<RuntimeServiceGatewayOperation | null> {
    const op = this.operations.get(operationId);
    if (!op || op.status !== "RUNNING") return null;
    op.status = "FAILED";
    op.error = message.slice(0, 2000);
    return { ...op };
  }
}

export class InMemoryRuntimeNonceStore implements RuntimeServiceNonceStore {
  private readonly seen = new Map<string, number>();

  async claim(
    nonce: string,
    _nodeId: string,
    _operationId: string,
    expiresAtMs: number,
    nowMs: number,
  ): Promise<boolean> {
    for (const [key, expires] of this.seen) if (expires <= nowMs) this.seen.delete(key);
    if (!nonce || expiresAtMs <= nowMs || this.seen.has(nonce)) return false;
    this.seen.set(nonce, expiresAtMs);
    return true;
  }
}

type Db = SupabaseClient<Database>;
type RuntimeOperationRow = Database["public"]["Tables"]["runtime_operations"]["Row"];

const toGatewayOperation = (row: RuntimeOperationRow): RuntimeServiceGatewayOperation => ({
  operationId: row.operation_id,
  idempotencyKey: row.idempotency_key,
  kind: row.kind as RuntimeOperationKind,
  environmentId: row.environment_id,
  nodeId: row.node_id ?? "",
  status: row.status as RuntimeOperationStatus,
  resultRef: row.result_ref,
  error: row.error,
});

/** Durable gateway store backed by the v17/v20 service-role RPC boundary. */
export class SupabaseRuntimeServiceStore implements RuntimeServiceGatewayStore {
  constructor(
    private readonly db: Db,
    private readonly ownerId: string,
    private readonly leaseSeconds = 30,
  ) {}

  async get(operationId: string): Promise<RuntimeServiceGatewayOperation | null> {
    const result = await this.db
      .from("runtime_operations")
      .select("*")
      .eq("operation_id", operationId)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    return result.data ? toGatewayOperation(result.data) : null;
  }

  async getByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<RuntimeServiceGatewayOperation | null> {
    const result = await this.db
      .from("runtime_operations")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    return result.data ? toGatewayOperation(result.data) : null;
  }

  async put(operation: RuntimeServiceGatewayOperation): Promise<void> {
    const result = await this.db.rpc("begin_runtime_operation", {
      p_operation_id: operation.operationId,
      p_idempotency_key: operation.idempotencyKey,
      p_kind: operation.kind,
      p_environment_id: operation.environmentId,
      p_node_id: operation.nodeId,
    });
    if (result.error) throw new Error(result.error.message);
  }

  async claim(operationId: string): Promise<RuntimeServiceGatewayOperation | null> {
    const result = await this.db.rpc("claim_runtime_operation", {
      p_operation_id: operationId,
      p_owner_id: this.ownerId,
      p_lease_seconds: this.leaseSeconds,
    });
    if (result.error) throw new Error(result.error.message);
    return result.data?.[0] ? toGatewayOperation(result.data[0]) : null;
  }

  async complete(
    operationId: string,
    resultRef: string | null,
  ): Promise<RuntimeServiceGatewayOperation | null> {
    const result = await this.db.rpc("finish_runtime_operation", {
      p_operation_id: operationId,
      p_owner_id: this.ownerId,
      p_status: "SUCCEEDED",
      p_result_ref: resultRef,
    });
    if (result.error) throw new Error(result.error.message);
    return result.data?.[0] ? toGatewayOperation(result.data[0]) : null;
  }

  async reconcileSuccess(
    operationId: string,
    resultRef: string | null,
  ): Promise<RuntimeServiceGatewayOperation | null> {
    const result = await this.db.rpc("reconcile_runtime_operation", {
      p_operation_id: operationId,
      p_result_ref: resultRef,
    });
    if (result.error) throw new Error(result.error.message);
    return result.data?.[0] ? toGatewayOperation(result.data[0]) : null;
  }

  async fail(operationId: string, message: string): Promise<RuntimeServiceGatewayOperation | null> {
    const result = await this.db.rpc("finish_runtime_operation", {
      p_operation_id: operationId,
      p_owner_id: this.ownerId,
      p_status: "FAILED",
      p_error: message.slice(0, 2000),
    });
    if (result.error) throw new Error(result.error.message);
    return result.data?.[0] ? toGatewayOperation(result.data[0]) : null;
  }
}

/** Durable nonce replay-protection adapter. */
export class SupabaseRuntimeNonceStore implements RuntimeServiceNonceStore {
  constructor(private readonly db: Db) {}

  async claim(
    nonce: string,
    nodeId: string,
    operationId: string,
    expiresAtMs: number,
    nowMs: number,
  ): Promise<boolean> {
    const result = await this.db.rpc("claim_runtime_request_nonce", {
      p_nonce: nonce,
      p_node_id: nodeId,
      p_operation_id: operationId,
      p_expires_at: new Date(expiresAtMs).toISOString(),
      p_now: new Date(nowMs).toISOString(),
    });
    if (result.error) throw new Error(result.error.message);
    return result.data === true;
  }
}

export class RuntimeServiceGateway {
  private readonly config: RuntimeServiceGatewayConfig;
  private readonly authenticator: RuntimeRequestAuthenticator;
  private readonly ownerId: string;

  constructor(config: RuntimeServiceGatewayConfig) {
    this.config = { ...config, now: config.now ?? (() => Date.now()) };
    this.authenticator = new RuntimeRequestAuthenticator(config.authPolicy);
    this.ownerId = `runtime-gateway:${config.nodeId}`;
    if (!config.nodeId || !config.secret)
      throw new Error("Runtime service node identity and secret are required.");
  }

  async fetch(request: Request): Promise<Response> {
    const nowMs = this.config.now!();
    const headers = auth(request.headers);
    const body = request.method === "GET" ? "" : await this.readBody(request);
    const timestampMs = Number(headers.timestamp);
    if (!Number.isSafeInteger(timestampMs))
      return error(401, "Runtime request timestamp is invalid.");
    if (headers.nodeId !== this.config.nodeId)
      return error(401, "Runtime request node identity mismatch.");

    const signed: RuntimeServiceRequest = {
      method: request.method,
      path: new URL(request.url).pathname,
      timestampMs,
      nonce: headers.nonce,
      body,
      operationId: headers.operationId,
      environmentId: headers.environmentId,
      nodeId: headers.nodeId,
      idempotencyKey: headers.idempotencyKey,
    };
    const signature: RuntimeServiceSignature = {
      keyId: headers.keyId,
      signature: headers.signature,
    };
    try {
      await this.authenticator.verify(signed, signature, this.config.secret, nowMs);
      const nonceTtlMs = this.config.authPolicy?.nonceTtlMs ?? 60_000;
      if (
        !(await this.config.nonces.claim(
          headers.nonce,
          headers.nodeId,
          headers.operationId,
          nowMs + nonceTtlMs,
          nowMs,
        ))
      ) {
        return error(409, "Runtime request nonce has already been used.");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Runtime request authentication failed.";
      if (message === "Runtime request nonce has already been used.") {
        return error(409, message);
      }
      return error(401, message);
    }

    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/v1/health") {
        return ok({ nodeId: this.config.nodeId, healthy: true, ready: true });
      }
      if (request.method === "POST" && url.pathname === "/v1/operations")
        return await this.createOperation(body, headers);
      const operationId = operationIdFromPath(url.pathname);
      if (operationId && request.method === "GET") return await this.getOperation(operationId);
      if (operationId && request.method === "POST" && url.pathname.endsWith("/reconcile"))
        return await this.reconcile(operationId);
      if (operationId && request.method === "POST") return await this.execute(operationId, body);
      return error(404, "Runtime service route not found.");
    } catch (e) {
      return error(400, e instanceof Error ? e.message : "Runtime request is invalid.");
    }
  }

  private async readBody(request: Request): Promise<string> {
    const length = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(length) && length > MAX_BODY_BYTES)
      throw new Error("Runtime request body is too large.");
    // Clone so the gateway can safely be exercised with the same signed Request
    // object more than once (useful for replay/idempotency tests and harmless for
    // normal Fetch callers). The original request body remains untouched.
    const body = await request.clone().text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES)
      throw new Error("Runtime request body is too large.");
    return body;
  }

  private async createOperation(
    body: string,
    headers: RuntimeServiceGatewayHeaders,
  ): Promise<Response> {
    let payload: unknown;
    try {
      payload = body ? JSON.parse(body) : {};
    } catch {
      return error(400, "Runtime request body must be valid JSON.");
    }
    const existing = await this.config.store.getByIdempotencyKey(headers.idempotencyKey);
    if (existing) {
      if (
        existing.operationId !== headers.operationId ||
        existing.environmentId !== headers.environmentId ||
        existing.nodeId !== this.config.nodeId
      ) {
        return error(409, "Runtime idempotency key is bound to different operation identity.");
      }
      return ok(existing);
    }
    const operation = asGatewayOperation(payload, this.config, headers);
    await this.config.store.put(operation);
    return ok(operation, 202);
  }

  private async getOperation(operationId: string): Promise<Response> {
    const operation = await this.config.store.get(operationId);
    return operation ? ok(operation) : error(404, "Runtime operation not found.");
  }

  private async execute(operationId: string, body: string): Promise<Response> {
    const operation = await this.config.store.claim(operationId);
    if (!operation) {
      const current = await this.config.store.get(operationId);
      return current ? ok(current) : error(404, "Runtime operation not found.");
    }
    try {
      const payload = body ? JSON.parse(body) : {};
      const result = await this.config.adapter.execute(operation, payload);
      return ok(await this.config.store.complete(operationId, result.resultRef ?? null));
    } catch (e) {
      return ok(
        await this.config.store.fail(
          operationId,
          e instanceof Error ? e.message : "Runtime operation failed.",
        ),
      );
    }
  }

  private async reconcile(operationId: string): Promise<Response> {
    const operation = await this.config.store.get(operationId);
    if (!operation) return error(404, "Runtime operation not found.");
    if (operation.status !== "UNKNOWN") return ok({ status: "IGNORED", operation });
    const observed = await this.config.adapter.observe(operation.environmentId, operation.nodeId);
    const result = reconcileRuntimeOperation(operation, observed);
    if (result.status === "SUCCEEDED") {
      await this.config.store.reconcileSuccess(operationId, operation.resultRef);
    }
    return ok({ ...result, operation: await this.config.store.get(operationId) });
  }
}
