/**
 * V45 Secure Multi-Tenant Lab Isolation.
 *
 * Deterministic security policy and identity primitives. This module never
 * executes runtime commands; it authorizes the boundary immediately before a
 * runtime/terminal request crosses into the lab.
 */
import type { ResourcePolicy } from "./contract";

export const ISOLATION_VERIFICATION_COMPONENTS = [
  "identity",
  "filesystem",
  "processes",
  "network",
  "secrets",
  "resources",
  "terminal",
  "crossLab",
] as const;
export type IsolationComponent = (typeof ISOLATION_VERIFICATION_COMPONENTS)[number];
export type IsolationCheckState = "PASS" | "FAIL" | "UNKNOWN";

export type RuntimeBinding = {
  runtimeId: string;
  labId: string;
  learnerId: string;
  nodeId: string | null;
  bindingGeneration: number;
  status: "ACTIVE" | "REVOKED" | "QUARANTINED";
  issuedAt: string;
  expiresAt: string;
};

export type RuntimeCredentialClaims = {
  credentialId: string;
  runtimeId: string;
  labId: string;
  learnerId: string;
  bindingGeneration: number;
  issuedAt: string;
  expiresAt: string;
  credentialVersion: number;
};

export type IsolationPolicy = {
  filesystemIsolation: true;
  processIsolation: true;
  interLabNetwork: false;
  controlPlaneNetwork: false;
  hostNetwork: false;
  hostFilesystem: false;
  hostProcesses: false;
  metadataAccess: false;
  privilegeEscalation: false;
  devicePassthrough: false;
  nestedVirtualization: false;
  resourcePolicy: ResourcePolicy;
};

export const buildIsolationPolicy = (resourcePolicy: ResourcePolicy): IsolationPolicy => ({
  filesystemIsolation: true,
  processIsolation: true,
  interLabNetwork: false,
  controlPlaneNetwork: false,
  hostNetwork: false,
  hostFilesystem: false,
  hostProcesses: false,
  metadataAccess: false,
  privilegeEscalation: false,
  devicePassthrough: false,
  nestedVirtualization: false,
  resourcePolicy,
});

export type IsolationVerification = {
  verificationId: string;
  runtimeId: string;
  labId: string;
  bindingGeneration: number;
  state: "PASS" | "FAIL" | "UNKNOWN";
  checkedAt: string;
  checks: Record<IsolationComponent, IsolationCheckState>;
  reason: string;
};

export function isIsolationVerified(
  verification: Pick<IsolationVerification, "state" | "checks">,
): boolean {
  return (
    verification.state === "PASS" &&
    ISOLATION_VERIFICATION_COMPONENTS.every((key) => verification.checks[key] === "PASS")
  );
}

export function classifyIsolationVerification(
  checks: Record<IsolationComponent, IsolationCheckState>,
): IsolationVerification["state"] {
  if (Object.values(checks).some((value) => value === "FAIL")) return "FAIL";
  if (Object.values(checks).some((value) => value === "UNKNOWN")) return "UNKNOWN";
  return "PASS";
}

export function assertBindingActive(binding: RuntimeBinding, now = new Date()): void {
  if (binding.status !== "ACTIVE")
    throw new Error(`Runtime binding is ${binding.status.toLowerCase()}.`);
  if (binding.bindingGeneration < 1) throw new Error("Runtime binding generation is invalid.");
  if (new Date(binding.expiresAt).getTime() <= now.getTime())
    throw new Error("Runtime binding has expired.");
}

export function authorizeRuntimeAccess(input: {
  learnerId: string;
  labId: string;
  runtimeId: string;
  bindingGeneration: number;
  binding: RuntimeBinding;
  verification: IsolationVerification | null;
  now?: Date;
}): void {
  assertBindingActive(input.binding, input.now);
  if (input.binding.learnerId !== input.learnerId)
    throw new Error("Runtime access denied: learner ownership mismatch.");
  if (input.binding.labId !== input.labId)
    throw new Error("Runtime access denied: lab ownership mismatch.");
  if (input.binding.runtimeId !== input.runtimeId)
    throw new Error("Runtime access denied: runtime identity mismatch.");
  if (input.binding.bindingGeneration !== input.bindingGeneration)
    throw new Error("Runtime access denied: stale binding generation.");
  if (!input.verification || !isIsolationVerified(input.verification)) {
    throw new Error("Runtime access denied: isolation is not verified.");
  }
  if (
    input.verification.runtimeId !== input.runtimeId ||
    input.verification.labId !== input.labId ||
    input.verification.bindingGeneration !== input.bindingGeneration
  ) {
    throw new Error(
      "Runtime access denied: isolation verification does not match runtime binding.",
    );
  }
}

