import type { ScenarioEvent } from "./scenario-types";
export function normalizeScenarioEvidence(
  e: ScenarioEvent,
): Record<string, string | number | boolean | null> {
  return {
    eventId: e.eventId,
    eventType: e.type,
    runtimeId: e.runtimeId,
    objectiveId: e.objectiveId ?? null,
    ...e.data,
  };
}
export function assertScenarioEvidenceBinding(i: {
  authorizedLearnerId: string;
  authorizedScenarioId: string;
  authorizedRuntimeId: string;
  event: ScenarioEvent;
}) {
  if (
    i.event.learnerId !== i.authorizedLearnerId ||
    i.event.scenarioId !== i.authorizedScenarioId ||
    i.event.runtimeId !== i.authorizedRuntimeId
  )
    throw new Error("Scenario evidence binding mismatch.");
}
