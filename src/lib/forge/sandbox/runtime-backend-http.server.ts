/**
 * Infrastructure-facing HTTP runtime adapter.
 *
 * The SandboxProvider remains the application boundary. This adapter is the
 * next boundary down: it speaks a small provider-neutral runtime API so the
 * backing service can be implemented by Firecracker, Cloud Hypervisor, Kata,
 * or another VM/microVM manager without leaking that choice upward.
 */
import type {
  EnvironmentDescriptor,
  EnvironmentHandle,
  RuntimeHealth,
  RuntimeClass,
  SnapshotRef,
} from "./contract";
import {
  assertRuntimeLaunchAdmitted,
  type RuntimeBackend,
  type RuntimeLifecycleResult,
  type RuntimeLaunchRequest,
  type RuntimeNode,
  type RuntimeOperationContext,
} from "./runtime-backend";

export type HttpRuntimeBackendConfig = {
  backendId: string;
  endpoint: string;
  credential: string;
  runtimeClass: RuntimeClass;
  runtimeVersion: string;
  nodeId: string;
};

function nodeFromHealth(config: HttpRuntimeBackendConfig, health: RuntimeHealth): RuntimeNode {
  return {
    nodeId: config.nodeId,
    backendId: config.backendId,
    runtimeClass: config.runtimeClass,
    runtimeVersion: config.runtimeVersion,
    capabilities: {
      runtimeClass: config.runtimeClass,
      snapshot: true,
      pauseResume: true,
      networkPolicy: health.security.networkIsolationEnforced,
      immutableImages: true,
      guestRoot: true,
    },
    maxEnvironments: health.capacity.maxEnvironments,
    activeEnvironments: health.capacity.activeEnvironments,
    enabled: health.healthy && health.ready,
    registeredAt: new Date().toISOString(),
    metadata: {},
  };
}

export class HttpRuntimeBackend implements RuntimeBackend {
  readonly backendId: string;
  readonly runtimeClass: RuntimeClass;
  private readonly config: HttpRuntimeBackendConfig;

  constructor(config: HttpRuntimeBackendConfig) {
    this.config = { ...config, endpoint: config.endpoint.replace(/\/$/, "") };
    this.backendId = config.backendId;
    this.runtimeClass = config.runtimeClass;
  }

  private async call<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.config.endpoint}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.config.credential}`,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      value?: T;
      error?: { message: string };
    };
    if (!response.ok || !payload.ok || payload.value === undefined) {
      throw new Error(payload.error?.message ?? `Runtime HTTP ${response.status}`);
    }
    return payload.value;
  }

  async getHealth(): Promise<RuntimeHealth> {
    return this.call<RuntimeHealth>("/v1/health");
  }

  private async lifecycle(
    path: string,
    handle: EnvironmentHandle,
    extra?: Record<string, unknown>,
    operation?: RuntimeOperationContext,
  ): Promise<RuntimeLifecycleResult> {
    const environment = await this.call<EnvironmentDescriptor>(path, {
      handle,
      ...(operation ? { operation } : {}),
      ...extra,
    });
    const health = await this.getHealth();
    return { environment, runtimeNode: nodeFromHealth(this.config, health) };
  }

  async launch(request: RuntimeLaunchRequest): Promise<RuntimeLifecycleResult> {
    assertRuntimeLaunchAdmitted(request);
    const environment = await this.call<EnvironmentDescriptor>("/v1/environments", {
      ...(request.handle.environmentId ? { environmentId: request.handle.environmentId } : {}),
      userId: request.handle.userId,
      labId: request.handle.labId,
      resourcePolicy: request.resourcePolicy,
      metadata: {},
      runtime: request.launch,
      ...(request.operation ? { operation: request.operation } : {}),
    });
    const health = await this.getHealth();
    return { environment, runtimeNode: nodeFromHealth(this.config, health) };
  }

  start(handle: EnvironmentHandle, operation?: RuntimeOperationContext) {
    return this.lifecycle(
      `/v1/environments/${encodeURIComponent(handle.environmentId)}/start`,
      handle,
      undefined,
      operation,
    );
  }
  async stop(
    handle: EnvironmentHandle,
    operation?: RuntimeOperationContext,
  ): Promise<RuntimeLifecycleResult> {
    return this.lifecycle(
      `/v1/environments/${encodeURIComponent(handle.environmentId)}/stop`,
      handle,
      undefined,
      operation,
    );
  }
  reset(handle: EnvironmentHandle, operation?: RuntimeOperationContext) {
    return this.lifecycle(
      `/v1/environments/${encodeURIComponent(handle.environmentId)}/reset`,
      handle,
      undefined,
      operation,
    );
  }
  pause(handle: EnvironmentHandle, operation?: RuntimeOperationContext) {
    return this.lifecycle(
      `/v1/environments/${encodeURIComponent(handle.environmentId)}/pause`,
      handle,
      undefined,
      operation,
    );
  }
  resume(handle: EnvironmentHandle, operation?: RuntimeOperationContext) {
    return this.lifecycle(
      `/v1/environments/${encodeURIComponent(handle.environmentId)}/resume`,
      handle,
      undefined,
      operation,
    );
  }

  async snapshot(
    handle: EnvironmentHandle,
    operation?: RuntimeOperationContext,
  ): Promise<SnapshotRef> {
    return this.call<SnapshotRef>(
      `/v1/environments/${encodeURIComponent(handle.environmentId)}/snapshot`,
      { handle, ...(operation ? { operation } : {}) },
    );
  }

  restore(handle: EnvironmentHandle, snapshotId: string, operation?: RuntimeOperationContext) {
    return this.lifecycle(
      `/v1/environments/${encodeURIComponent(handle.environmentId)}/restore`,
      handle,
      { snapshotId },
      operation,
    );
  }

  async destroy(
    handle: EnvironmentHandle,
    operation?: RuntimeOperationContext,
  ): Promise<{ destroyed: true; runtimeNodeId: string }> {
    await this.call<{ destroyed: true }>(
      `/v1/environments/${encodeURIComponent(handle.environmentId)}/destroy`,
      { handle, ...(operation ? { operation } : {}) },
    );
    const health = await this.getHealth();
    return { destroyed: true, runtimeNodeId: nodeFromHealth(this.config, health).nodeId };
  }
}
