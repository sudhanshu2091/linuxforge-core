import type { AssessmentBlueprint } from "./professional-assessment";
import type { AssessmentEvidenceEvent } from "./assessment-evidence";

export type AssessmentDimension = { name: string; score: number; evidence: string[] };
export type ObjectiveResult = {
  objectiveId: string;
  met: boolean;
  evidenceCount: number;
  evidence: string[];
};
export type ProfessionalAssessmentResult = {
  outcome: "PASS" | "NOT_PASS" | "INCOMPLETE";
  overallScore: number;
  objectiveRate: number;
  objectives: ObjectiveResult[];
  dimensions: AssessmentDimension[];
  integrityStatus: "CLEAN" | "REVIEW_REQUIRED" | "POLICY_VIOLATION";
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function evaluateAssessment(input: {
  blueprint: AssessmentBlueprint;
  evidence: readonly AssessmentEvidenceEvent[];
  dimensionScores?: Record<string, number>;
  integrityStatus?: ProfessionalAssessmentResult["integrityStatus"];
}): ProfessionalAssessmentResult {
  const objectives = input.blueprint.objectives.map((objective) => {
    const events = input.evidence.filter((e) => e.objectiveId === objective.objectiveId);
    const completed = events.some(
      (e) => e.eventType === "OBJECTIVE_COMPLETED" && e.evidence["result"] === true,
    );
    return {
      objectiveId: objective.objectiveId,
      met: completed,
      evidenceCount: events.length,
      evidence: events.map((e) => e.eventType).slice(0, 10),
    };
  });
  const required = objectives.filter((o, i) => input.blueprint.objectives[i]?.required);
  const denominator = required.length || objectives.length;
  const met = (required.length ? required : objectives).filter((o) => o.met).length;
  const objectiveRate = denominator ? met / denominator : 0;
  const dimensions = input.blueprint.scoringDimensions.map((name) => ({
    name,
    score: clamp(input.dimensionScores?.[name] ?? objectiveRate * 100),
    evidence: [`derived from objective evidence for ${name}`],
  }));
  const overallScore = dimensions.length
    ? clamp(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length)
    : clamp(objectiveRate * 100);
  const integrityStatus = input.integrityStatus ?? "CLEAN";
  const incomplete = input.evidence.length === 0;
  const pass =
    !incomplete &&
    integrityStatus === "CLEAN" &&
    objectiveRate >= input.blueprint.passRequirements.minimumObjectiveRate &&
    overallScore >= input.blueprint.passRequirements.minimumOverallScore &&
    Object.entries(input.blueprint.passRequirements.requiredDimensions ?? {}).every(
      ([name, min]) => (dimensions.find((d) => d.name === name)?.score ?? 0) >= min,
    );
  return {
    outcome: incomplete ? "INCOMPLETE" : pass ? "PASS" : "NOT_PASS",
    overallScore,
    objectiveRate,
    objectives,
    dimensions,
    integrityStatus,
  };
}
