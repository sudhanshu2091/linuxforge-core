import { describe, expect, it } from "vitest";
import { DEFAULT_RESOURCE_POLICY } from "./contract";
import {
  assertBindingActive,
  assertNetworkDestinationAllowed,
  assertNoCrossLabAccess,
  assertSafeLabPath,
  authorizeRuntimeAccess,
  buildIsolationPolicy,
  classifyIsolationVerification,
  cleanupComplete,
  isIsolationVerified,
  shouldQuarantine,
  verificationFromRuntimeHealth,
  type IsolationCheckState,
  type IsolationVerification,
  type RuntimeBinding,
} from "./lab-isolation";

const binding = (): RuntimeBinding => ({
  runtimeId: "runtime-a",
  labId: "lab-a",
  learnerId: "user-a",
  nodeId: "node-1",
  bindingGeneration: 3,
  status: "ACTIVE",
  issuedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2027-01-01T00:00:00.000Z",
});
const checks = (state: IsolationCheckState): IsolationVerification["checks"] => ({
  identity: state,
  filesystem: state,
  processes: state,
  network: state,
  secrets: state,
  resources: state,
  terminal: state,
  crossLab: state,
});
const verification = (state: IsolationCheckState): IsolationVerification => ({
  verificationId: "verify-1",
  runtimeId: "runtime-a",
  labId: "lab-a",
  bindingGeneration: 3,
  state: state === "PASS" ? "PASS" : state === "FAIL" ? "FAIL" : "UNKNOWN",
  checkedAt: "2026-01-01T00:00:00.000Z",
  checks: checks(state),
  reason: state,
});

describe("v45 secure multi-tenant lab isolation", () => {
  it("builds a deny-by-default isolation policy", () => {
    const policy = buildIsolationPolicy(DEFAULT_RESOURCE_POLICY);
    expect(policy.filesystemIsolation).toBe(true);
    expect(policy.interLabNetwork).toBe(false);
    expect(policy.controlPlaneNetwork).toBe(false);
    expect(policy.hostFilesystem).toBe(false);
  });
  it("requires every isolation check to pass", () => {
    expect(isIsolationVerified(verification("PASS"))).toBe(true);
    expect(isIsolationVerified(verification("UNKNOWN"))).toBe(false);
  });
  it("classifies fail before unknown and pass only when all pass", () => {
    expect(classifyIsolationVerification(checks("PASS"))).toBe("PASS");
    const mixed = checks("PASS");
    mixed.network = "UNKNOWN";
    expect(classifyIsolationVerification(mixed)).toBe("UNKNOWN");
    mixed.filesystem = "FAIL";
    expect(classifyIsolationVerification(mixed)).toBe("FAIL");
  });
  it("authorizes only the exact learner/lab/runtime/generation", () => {
    expect(() =>
      authorizeRuntimeAccess({
        learnerId: "user-a",
        labId: "lab-a",
        runtimeId: "runtime-a",
        bindingGeneration: 3,
        binding: binding(),
        verification: verification("PASS"),
      }),
    ).not.toThrow();
    expect(() =>
      authorizeRuntimeAccess({
        learnerId: "user-b",
        labId: "lab-a",
        runtimeId: "runtime-a",
        bindingGeneration: 3,
        binding: binding(),
        verification: verification("PASS"),
      }),
    ).toThrow(/learner/i);
    expect(() =>
      authorizeRuntimeAccess({
        learnerId: "user-a",
        labId: "lab-a",
        runtimeId: "runtime-a",
        bindingGeneration: 2,
        binding: binding(),
        verification: verification("PASS"),
      }),
    ).toThrow(/generation/i);
  });
  it("rejects revoked or expired bindings", () => {
    const revoked = { ...binding(), status: "REVOKED" as const };
    expect(() => assertBindingActive(revoked)).toThrow(/revoked/i);
    const expired = { ...binding(), expiresAt: "2020-01-01T00:00:00.000Z" };
    expect(() => assertBindingActive(expired)).toThrow(/expired/i);
  });
  it("rejects cross-lab access even when IDs are known", () => {
    expect(() =>
      assertNoCrossLabAccess({ requestedLabId: "lab-b", authorizedLabId: "lab-a" }),
    ).toThrow(/cross-lab/i);
  });
  it("rejects traversal and host filesystem paths", () => {
    expect(() => assertSafeLabPath("/home/learner/project/file.txt")).not.toThrow();
    expect(() => assertSafeLabPath("/home/learner/../lab-b/secret")).toThrow(/traversal/i);
    expect(() => assertSafeLabPath("/etc/passwd")).toThrow(/filesystem/i);
  });
  it("enforces network deny-by-default and explicit allowlists", () => {
    expect(() =>
      assertNetworkDestinationAllowed({
        destination: "example.com",
        policy: DEFAULT_RESOURCE_POLICY,
      }),
    ).toThrow(/disabled/i);
    const policy = {
      ...DEFAULT_RESOURCE_POLICY,
      network: "egress-allowlist" as const,
      egressAllowlist: ["example.com"],
    };
    expect(() =>
      assertNetworkDestinationAllowed({ destination: "example.com", policy }),
    ).not.toThrow();
    expect(() =>
      assertNetworkDestinationAllowed({ destination: "lab-b", policy, isInterLab: true }),
    ).toThrow(/inter-lab/i);
  });
  it("requires complete cleanup", () => {
    expect(
      cleanupComplete({
        runtime: true,
        filesystem: true,
        network: true,
        terminal: true,
        credentials: true,
        resources: true,
      }),
    ).toBe(true);
    expect(
      cleanupComplete({
        runtime: true,
        filesystem: true,
        network: true,
        terminal: true,
        credentials: false,
        resources: true,
      }),
    ).toBe(false);
  });
  it("converts runtime health into an explicit isolation verification", () => {
    const result = verificationFromRuntimeHealth({
      verificationId: "v1",
      runtimeId: "runtime-a",
      labId: "lab-a",
      bindingGeneration: 3,
      checkedAt: "2026-01-01T00:00:00.000Z",
      healthy: true,
      ready: true,
      security: {
        networkIsolationEnforced: true,
        hostFilesystemBlocked: true,
        privilegeEscalationBlocked: true,
        metadataAccessBlocked: true,
      },
    });
    expect(result.state).toBe("PASS");
    expect(result.checks.crossLab).toBe("PASS");
  });

  it("quarantines failed and unknown verification", () => {
    expect(shouldQuarantine(verification("FAIL"))).toBe(true);
    expect(shouldQuarantine(verification("UNKNOWN"))).toBe(true);
    expect(shouldQuarantine(verification("PASS"))).toBe(false);
  });
});
