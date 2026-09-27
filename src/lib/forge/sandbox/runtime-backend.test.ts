import { describe, expect, test } from "vitest";
import { assertRuntimeLaunchAdmitted, assertRuntimeNodeCanLaunch } from "./runtime-backend";
import { buildRuntimeLaunchSpec } from "./runtime-admission";
import { DEFAULT_RESOURCE_POLICY } from "./contract";
import type { RuntimeNode } from "./runtime-backend";

const request = {
  userId: "user-1",
  labId: "lab-1",
  resourcePolicy: DEFAULT_RESOURCE_POLICY,
  metadata: {},
};

const launch = buildRuntimeLaunchSpec(request, `kali@sha256:${"b".repeat(64)}`, "microvm");
const handle = {
  provider: "real-linux-isolated-v1" as const,
  environmentId: "env-1",
  userId: "user-1",
  labId: "lab-1",
};

const goodNode: RuntimeNode = {
  nodeId: "node-1",
  backendId: "microvm-test-v1",
  runtimeClass: "microvm",
  runtimeVersion: "test",
  capabilities: {
    runtimeClass: "microvm",
    snapshot: true,
    pauseResume: true,
    networkPolicy: true,
    immutableImages: true,
    guestRoot: true,
  },
  maxEnvironments: 10,
  activeEnvironments: 0,
  enabled: true,
  registeredAt: new Date().toISOString(),
  metadata: {},
};

describe("runtime backend boundary", () => {
  test("requires production-admitted launch data at infrastructure boundary", () => {
    expect(() =>
      assertRuntimeLaunchAdmitted({ launch, handle, resourcePolicy: DEFAULT_RESOURCE_POLICY }),
    ).not.toThrow();
    expect(() =>
      assertRuntimeLaunchAdmitted({
        launch: { ...launch, imageRef: "kali-rolling" },
        handle,
        resourcePolicy: DEFAULT_RESOURCE_POLICY,
      }),
    ).toThrow(/immutable image/);
  });

  test("rejects nodes that cannot enforce the required policy", () => {
    expect(() => assertRuntimeNodeCanLaunch(goodNode, launch)).not.toThrow();
    expect(() =>
      assertRuntimeNodeCanLaunch(
        { ...goodNode, capabilities: { ...goodNode.capabilities, networkPolicy: false } },
        launch,
      ),
    ).toThrow(/network policy/);
  });

  test("rejects saturated nodes", () => {
    expect(() =>
      assertRuntimeNodeCanLaunch({ ...goodNode, activeEnvironments: 10 }, launch),
    ).toThrow(/capacity/);
  });
});
