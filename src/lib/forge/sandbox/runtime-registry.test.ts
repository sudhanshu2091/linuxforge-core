import { describe, expect, test } from "vitest";
import { InMemoryRuntimeRegistry } from "./runtime-registry";
import type { RuntimeNode } from "./runtime-backend";
import { buildRuntimeLaunchSpec } from "./runtime-admission";
import { DEFAULT_RESOURCE_POLICY } from "./contract";

const node = (id: string, active = 0): RuntimeNode => ({
  nodeId: id,
  backendId: "firecracker-v1",
  runtimeClass: "microvm",
  runtimeVersion: "test-runtime",
  capabilities: {
    runtimeClass: "microvm",
    snapshot: true,
    pauseResume: true,
    networkPolicy: true,
    immutableImages: true,
    guestRoot: true,
  },
  maxEnvironments: 4,
  activeEnvironments: active,
  enabled: true,
  registeredAt: new Date().toISOString(),
  metadata: {},
});

const launch = buildRuntimeLaunchSpec(
  { userId: "u1", labId: "l1", resourcePolicy: DEFAULT_RESOURCE_POLICY, metadata: {} },
  `kali@sha256:${"a".repeat(64)}`,
  "microvm",
);

describe("runtime registry", () => {
  test("registers, selects and tracks capacity", () => {
    const registry = new InMemoryRuntimeRegistry();
    registry.register(node("node-a", 3));
    registry.register(node("node-b", 1));
    expect(registry.select(launch).nodeId).toBe("node-b");
    expect(registry.reserve("node-b").activeEnvironments).toBe(2);
    expect(registry.release("node-b").activeEnvironments).toBe(1);
  });

  test("does not select disabled or incompatible nodes", () => {
    const registry = new InMemoryRuntimeRegistry();
    registry.register({ ...node("disabled"), enabled: false });
    registry.register({
      ...node("wrong-class"),
      runtimeClass: "vm",
      capabilities: { ...node("x").capabilities, runtimeClass: "vm" },
    });
    expect(() => registry.select(launch)).toThrow(/No admitted runtime node/);
  });

  test("prevents unregistering a node with active environments", () => {
    const registry = new InMemoryRuntimeRegistry();
    registry.register(node("busy", 1));
    expect(() => registry.unregister("busy")).toThrow(/active environments/);
  });
});
