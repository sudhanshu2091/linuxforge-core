import type { ScenarioCheckpoint, ScenarioWorldState } from "./scenario-types";
export function createCheckpoint(
  id: string,
  name: string,
  state: ScenarioWorldState,
  createdAt: string,
): ScenarioCheckpoint {
  if (!id || !name.trim()) throw new Error("Checkpoint identity is required.");
  return { checkpointId: id, name, state: structuredClone(state), createdAt };
}
export function restoreCheckpoint(c: ScenarioCheckpoint) {
  return structuredClone(c.state);
}
