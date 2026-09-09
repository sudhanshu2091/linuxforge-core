/**
 * RealLinuxSandboxProvider — UNIMPLEMENTED STUB (server only).
 *
 * There is deliberately no execution code in this file. It cannot be
 * constructed, let alone invoked, unless an external, genuinely isolated
 * execution service is configured, and every operation fails closed with
 * `PROVIDER_NOT_CONFIGURED` / `NOT_IMPLEMENTED`. It NEVER falls back to running
 * anything locally: not in the browser, not in the app server, not in the
 * database, not on the host.
 *
 * REQUIRED ISOLATION CONTRACT for any future provider that wants to satisfy
 * this adapter. All of it is the *external provider's* responsibility; the app
 * only orchestrates and records observations.
 *
 * 1. Isolation
 *    - One dedicated environment per learner (VM / microVM / hardened container
 *      with user namespaces and seccomp); never a shared shell or shared kernel
 *      namespace between learners.
 *    - No path from the environment to the host filesystem, the app process, the
 *      database, provider credentials, environment secrets or metadata services.
 *    - Privilege escalation disabled; no host devices; read-only base image with
 *      a per-learner writable overlay.
 * 2. Resource limits (see `ResourcePolicy`)
 *    - Wall-clock execution timeout, CPU, memory, storage quota, process count
 *      and open-file caps, bounded output size.
 * 3. Network
 *    - Default deny: no inbound listeners exposed publicly, no egress unless an
 *      explicit allowlist is configured for a lesson.
 * 4. Lifecycle
 *    - Create / start / pause / resume / reset / snapshot / restore / destroy,
 *      plus idle expiry and guaranteed cleanup of storage and snapshots.
 * 5. Audit
 *    - Every execution attributable to (learner, environment, timestamp) with
 *      redacted input and output retained by the app, and provider-side audit
 *      logging for lifecycle operations.
 *
 * Until such a provider is configured and verified live, the app must never
 * describe its terminal as real Linux.
 */

import {
  MOCK_PROVIDER_ID,
  REAL_LINUX_PROVIDER_ID,
  providerFail,
  type ProviderCapabilities,
  type ProviderResult,
  type SandboxProvider,
} from "./contract";

export const REAL_LINUX_CAPABILITIES: ProviderCapabilities = {
  id: REAL_LINUX_PROVIDER_ID,
  label: "Isolated Linux lab (not configured)",
  description:
    "Reserved adapter for a future per-learner isolated Linux environment. No such provider is configured, so it cannot execute anything.",
  realLinux: true,
  modelled: false,
  interactiveShell: true,
  streaming: true,
  resize: true,
  processes: true,
  services: true,
  environmentVariables: true,
  network: true,
  snapshots: true,
  pauseResume: true,
};

/** Configuration a real provider would require. Absent in every environment today. */
export type RealLinuxProviderConfig = {
  /** External provider endpoint. Must not be the app, the database or the host. */
  endpoint: string;
  /** Opaque provider credential. Never stored in the database. */
  credential: string;
  imageRef: string;
};

export const REAL_LINUX_UNAVAILABLE_REASON =
  "No isolated Linux execution provider is configured. Labs run on the modelled training sandbox.";

/**
 * Reads configuration for a real provider. Returns `null` in every currently
 * supported deployment; that is what makes the adapter impossible to invoke.
 */
export function readRealLinuxProviderConfig(): RealLinuxProviderConfig | null {
  const endpoint = process.env["FORGE_SANDBOX_ENDPOINT"];
  const credential = process.env["FORGE_SANDBOX_CREDENTIAL"];
  const imageRef = process.env["FORGE_SANDBOX_IMAGE"];
  if (!endpoint || !credential || !imageRef) return null;
  return { endpoint, credential, imageRef };
}

const fail = <T>(): ProviderResult<T> =>
  providerFail<T>("PROVIDER_NOT_CONFIGURED", REAL_LINUX_UNAVAILABLE_REASON);

const notImplemented = <T>(operation: string): ProviderResult<T> =>
  providerFail<T>(
    "NOT_IMPLEMENTED",
    `${operation} requires an external isolated execution provider. It is intentionally not implemented and never falls back to local execution.`,
  );

/**
 * Fails-closed real-Linux adapter.
 *
 * Construction itself throws unless a real provider is configured, so no code
 * path can accidentally route learner input here and silently degrade to the
 * mock — or worse, to the host.
 */
export function createRealLinuxSandboxProvider(): SandboxProvider {
  const config = readRealLinuxProviderConfig();
  if (!config) {
    throw new Error(
      `${REAL_LINUX_UNAVAILABLE_REASON} Refusing to construct the isolated Linux adapter; use the "${MOCK_PROVIDER_ID}" provider.`,
    );
  }

  // Reaching here means configuration exists but the transport is unwritten.
  // Every operation still refuses: no host execution, ever.
  return {
    capabilities: REAL_LINUX_CAPABILITIES,
    createEnvironment: async () => notImplemented("createEnvironment"),
    startEnvironment: async () => notImplemented("startEnvironment"),
    executeCommand: async () => notImplemented("executeCommand"),
    sendInput: async () => notImplemented("sendInput"),
    resizeTerminal: async () => notImplemented("resizeTerminal"),
    getEnvironmentState: async () => notImplemented("getEnvironmentState"),
    getFilesystemState: async () => notImplemented("getFilesystemState"),
    getProcessState: async () => notImplemented("getProcessState"),
    getServiceState: async () => notImplemented("getServiceState"),
    getEnvironmentVariables: async () => notImplemented("getEnvironmentVariables"),
    resetEnvironment: async () => notImplemented("resetEnvironment"),
    snapshotEnvironment: async () => notImplemented("snapshotEnvironment"),
    restoreEnvironment: async () => notImplemented("restoreEnvironment"),
    pauseEnvironment: async () => notImplemented("pauseEnvironment"),
    resumeEnvironment: async () => notImplemented("resumeEnvironment"),
    destroyEnvironment: async () => notImplemented("destroyEnvironment"),
  };
}

/** Probe used by the registry and by tests: the real provider must be unavailable. */
export function realLinuxProviderAvailability(): { available: boolean; reason: string } {
  return readRealLinuxProviderConfig() === null
    ? { available: false, reason: REAL_LINUX_UNAVAILABLE_REASON }
    : { available: false, reason: "Isolated Linux transport is not implemented in this build." };
}

export const REAL_LINUX_STUB_GUARD = fail;
