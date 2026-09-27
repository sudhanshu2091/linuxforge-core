import type { ProfessionalAssessmentResult } from "./assessment-evaluator";
import type { AssessmentBlueprint } from "./professional-assessment";

export type AssessmentReport = {
  assessmentId: string;
  title: string;
  executiveSummary: string;
  scope: AssessmentBlueprint["scope"];
  objectives: ProfessionalAssessmentResult["objectives"];
  dimensions: ProfessionalAssessmentResult["dimensions"];
  overallScore: number;
  outcome: ProfessionalAssessmentResult["outcome"];
  integrityStatus: ProfessionalAssessmentResult["integrityStatus"];
};

export function buildAssessmentReport(
  blueprint: AssessmentBlueprint,
  result: ProfessionalAssessmentResult,
): AssessmentReport {
  const verb =
    result.outcome === "PASS"
      ? "demonstrated the required capabilities"
      : result.outcome === "INCOMPLETE"
        ? "did not provide enough evidence for evaluation"
        : "did not meet the assessment requirements";
  return {
    assessmentId: blueprint.assessmentId,
    title: blueprint.title,
    executiveSummary: `The learner ${verb}. Overall score: ${result.overallScore}/100.`,
    scope: blueprint.scope,
    objectives: result.objectives,
    dimensions: result.dimensions,
    overallScore: result.overallScore,
    outcome: result.outcome,
    integrityStatus: result.integrityStatus,
  };
}
