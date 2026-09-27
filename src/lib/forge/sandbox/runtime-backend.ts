/**
 * Provider-neutral infrastructure runtime contract.
 *
 * This is the boundary below SandboxProvider. LinuxForge Core does not know
 * whether a runtime is backed by Firecracker, Cloud Hypervisor, Kata, a VM
 * service, or another isolated runtime. Infrastructure adapters implement this
 * contract; the learning/application layers never do.
 */
import type {
  EnvironmentDescriptor,
  EnvironmentHandle,
  RuntimeHealth,
  RuntimeClass,
  ResourcePolicy,
  SnapshotRef,
} from "./contract";
import { assertProductionRuntimeSpec, type RuntimeLaunchSpec } from "./runtime-admission";

export type RuntimeBackendCapabilities = {
  runtimeClass: RuntimeClass;
  snapshot: boolean;
  pauseResume: boolean;
  networkPolicy: boolean;
  immutableImages: boolean;
  guestRoot: boolean;
};

export type RuntimeNode = {
  nodeId: string;
  backendId: string;
  runtimeClass: RuntimeClass;
  runtimeVersion: string;
  capabilities: RuntimeBackendCapabilities;
  maxEnvironments: number | null;
  activeEnvironments: number;
  enabled: boolean;
  registeredAt: string;
  metadata: Readonly<Record<string, string>>;
};

export type RuntimeOperationContext = {
  operationId: string;
  idempotencyKey: string;
  leaseToken: string;
};

export type RuntimeLaunchRequest = {
  launch: RuntimeLaunchSpec;
  handle: EnvironmentHandle;
  resourcePolicy: ResourcePolicy;
  operation?: RuntimeOperationContext;
};

export type RuntimeLifecycleState =
  "CREATING" | "READY" | "RUNNING" | "PAUSED" | "RESETTING" | "STOPPED" | "EXPIRED" | "ERROR";

export type RuntimeLifecycleResult = {
  environment: EnvironmentDescriptor;
  runtimeNode: RuntimeNode;
};

export type RuntimeBackend = {
  readonly backendId: string;
  readonly runtimeClass: RuntimeClass;
  getHealth(): Promise<RuntimeHealth>;
  launch(request: RuntimeLaunchRequest): Promise<RuntimeLifecycleResult>;
  start(
    handle: EnvironmentHandle,
    operation?: RuntimeOperationContext,
  ): Promise<RuntimeLifecycleResult>;
  stop(
    handle: EnvironmentHandle,
    operation?: RuntimeOperationContext,
  ): Promise<RuntimeLifecycleResult>;
  reset(
    handle: EnvironmentHandle,
    operation?: RuntimeOperationContext,
  ): Promise<RuntimeLifecycleResult>;
  pause(
    handle: EnvironmentHandle,
    operation?: RuntimeOperationContext,
  ): Promise<RuntimeLifecycleResult>;
  resume(
    handle: EnvironmentHandle,
    operation?: RuntimeOperationContext,
  ): Promise<RuntimeLifecycleResult>;
  snapshot(handle: EnvironmentHandle, operation?: RuntimeOperationContext): Promise<SnapshotRef>;
  restore(
    handle: EnvironmentHandle,
    snapshotId: string,
    operation?: RuntimeOperationContext,
  ): Promise<RuntimeLifecycleResult>;
  destroy(
    handle: EnvironmentHandle,
    operation?: RuntimeOperationContext,
  ): Promise<{ destroyed: true; runtimeNodeId: string }>;
};

/** Production admission is repeated at the infrastructure boundary. */
export function assertRuntimeLaunchAdmitted(request: RuntimeLaunchRequest): void {
  assertProductionRuntimeSpec(request.launch);
  if (request.resourcePolicy !== request.launch.resourcePolicy) {
    throw new Error("Runtime resource policy mismatch.");
  }
}

export function assertRuntimeNodeCanLaunch(node: RuntimeNode, launch: RuntimeLaunchSpec): void {
  if (!node.enabled) throw new Error(`Runtime node ${node.nodeId} is disabled.`);
  if (node.runtimeClass !== launch.runtimeClass) {
    throw new Error("Runtime node class does not match launch class.");
  }
  if (!node.capabilities.immutableImages) {
    throw new Error("Runtime node does not support immutable image admission.");
  }
  if (!node.capabilities.networkPolicy) {
    throw new Error("Runtime node does not support enforced network policy.");
  }
  if (!node.capabilities.guestRoot) {
    throw new Error("Runtime node does not support the required guest-root model.");
  }
  if (node.maxEnvironments !== null && node.activeEnvironments >= node.maxEnvironments) {
    throw new Error(`Runtime node ${node.nodeId} is at capacity.`);
  }
}
