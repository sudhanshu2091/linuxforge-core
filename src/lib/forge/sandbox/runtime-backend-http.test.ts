import { describe, expect, test, vi } from "vitest";
import { HttpRuntimeBackend } from "./runtime-backend-http.server";
import { DEFAULT_RESOURCE_POLICY } from "./contract";

const digest = `kali@sha256:${"c".repeat(64)}`;
const handle = {
  provider: "real-linux-isolated-v1" as const,
  environmentId: "env-1",
  userId: "u-1",
  labId: "l-1",
};
const descriptor = {
  handle,
  status: "READY" as const,
  capabilities: {
    id: "real-linux-isolated-v1" as const,
    label: "Kali",
    description: "test",
    realLinux: true,
    runtimeClass: "microvm" as const,
    modelled: false,
    interactiveShell: true,
    streaming: false,
    resize: true,
    processes: true,
    services: true,
    environmentVariables: true,
    network: true,
    snapshots: true,
    pauseResume: true,
  },
  resourcePolicy: DEFAULT_RESOURCE_POLICY,
  snapshotId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 1000).toISOString(),
  metadata: {},
};

function response(value: unknown, ok = true, status = 200) {
  return new Response(
    JSON.stringify(ok ? { ok: true, value } : { ok: false, error: { message: String(value) } }),
    {
      status,
      headers: { "content-type": "application/json" },
    },
  );
}

describe("HTTP runtime backend", () => {
  test("launches through the provider-neutral runtime API", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.endsWith("/v1/health")) {
          return response({
            provider: "real-linux-isolated-v1",
            runtimeClass: "microvm",
            runtimeVersion: "test",
            healthy: true,
            ready: true,
            checkedAt: new Date().toISOString(),
            security: {
              networkIsolationEnforced: true,
              hostFilesystemBlocked: true,
              privilegeEscalationBlocked: true,
              metadataAccessBlocked: true,
            },
            capacity: { activeEnvironments: 1, maxEnvironments: 10 },
          });
        }
        return response(descriptor);
      }),
    );
    const backend = new HttpRuntimeBackend({
      backendId: "microvm-v1",
      endpoint: "https://runtime.test/",
      credential: "secret",
      runtimeClass: "microvm",
      runtimeVersion: "test",
      nodeId: "node-1",
    });
    const result = await backend.launch({
      handle,
      resourcePolicy: DEFAULT_RESOURCE_POLICY,
      launch: {
        runtimeClass: "microvm",
        imageRef: digest,
        userId: "u-1",
        labId: "l-1",
        resourcePolicy: DEFAULT_RESOURCE_POLICY,
        security: {
          guestRootAllowed: true,
          hostFilesystem: false,
          privilegeEscalation: false,
          devicePassthrough: false,
          nestedVirtualization: false,
          metadataAccess: false,
          network: "none",
        },
      },
    });
    expect(result.environment.status).toBe("READY");
    expect(result.runtimeNode.nodeId).toBe("node-1");
    expect(calls[0]).toContain("/v1/environments");
  });

  test("does not send a production launch with a mutable image", async () => {
    const backend = new HttpRuntimeBackend({
      backendId: "microvm-v1",
      endpoint: "https://runtime.test",
      credential: "secret",
      runtimeClass: "microvm",
      runtimeVersion: "test",
      nodeId: "node-1",
    });
    await expect(
      backend.launch({
        handle,
        resourcePolicy: DEFAULT_RESOURCE_POLICY,
        launch: {
          runtimeClass: "microvm",
          imageRef: "kali-rolling",
          userId: "u-1",
          labId: "l-1",
          resourcePolicy: DEFAULT_RESOURCE_POLICY,
          security: {
            guestRootAllowed: true,
            hostFilesystem: false,
            privilegeEscalation: false,
            devicePassthrough: false,
            nestedVirtualization: false,
            metadataAccess: false,
            network: "none",
          },
        },
      }),
    ).rejects.toThrow(/immutable image/);
  });
});