export function assertNoCrossLabAccess(input: {
  requestedLabId: string;
  authorizedLabId: string;
}): void {
  if (input.requestedLabId !== input.authorizedLabId) throw new Error("Cross-lab access denied.");
}

export function assertSafeLabPath(path: string): void {
  const normalized = path.replaceAll("\\", "/");
  if (!normalized || normalized.includes("\0")) throw new Error("Invalid lab filesystem path.");
  if (
    normalized.startsWith("/") &&
    !normalized.startsWith("/home/learner") &&
    !normalized.startsWith("/workspace")
  ) {
    throw new Error("Host or infrastructure filesystem path is not permitted.");
  }
  const parts = normalized.split("/");
  if (parts.includes("..")) throw new Error("Path traversal is not permitted.");
}

export function assertNetworkDestinationAllowed(input: {
  destination: string;
  policy: Pick<ResourcePolicy, "network" | "egressAllowlist">;
  isInterLab?: boolean;
  isControlPlane?: boolean;
  isHost?: boolean;
}): void {
  if (input.isInterLab) throw new Error("Inter-lab network access is denied.");
  if (input.isControlPlane) throw new Error("Control-plane network access is denied.");
  if (input.isHost) throw new Error("Host network access is denied.");
  if (input.policy.network === "none") throw new Error("Network access is disabled for this lab.");
  if (!input.policy.egressAllowlist.includes(input.destination))
    throw new Error("Network destination is not on the lab allowlist.");
}

export type CleanupTargets = {
  runtime: boolean;
  filesystem: boolean;
  network: boolean;
  terminal: boolean;
  credentials: boolean;
  resources: boolean;
};

export function cleanupComplete(targets: CleanupTargets): boolean {
  return Object.values(targets).every(Boolean);
}

export function shouldQuarantine(verification: Pick<IsolationVerification, "state">): boolean {
  return verification.state !== "PASS";
}

export function verificationFromRuntimeHealth(input: {
  verificationId: string;
  runtimeId: string;
  labId: string;
  bindingGeneration: number;
  checkedAt: string;
  healthy: boolean;
  ready: boolean;
  security: {
    networkIsolationEnforced: boolean;
    hostFilesystemBlocked: boolean;
    privilegeEscalationBlocked: boolean;
    metadataAccessBlocked: boolean;
  };
}): IsolationVerification {
  const checks: IsolationVerification["checks"] = {
    identity: input.healthy && input.ready ? "PASS" : "UNKNOWN",
    filesystem: input.security.hostFilesystemBlocked ? "PASS" : "FAIL",
    processes: input.security.privilegeEscalationBlocked ? "PASS" : "FAIL",
    network: input.security.networkIsolationEnforced ? "PASS" : "FAIL",
    secrets: input.security.metadataAccessBlocked ? "PASS" : "FAIL",
    resources: input.healthy && input.ready ? "PASS" : "UNKNOWN",
    terminal: input.healthy && input.ready ? "PASS" : "UNKNOWN",
    crossLab: input.security.networkIsolationEnforced ? "PASS" : "FAIL",
  };
  const state = classifyIsolationVerification(checks);
  return {
    verificationId: input.verificationId,
    runtimeId: input.runtimeId,
    labId: input.labId,
    bindingGeneration: input.bindingGeneration,
    state,
    checkedAt: input.checkedAt,
    checks,
    reason:
      state === "PASS"
        ? "Runtime health proves the configured isolation controls."
        : "Runtime health did not prove every isolation control.",
  };
}
