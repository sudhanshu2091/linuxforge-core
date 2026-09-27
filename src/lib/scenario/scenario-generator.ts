import type { ScenarioDefinition } from "./scenario-types";
import { validateScenario, validateObjectiveReachability } from "./scenario-validation";
export function validateGeneratedScenario(d: ScenarioDefinition) {
  validateScenario(d);
  validateObjectiveReachability(d);
  return structuredClone(d);
}
