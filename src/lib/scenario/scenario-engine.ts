import type { ScenarioDefinition, ScenarioEvent, ScenarioWorldState } from "./scenario-types";
import { initialWorldState } from "./scenario-state";
import { processScenarioEvent } from "./scenario-transition";
import { validateScenario, validateObjectiveReachability } from "./scenario-validation";
export function prepareScenario(d: ScenarioDefinition) {
  validateScenario(d);
  validateObjectiveReachability(d);
}
export function createScenarioState(d: ScenarioDefinition): ScenarioWorldState {
  prepareScenario(d);
  return initialWorldState(d);
}
export function recordScenarioEvent(
  d: ScenarioDefinition,
  s: ScenarioWorldState,
  e: ScenarioEvent,
) {
  if (e.scenarioId !== d.scenarioId) throw new Error("Scenario event belongs to another scenario.");
  return processScenarioEvent(d, s, e);
}
export function isScenarioComplete(d: ScenarioDefinition, s: ScenarioWorldState) {
  return d.objectives
    .filter((o) => o.required)
    .every((o) => s.completedObjectives.includes(o.objectiveId));
}
