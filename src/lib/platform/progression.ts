import type { SkillId, SkillMemoryView } from "@/lib/forge/types";
import { decideProgression } from "@/lib/learner/mastery-engine";
import type { ProgressionPlan } from "./types";

export function buildProgressionPlan(input: {
  skills: readonly SkillMemoryView[];
  targetSkills?: readonly SkillId[];
  score?: number;
  hintsUsed?: number;
  status?:
    | "COMPLETE"
    | "INCOMPLETE"
    | "BLOCKED_BY_SAFETY_POLICY"
    | "RESULT_CORRECT_SKILL_NOT_DEMONSTRATED"
    | "RESULT_INCORRECT_SKILL_DEMONSTRATED";
  difficulty?: number;
}): ProgressionPlan {
  const decision = decideProgression({
    skills: input.skills,
    ...(input.targetSkills !== undefined ? { targetSkills: input.targetSkills } : {}),
    assessment: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.score !== undefined ? { grade: input.score } : {}),
      ...(input.hintsUsed !== undefined ? { hintsUsed: input.hintsUsed } : {}),
    },
  });
  const primary = decision.targetSkills[0] ?? input.skills[0]?.skillId ?? "filesystem";
  return {
    primarySkill: primary,
    supportingSkills: decision.targetSkills.filter((id) => id !== primary).slice(0, 2),
    difficulty: Math.max(1, Math.min(5, input.difficulty ?? 1)),
    action: decision.action,
    rationale: decision.rationale,
  };
}
