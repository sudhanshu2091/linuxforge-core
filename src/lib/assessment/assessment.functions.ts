import type { AssessmentBlueprint } from "./professional-assessment";
import { validateBlueprint } from "./professional-assessment";
import { assertAssessmentOwner, assertRuntimeAllowed } from "./assessment-authorization.server";

export function authorizeAssessmentAction(input: {
  authenticatedLearnerId: string;
  assessmentLearnerId: string;
  blueprint: AssessmentBlueprint;
  requestedRuntimeId: string;
}): void {
  assertAssessmentOwner(input);
  validateBlueprint(input.blueprint);
  assertRuntimeAllowed({
    assessmentRuntimeIds: input.blueprint.environment.runtimeIds,
    requestedRuntimeId: input.requestedRuntimeId,
  });
}
