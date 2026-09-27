import { describe, expect, test } from "vitest";
import { DEFAULT_RESOURCE_POLICY } from "./contract";
import {
  assertProductionRuntimeSpec,
  assertRuntimeHealthHealthy,
  buildRuntimeLaunchSpec,
  isImmutableImageRef,
} from "./runtime-admission";

const digest = `sha256:${"a".repeat(64)}`;
const request = {
  userId: "user-1",
  labId: "lab-1",
  resourcePolicy: DEFAULT_RESOURCE_POLICY,
  metadata: {},
};

describe("runtime admission", () => {
  test("accepts immutable VM image references", () => {
    expect(isImmutableImageRef(`kali-rolling@${digest}`)).toBe(true);
    expect(isImmutableImageRef("kali-rolling")).toBe(false);
  });

  test("rejects container-dev as a production runtime", () => {
    const spec = buildRuntimeLaunchSpec(request, `kali@${digest}`, "container-dev");
    expect(() => assertProductionRuntimeSpec(spec)).toThrow(/VM or microVM/);
  });

  test("rejects mutable images in production", () => {
    const spec = buildRuntimeLaunchSpec(request, "kali-rolling", "microvm");
    expect(() => assertProductionRuntimeSpec(spec)).toThrow(/immutable image digest/);
  });

  test("requires healthy runtime security signals", () => {
    expect(() =>
      assertRuntimeHealthHealthy({
        provider: "real-linux-isolated-v1",
        runtimeClass: "microvm",
        runtimeVersion: "test",
        healthy: true,
        ready: true,
        checkedAt: new Date().toISOString(),
        security: {
          networkIsolationEnforced: true,
          hostFilesystemBlocked: true,
          privilegeEscalationBlocked: false,
          metadataAccessBlocked: true,
        },
        capacity: { activeEnvironments: 0, maxEnvironments: 10 },
      }),
    ).toThrow(/isolation policy/);
  });
});
