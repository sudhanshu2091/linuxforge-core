/**
 * Provider selection (server only).
 *
 * Selection is the ONLY place that decides which adapter executes learner
 * input. UI, story engine, verifier, observer and learner systems never choose a
 * provider and never contain execution logic, so swapping the mock for a real
 * isolated provider is a change confined to this file.
 *
 * Current configuration: the modelled sandbox only. Any request for the real
 * Linux provider fails closed — there is no host-execution fallback.
 */

import {
  MOCK_PROVIDER_ID,
  REAL_LINUX_PROVIDER_ID,
  isProviderId,
  type ProviderId,
  type SandboxProvider,
} from "./contract";
import { createMockSandboxProvider, type MockBackingStore } from "./mock-provider.server";
import { realLinuxProviderAvailability } from "./real-linux-provider.server";

/** Providers this build is allowed to dispatch to. */
export const ALLOWED_PROVIDER_IDS: readonly ProviderId[] = [MOCK_PROVIDER_ID];

export function configuredProviderId(): ProviderId {
  const requested = process.env["FORGE_SANDBOX_PROVIDER"];
  if (isProviderId(requested) && ALLOWED_PROVIDER_IDS.includes(requested)) return requested;
  return MOCK_PROVIDER_ID;
}

export type ProviderSelection = {
  provider: SandboxProvider;
  providerId: ProviderId;
  /** Honest note for the UI about the alternative adapter. */
  realLinux: { available: boolean; reason: string };
};

export function selectProvider(store: MockBackingStore): ProviderSelection {
  const providerId = configuredProviderId();
  if (providerId !== MOCK_PROVIDER_ID) {
    // Unreachable with ALLOWED_PROVIDER_IDS as configured; explicit for safety.
    throw new Error(`Provider ${providerId} is not permitted in this build.`);
  }
  return {
    provider: createMockSandboxProvider(store),
    providerId: MOCK_PROVIDER_ID,
    realLinux: realLinuxProviderAvailability(),
  };
}

/** True only for adapters this build may dispatch to. */
export const isDispatchable = (providerId: string): boolean =>
  isProviderId(providerId) && ALLOWED_PROVIDER_IDS.includes(providerId);

export const REAL_LINUX_IS_NOT_DISPATCHABLE = !isDispatchable(REAL_LINUX_PROVIDER_ID);
