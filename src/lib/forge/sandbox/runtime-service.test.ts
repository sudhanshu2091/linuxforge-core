import { describe, expect, it } from "vitest";
import { InMemoryRuntimeInfrastructure } from "./runtime-infrastructure";
import {
  RuntimeRequestAuthenticator,
  reconcileRuntimeOperation,
  signRuntimeRequest,
} from "./runtime-service";

const baseRequest = {
  method: "POST",
  path: "/v1/environments/env-1/start",
  timestampMs: 1_000_000,
  nonce: "nonce-1",
  body: '{"environmentId":"env-1"}',
  operationId: "op-1",
  environmentId: "env-1",
  nodeId: "node-1",
  idempotencyKey: "idem-1",
};

describe("runtime service v18", () => {
  it("signs and verifies an authenticated request, then rejects replay", async () => {
    const authn = new RuntimeRequestAuthenticator();
    const auth = await signRuntimeRequest(baseRequest, "secret");
    await expect(authn.verify(baseRequest, auth, "secret", 1_010_000)).resolves.toBeUndefined();
    await expect(authn.verify(baseRequest, auth, "secret", 1_010_000)).rejects.toThrow(/nonce/);
  });

  it("rejects stale timestamps and tampered bodies", async () => {
    const authn = new RuntimeRequestAuthenticator();
    const auth = await signRuntimeRequest(baseRequest, "secret");
    await expect(authn.verify(baseRequest, auth, "secret", 1_040_001)).rejects.toThrow(/timestamp/);
    await expect(
      authn.verify({ ...baseRequest, body: "tampered" }, auth, "secret", 1_001_000),
    ).rejects.toThrow(/signature/);
  });

  it("reconciles an UNKNOWN operation only from observed state", async () => {
    const infra = new InMemoryRuntimeInfrastructure();
    const op = infra.begin({
      idempotencyKey: "idem",
      kind: "START",
      environmentId: "env-1",
      nodeId: "node-1",
    });
    expect(reconcileRuntimeOperation(op, null).status).toBe("IGNORED");

    const unknown = { ...op, status: "UNKNOWN" as const };
    expect(reconcileRuntimeOperation(unknown, null).status).toBe("UNKNOWN");
    expect(
      reconcileRuntimeOperation(unknown, {
        exists: true,
        environmentId: "env-1",
        nodeId: "node-1",
        state: "RUNNING",
      }).status,
    ).toBe("SUCCEEDED");
  });

  it("treats missing environments as success only for DESTROY", async () => {
    const op = {
      kind: "DESTROY" as const,
      environmentId: "env-1",
      nodeId: "node-1",
      status: "UNKNOWN" as const,
    };
    expect(reconcileRuntimeOperation(op, null).status).toBe("SUCCEEDED");
  });

  it("does not accept observations from another environment or node", async () => {
    const op = {
      kind: "STOP" as const,
      environmentId: "env-1",
      nodeId: "node-1",
      status: "UNKNOWN" as const,
    };
    expect(
      reconcileRuntimeOperation(op, {
        exists: true,
        environmentId: "env-2",
        nodeId: "node-1",
        state: "STOPPED",
      }).status,
    ).toBe("UNKNOWN");
    expect(
      reconcileRuntimeOperation(op, {
        exists: true,
        environmentId: "env-1",
        nodeId: "node-2",
        state: "STOPPED",
      }).status,
    ).toBe("UNKNOWN");
  });

  it("keeps the infrastructure operation terminal-state rule explicit", async () => {
    const op = { idempotencyKey: "k", kind: "START" as const, environmentId: "env-1" };
    expect(infraStatus(op)).toBe("nonterminal");
  });
});

function infraStatus(input: {
  idempotencyKey: string;
  kind: "START";
  environmentId: string;
}): string {
  const infra = new InMemoryRuntimeInfrastructure();
  const op = infra.begin(input);
  return op.status === "QUEUED" ? "nonterminal" : op.status;
}
