import {
  assertAssessmentBinding,
  type AssessmentEnvironmentBinding,
} from "./professional-assessment";

export type AssessmentLabBinding = AssessmentEnvironmentBinding & { assessmentId: string };
export function assertLabBinding(input: {
  expected: AssessmentLabBinding;
  actual: AssessmentLabBinding;
}): void {
  if (input.expected.assessmentId !== input.actual.assessmentId)
    throw new Error("Assessment ID binding mismatch.");
  assertAssessmentBinding(input.expected, input.actual);
}
