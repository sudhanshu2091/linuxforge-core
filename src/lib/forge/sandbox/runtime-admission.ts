/**
 * Runtime-boundary admission rules.
 *
 * This module is intentionally independent from the provider implementation.
 * It turns a generic lab request into an explicit runtime launch contract and
 * refuses configurations that cannot meet the production isolation boundary.
 */

import type {
  CreateEnvironmentRequest,
  ResourcePolicy,
  RuntimeClass,
  RuntimeHealth,
} from "./contract";

export type RuntimeSecurityProfile = {
  guestRootAllowed: true;
  hostFilesystem: false;
  privilegeEscalation: false;
  devicePassthrough: false;
  nestedVirtualization: false;
  metadataAccess: false;
  network: ResourcePolicy["network"];
};

export type RuntimeLaunchSpec = {
  runtimeClass: RuntimeClass;
  imageRef: string;
  userId: string;
  labId: string;
  resourcePolicy: ResourcePolicy;
  security: RuntimeSecurityProfile;
};

export const DEFAULT_RUNTIME_SECURITY: RuntimeSecurityProfile = {
  guestRootAllowed: true,
  hostFilesystem: false,
  privilegeEscalation: false,
  devicePassthrough: false,
  nestedVirtualization: false,
  metadataAccess: false,
  network: "none",
};

export function isImmutableImageRef(imageRef: string): boolean {
  return /@sha256:[0-9a-f]{64}$/i.test(imageRef.trim());
}

export function buildRuntimeLaunchSpec(
  request: CreateEnvironmentRequest,
  imageRef: string,
  runtimeClass: RuntimeClass,
): RuntimeLaunchSpec {
  const spec: RuntimeLaunchSpec = {
    runtimeClass,
    imageRef: imageRef.trim(),
    userId: request.userId,
    labId: request.labId,
    resourcePolicy: request.resourcePolicy,
    security: {
      ...DEFAULT_RUNTIME_SECURITY,
      network: request.resourcePolicy.network,
    },
  };
  assertRuntimeLaunchSpec(spec);
  return spec;
}

export function assertRuntimeLaunchSpec(spec: RuntimeLaunchSpec): void {
  if (!spec.userId || !spec.labId)
    throw new Error("Runtime launch requires learner and lab ownership.");
  if (!spec.imageRef) throw new Error("Runtime launch requires an image reference.");
  if (spec.resourcePolicy.allowHostFilesystem !== false) {
    throw new Error("Runtime launch rejected: host filesystem access must be disabled.");
  }
  if (spec.resourcePolicy.allowPrivilegeEscalation !== false) {
    throw new Error("Runtime launch rejected: privilege escalation must be disabled.");
  }
  if (
    spec.security.hostFilesystem ||
    spec.security.privilegeEscalation ||
    spec.security.devicePassthrough
  ) {
    throw new Error("Runtime launch rejected: unsafe security profile.");
  }
  if (
    spec.security.metadataAccess ||
    (spec.resourcePolicy.network === "none" && spec.security.network !== "none")
  ) {
    throw new Error("Runtime launch rejected: network or metadata policy is inconsistent.");
  }
}

export function assertProductionRuntimeSpec(spec: RuntimeLaunchSpec): void {
  assertRuntimeLaunchSpec(spec);
  if (spec.runtimeClass !== "vm" && spec.runtimeClass !== "microvm") {
    throw new Error("Production Linux labs require a VM or microVM runtime boundary.");
  }
  if (!isImmutableImageRef(spec.imageRef)) {
    throw new Error("Production Linux labs require an immutable image digest (image@sha256:...).");
  }
  if (spec.resourcePolicy.network !== "none" && spec.resourcePolicy.egressAllowlist.length === 0) {
    throw new Error("Egress-enabled labs require an explicit non-empty allowlist.");
  }
}

export function assertRuntimeHealthHealthy(health: RuntimeHealth): void {
  if (!health.healthy || !health.ready) throw new Error("Runtime is not healthy and ready.");
  if (!health.security.hostFilesystemBlocked || !health.security.privilegeEscalationBlocked) {
    throw new Error("Runtime health check failed the isolation policy.");
  }
  if (!health.security.metadataAccessBlocked) {
    throw new Error("Runtime health check failed the metadata-access policy.");
  }
}
