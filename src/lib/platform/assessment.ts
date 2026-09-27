import type { SkillId } from "@/lib/forge/types";
import type { LearnerEvidence } from "./types";

export type AssessmentResult = {
  score: number;
  passed: boolean;
  evidenceCoverage: number;
  independence: number;
  remediation: string[];
};

export function assessProfessionalEvidence(
  evidence: readonly LearnerEvidence[],
  requiredSkills: readonly SkillId[],
): AssessmentResult {
  const skills = new Set(evidence.flatMap((item) => item.skillIds));
  const coverage = requiredSkills.length
    ? requiredSkills.filter((skill) => skills.has(skill)).length / requiredSkills.length
    : 1;
  const independence = evidence.length
    ? evidence.reduce(
        (sum, item) =>
          sum +
          (item.completionMode === "DIRECT" ? 100 : item.completionMode === "ASSISTED" ? 65 : 35),
        0,
      ) / evidence.length
    : 0;
  const score = Math.round(coverage * 60 + independence * 0.4);
  const remediation = requiredSkills
    .filter((skill) => !skills.has(skill))
    .map((skill) => `Collect verified evidence for ${skill}.`);
  return {
    score,
    passed: score >= 70 && coverage >= 0.8,
    evidenceCoverage: Math.round(coverage * 100),
    independence: Math.round(independence),
    remediation,
  };
}
