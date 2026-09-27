export const ASSESSMENT_EVENT_TYPES = [
  "ASSESSMENT_STARTED",
  "COMMAND_EXECUTED",
  "COMMAND_FAILED",
  "OBJECTIVE_PROGRESS",
  "OBJECTIVE_COMPLETED",
  "ARTIFACT_CREATED",
  "NETWORK_OBSERVED",
  "SERVICE_INTERACTION",
  "HINT_REQUESTED",
  "HINT_USED",
  "SCOPE_VIOLATION",
  "ASSESSMENT_PAUSED",
  "ASSESSMENT_SUBMITTED",
] as const;
export type AssessmentEventType = (typeof ASSESSMENT_EVENT_TYPES)[number];

export type AssessmentEvidenceEvent = {
  eventId: string;
  assessmentId: string;
  learnerId: string;
  timestamp: string;
  eventType: AssessmentEventType;
  objectiveId: string | null;
  runtimeId: string;
  terminalSessionId: string | null;
  evidence: Record<string, string | number | boolean | null>;
};

export function appendEvidence(
  ledger: readonly AssessmentEvidenceEvent[],
  event: AssessmentEvidenceEvent,
): AssessmentEvidenceEvent[] {
  if (!event.eventId || !event.assessmentId || !event.learnerId || !event.runtimeId)
    throw new Error("Assessment evidence identity is required.");
  if (ledger.some((e) => e.eventId === event.eventId))
    throw new Error("Assessment evidence event ID already exists.");
  if (event.eventType === "OBJECTIVE_COMPLETED" && !event.objectiveId)
    throw new Error("Objective completion requires an objective ID.");
  return [...ledger, Object.freeze({ ...event, evidence: Object.freeze({ ...event.evidence }) })];
}

export function evidenceForObjective(
  ledger: readonly AssessmentEvidenceEvent[],
  objectiveId: string,
): AssessmentEvidenceEvent[] {
  return ledger.filter((event) => event.objectiveId === objectiveId);
}

export function countEvent(
  ledger: readonly AssessmentEvidenceEvent[],
  type: AssessmentEventType,
): number {
  return ledger.filter((e) => e.eventType === type).length;
}
