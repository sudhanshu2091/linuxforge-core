export function assertScenarioAuthorization(i: {
  authorizedLearnerId: string;
  requestedLearnerId: string;
  authorizedScenarioId: string;
  requestedScenarioId: string;
  authorizedLabId: string;
  requestedLabId: string;
  authorizedRuntimeId: string;
  requestedRuntimeId: string;
}) {
  if (
    i.authorizedLearnerId !== i.requestedLearnerId ||
    i.authorizedScenarioId !== i.requestedScenarioId ||
    i.authorizedLabId !== i.requestedLabId ||
    i.authorizedRuntimeId !== i.requestedRuntimeId
  )
    throw new Error("Scenario access denied.");
}
