import { describe, expect, it } from "vitest";
import { buildAdaptivePlan } from "./adaptive-plan";
import type { SkillMemoryView } from "@/lib/forge/types";

const skill = (
  skillId: SkillMemoryView["skillId"],
  mastery: number,
  nextReview: string | null = null,
): SkillMemoryView => ({
  skillId,
  mastery,
  attempts: 3,
  successfulAttempts: mastery >= 70 ? 2 : 1,
  recentScore: mastery,
  recentMistakes: [],
  hintDependency: 0,
  lastPracticed: null,
  nextReview,
  confidence: mastery,
});

describe("adaptive plan", () => {
  it("chooses remediation after a weak run", () => {
    const plan = buildAdaptivePlan({
      skills: [skill("filesystem", 35), skill("permissions", 80)],
      assessment: {
        learningSignal: "needs_practice",
        grade: 45,
        hintsUsed: 2,
        mistakeBreakdown: [{ category: "WRONG_PATH", count: 2 }],
      },
      currentDifficulty: 3,
    });
    expect(plan.action).toBe("RETRY_REMEDIATION");
    expect(plan.desiredDifficulty).toBe(2);
    expect(plan.focusSkills).toContain("filesystem");
  });

  it("raises difficulty after a strong mastered run", () => {
    const plan = buildAdaptivePlan({
      skills: [skill("filesystem", 92), skill("permissions", 82)],
      assessment: {
        learningSignal: "mastered",
        grade: 96,
        hintsUsed: 0,
        mistakeBreakdown: [],
      },
      currentDifficulty: 4,
    });
    expect(plan.action).toBe("ADVANCE");
    expect(plan.desiredDifficulty).toBe(5);
  });

  it("prioritizes a due review", () => {
    const plan = buildAdaptivePlan({
      skills: [skill("filesystem", 75, "2020-01-01T00:00:00.000Z"), skill("permissions", 90)],
      assessment: null,
      currentDifficulty: 3,
    });
    expect(plan.action).toBe("REVIEW_WEAK_SKILL");
    expect(plan.focusSkills).toEqual(["filesystem"]);
  });
});
