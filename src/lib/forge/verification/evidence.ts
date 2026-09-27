import type {
  EnvironmentHandle,
  FilesystemState,
  ProcessState,
  ServiceState,
} from "../sandbox/contract";
import type { VerificationEvidence, VerificationFilesystemObject } from "./types";

export function buildVerificationEvidence(input: {
  handle: EnvironmentHandle;
  environmentGeneration: number;
  runtimeLifecycleGeneration: number | null;
  filesystem: FilesystemState;
  processes: ProcessState;
  services: ServiceState;
  network?: Array<{ port: number; process: string }>;
}): VerificationEvidence {
  const filesystem: VerificationFilesystemObject[] = input.filesystem.objects.map((object) => ({
    path: object.path,
    objectType: object.objectType,
    permissions: object.permissions,
    owner: (object as typeof object & { owner?: string }).owner ?? null,
    group: (object as typeof object & { group?: string }).group ?? null,
    sizeBytes: null,
    content: object.content || null,
    contentTruncated: false,
  }));
  return {
    filesystem,
    processes: input.processes.processes.map((process) => ({ ...process })),
    services: input.services.services.map((service) => ({ ...service })),
    network: input.network ?? [],
    capturedAt: new Date().toISOString(),
    environmentId: input.handle.environmentId,
    environmentGeneration: input.environmentGeneration,
    runtimeId: null,
    runtimeLifecycleGeneration: input.runtimeLifecycleGeneration,
  };
}
