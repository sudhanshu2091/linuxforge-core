import type { ObservationCategory, SkillMemoryView } from "@/lib/forge/types";
import { analyzeLearner, type LearnerIntelligence } from "./learner-intelligence";

export type LearnerIntelligenceSnapshot = LearnerIntelligence & {
  version: "v31";
  generatedAt: string;
  skillEvidence: Record<
    string,
    {
      mastery: number;
      confidence: number;
      retention: number;
      independence: number;
      attempts: number;
      evidenceCount: number;
      recentMistakes: string[];
    }
  >;
  mistakeHeatmap: Partial<Record<ObservationCategory, number>>;
};

export function createLearnerIntelligenceSnapshot(
  skills: readonly SkillMemoryView[],
  recentMistakes: readonly string[] = [],
  now = new Date(),
): LearnerIntelligenceSnapshot {
  const intelligence = analyzeLearner(skills, recentMistakes);
  const mistakeHeatmap: Partial<Record<ObservationCategory, number>> = {};
  for (const skill of skills) {
    for (const mistake of skill.recentMistakes) {
      mistakeHeatmap[mistake as ObservationCategory] =
        (mistakeHeatmap[mistake as ObservationCategory] ?? 0) + 1;
    }
  }
  for (const mistake of recentMistakes) {
    if (isMistake(mistake)) mistakeHeatmap[mistake] = (mistakeHeatmap[mistake] ?? 0) + 1;
  }
  return {
    ...intelligence,
    version: "v31",
    generatedAt: now.toISOString(),
    skillEvidence: Object.fromEntries(
      skills.map((skill) => [
        skill.skillId,
        {
          mastery: skill.mastery,
          confidence: skill.confidence,
          retention: skill.retention ?? skill.mastery,
          independence: skill.independence ?? Math.max(0, 100 - skill.hintDependency),
          attempts: skill.attempts,
          evidenceCount: skill.evidenceCount ?? skill.attempts,
          recentMistakes: [...skill.recentMistakes],
        },
      ]),
    ),
    mistakeHeatmap,
  };
}

export function snapshotSummary(snapshot: LearnerIntelligenceSnapshot): string {
  const topMistakes = Object.entries(snapshot.mistakeHeatmap)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 4)
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");
  return `V31 intelligence ${snapshot.generatedAt}: readiness ${snapshot.readiness}, confidence ${snapshot.confidence}, independence ${snapshot.independence}, hint dependency ${snapshot.hintDependency}; focus ${snapshot.focusSkills.join(", ") || "none"}; mistakes ${topMistakes || "none"}.`;
}

function isMistake(value: string): value is ObservationCategory {
  return [
    "TYPO",
    "WRONG_COMMAND",
    "WRONG_ARGUMENT",
    "WRONG_PATH",
    "WRONG_FILENAME",
    "MISREAD_QUESTION",
    "CONCEPT_CONFUSION",
    "PARTIAL_UNDERSTANDING",
    "UNSAFE_APPROACH",
    "RANDOM_TRIAL_AND_ERROR",
    "SKILL_BYPASS",
    "VALID_ALTERNATIVE",
    "INDEPENDENT_SOLUTION",
  ].includes(value);
}
