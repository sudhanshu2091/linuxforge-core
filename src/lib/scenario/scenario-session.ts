import type { ScenarioState } from "./scenario-types";
const transitions: Record<ScenarioState, readonly ScenarioState[]> = {
  DRAFT: ["READY", "ARCHIVED"],
  READY: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["PAUSED", "COMPLETED", "FAILED", "EXPIRED"],
  PAUSED: ["ACTIVE", "RESETTING", "ARCHIVED"],
  RESETTING: ["READY", "ACTIVE", "FAILED"],
  COMPLETED: ["ARCHIVED"],
  FAILED: ["RESETTING", "ARCHIVED"],
  EXPIRED: ["ARCHIVED"],
  ARCHIVED: [],
};
export function canTransitionScenario(from: ScenarioState, to: ScenarioState) {
  return transitions[from].includes(to);
}
export function transitionScenario(from: ScenarioState, to: ScenarioState): ScenarioState {
  if (!canTransitionScenario(from, to))
    throw new Error(`Invalid scenario transition: ${from} -> ${to}`);
  return to;
}
export function scenarioTerminal(state: ScenarioState) {
  return state === "COMPLETED" || state === "EXPIRED" || state === "ARCHIVED";
}
