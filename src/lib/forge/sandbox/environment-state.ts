import type { EnvironmentPersistenceState } from "./contract";

export const PERSISTENCE_TRANSITIONS: Record<
  EnvironmentPersistenceState,
  readonly EnvironmentPersistenceState[]
> = {
  PROVISIONING: ["READY", "ACTIVE", "FAILED", "QUARANTINED", "DESTROYING"],
  READY: ["ACTIVE", "STOPPING", "DESTROYING", "QUARANTINED", "FAILED"],
  ACTIVE: ["STOPPING", "READY", "DESTROYING", "QUARANTINED", "FAILED"],
  STOPPING: ["STOPPED", "FAILED", "QUARANTINED"],
  STOPPED: ["ACTIVE", "DESTROYING", "QUARANTINED"],
  FAILED: ["PROVISIONING", "STOPPING", "DESTROYING", "QUARANTINED"],
  QUARANTINED: ["STOPPING", "DESTROYING"],
  DESTROYING: ["DESTROYED", "FAILED", "QUARANTINED"],
  DESTROYED: [],
};

export function canTransitionPersistence(
  from: EnvironmentPersistenceState,
  to: EnvironmentPersistenceState,
): boolean {
  return from === to || PERSISTENCE_TRANSITIONS[from].includes(to);
}

export function assertPersistenceTransition(
  from: EnvironmentPersistenceState,
  to: EnvironmentPersistenceState,
): void {
  if (!canTransitionPersistence(from, to)) {
    throw new Error(`Invalid persistent environment transition: ${from} -> ${to}`);
  }
}

export function isPersistentStateDestroyed(state: EnvironmentPersistenceState): boolean {
  return state === "DESTROYED";
}

export function nextEnvironmentGeneration(current: number): number {
  return Math.max(1, Math.trunc(current) || 1) + 1;
}

export function nextArtifactVersion(current: number): number {
  return Math.max(0, Math.trunc(current) || 0) + 1;
}

export function classifyPersistenceOperation(
  operation: "CREATE" | "START" | "STOP" | "RESTART" | "RESET" | "RESTORE" | "DESTROY" | "VERIFY",
): EnvironmentPersistenceState {
  switch (operation) {
    case "CREATE":
      return "PROVISIONING";
    case "START":
    case "RESTART":
    case "RESET":
    case "RESTORE":
      return "ACTIVE";
    case "STOP":
      return "STOPPED";
    case "DESTROY":
      return "DESTROYING";
    case "VERIFY":
      return "READY";
  }
}

export function assertEnvironmentCanStart(state: EnvironmentPersistenceState): void {
  if (state === "DESTROYED") {
    throw new Error("Persistent environment is destroyed and cannot be resurrected.");
  }
  if (state === "QUARANTINED") {
    throw new Error("Persistent environment is quarantined and must be reconciled or destroyed.");
  }
  if (state === "DESTROYING") {
    throw new Error("Persistent environment is being destroyed.");
  }
}
