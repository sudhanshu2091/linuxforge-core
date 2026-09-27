/** Server-side authorization helpers. These require the caller to supply data already loaded by an authenticated server function. */
export function assertAssessmentOwner(input: {
  authenticatedLearnerId: string;
  assessmentLearnerId: string;
}): void {
  if (!input.authenticatedLearnerId || input.authenticatedLearnerId !== input.assessmentLearnerId)
    throw new Error("Assessment access denied.");
}
export function assertRuntimeAllowed(input: {
  assessmentRuntimeIds: readonly string[];
  requestedRuntimeId: string;
}): void {
  if (!input.assessmentRuntimeIds.includes(input.requestedRuntimeId))
    throw new Error("Assessment runtime access denied.");
}
