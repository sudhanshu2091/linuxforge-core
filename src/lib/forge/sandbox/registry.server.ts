import {
  MOCK_PROVIDER_ID,
  REAL_LINUX_PROVIDER_ID,
  isProviderId,
  type ProviderId,
  type SandboxProvider,
} from "./contract";

import { createMockSandboxProvider, type MockBackingStore } from "./mock-provider.server";

import {
  createRealLinuxSandboxProvider,
  realLinuxProviderAvailability,
  type RealLinuxProviderEnvironment,
} from "./real-linux-provider.server";

export const ALLOWED_PROVIDER_IDS: readonly ProviderId[] = [
  MOCK_PROVIDER_ID,
  REAL_LINUX_PROVIDER_ID,
];

export function configuredProviderId(environment: NodeJS.ProcessEnv = process.env): ProviderId {
  const requested = environment["FORGE_SANDBOX_PROVIDER"];

  return isProviderId(requested) && ALLOWED_PROVIDER_IDS.includes(requested)
    ? requested
    : MOCK_PROVIDER_ID;
}

export type ProviderSelection = {
  provider: SandboxProvider;
  providerId: ProviderId;
  realLinux: { available: boolean; reason: string };
};

export function selectProvider(
  store: MockBackingStore,
  environment: NodeJS.ProcessEnv = process.env,
): ProviderSelection {
  const providerId = configuredProviderId(environment);

  const runtimeEnvironment: RealLinuxProviderEnvironment = {
    FORGE_SANDBOX_ENDPOINT: environment["FORGE_SANDBOX_ENDPOINT"],
    FORGE_SANDBOX_CREDENTIAL: environment["FORGE_SANDBOX_CREDENTIAL"],
    FORGE_SANDBOX_IMAGE: environment["FORGE_SANDBOX_IMAGE"],
    FORGE_SANDBOX_RUNTIME_MODE: environment["FORGE_SANDBOX_RUNTIME_MODE"],
    FORGE_SANDBOX_RUNTIME_CLASS: environment["FORGE_SANDBOX_RUNTIME_CLASS"],
  };

  if (providerId === REAL_LINUX_PROVIDER_ID) {
    const provider = createRealLinuxSandboxProvider(runtimeEnvironment);

    return {
      provider,
      providerId,
      realLinux: realLinuxProviderAvailability(runtimeEnvironment),
    };
  }

  return {
    provider: createMockSandboxProvider(store),
    providerId: MOCK_PROVIDER_ID,
    realLinux: realLinuxProviderAvailability(runtimeEnvironment),
  };
}

export const isDispatchable = (providerId: string): boolean =>
  isProviderId(providerId) && ALLOWED_PROVIDER_IDS.includes(providerId);
