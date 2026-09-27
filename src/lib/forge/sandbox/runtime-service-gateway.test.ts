import { describe, expect, it } from "vitest";
import {
  signRuntimeRequest,
  type RuntimeObservedState,
  type RuntimeServiceRequest,
} from "./runtime-service";
import {
  InMemoryRuntimeNonceStore,
  InMemoryRuntimeServiceStore,
  RuntimeServiceGateway,
} from "./runtime-service-gateway";

const secret = "test-secret";
const now = 1_700_000_000_000;

async function signedRequest(
  path: string,
  method: string,
  body: string,
  operationId: string,
  environmentId = "env-1",
  idempotencyKey = "idem-1",
  nonce = crypto.randomUUID(),
) {
  const request: RuntimeServiceRequest = {
    method,
    path,
    timestampMs: now,
    nonce,
    body,
    operationId,
    environmentId,
    nodeId: "node-1",
    idempotencyKey,
  };
  const signature = await signRuntimeRequest(request, secret);
  return new Request(`https://runtime.test${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-forge-timestamp": String(now),
      "x-forge-nonce": nonce,
      "x-forge-operation-id": operationId,
      "x-forge-environment-id": environmentId,
      "x-forge-node-id": "node-1",
      "x-forge-idempotency-key": idempotencyKey,
      "x-forge-key-id": signature.keyId,
      "x-forge-signature": signature.signature,
    },
    ...(method === "GET" ? {} : { body }),
  });
}

function gateway() {
  const store = new InMemoryRuntimeServiceStore();
  const nonces = new InMemoryRuntimeNonceStore();
  const observed: RuntimeObservedState = {
    exists: true,
    environmentId: "env-1",
    nodeId: "node-1",
    state: "RUNNING",
  };
  const service = new RuntimeServiceGateway({
    nodeId: "node-1",
    secret,
    store,
    nonces,
    now: () => now,
    adapter: {
      async execute() {
        return { resultRef: "runtime-1" };
      },
      async observe() {
        return observed;
      },
    },
  });
  return { service, store };
}

describe("v20 durable runtime service HTTP gateway", () => {
  it("serves health only after authenticating the request", async () => {
    const { service } = gateway();
    const request = await signedRequest(
      "/v1/health",
      "GET",
      "",
      crypto.randomUUID(),
      "env-1",
      "health-1",
    );
    const response = await service.fetch(request);
    expect(response.status).toBe(200);
    expect((await response.json()).value.healthy).toBe(true);
  });

  it("creates idempotent operations and returns the existing record", async () => {
    const { service } = gateway();
    const operationId = crypto.randomUUID();
    const body = JSON.stringify({ kind: "START" });
    const first = await service.fetch(
      await signedRequest("/v1/operations", "POST", body, operationId),
    );
    expect(first.status).toBe(202);
    const second = await service.fetch(
      await signedRequest("/v1/operations", "POST", body, operationId, "env-1", "idem-1"),
    );
    expect(second.status).toBe(200);
    expect((await second.json()).value.operationId).toBe(operationId);
  });

  it("rejects replayed signed requests", async () => {
    const { service } = gateway();
    const operationId = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    const request = await signedRequest(
      "/v1/operations",
      "POST",
      JSON.stringify({ kind: "START" }),
      operationId,
      "env-1",
      "idem-replay",
      nonce,
    );
    expect((await service.fetch(request)).status).toBe(202);
    expect((await service.fetch(request)).status).toBe(409);
  });

  it("executes a queued operation exactly once", async () => {
    const { service, store } = gateway();
    const operationId = crypto.randomUUID();
    await service.fetch(
      await signedRequest(
        "/v1/operations",
        "POST",
        JSON.stringify({ kind: "START" }),
        operationId,
        "env-1",
        "idem-exec",
      ),
    );
    const response = await service.fetch(
      await signedRequest(
        `/v1/operations/${operationId}`,
        "POST",
        "{}",
        operationId,
        "env-1",
        "idem-exec-2",
      ),
    );
    expect(response.status).toBe(200);
    expect((await store.get(operationId))?.status).toBe("SUCCEEDED");
    expect((await store.get(operationId))?.resultRef).toBe("runtime-1");
  });

  it("reconciles success only from matching observed runtime proof", async () => {
    const { service, store } = gateway();
    const operationId = crypto.randomUUID();
    await store.put({
      operationId,
      idempotencyKey: "idem-unknown",
      kind: "START",
      environmentId: "env-1",
      nodeId: "node-1",
      status: "UNKNOWN",
      resultRef: null,
      error: "lease expired",
    });
    const response = await service.fetch(
      await signedRequest(
        `/v1/operations/${operationId}/reconcile`,
        "POST",
        "",
        operationId,
        "env-1",
        "idem-reconcile",
      ),
    );
    expect((await response.json()).value.status).toBe("SUCCEEDED");
  });

  it("rejects node identity mismatch before dispatch", async () => {
    const { service } = gateway();
    const operationId = crypto.randomUUID();
    const request = await signedRequest(
      "/v1/operations",
      "POST",
      JSON.stringify({ kind: "START" }),
      operationId,
    );
    const headers = new Headers(request.headers);
    headers.set("x-forge-node-id", "node-2");
    const bad = new Request(request, { headers });
    expect((await service.fetch(bad)).status).toBe(401);
  });
});
