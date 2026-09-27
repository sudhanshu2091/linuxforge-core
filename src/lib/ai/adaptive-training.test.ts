import { describe, expect, it } from "vitest";
import { selectAdaptiveTraining } from "./adaptive-training";
import type { LearnerIntelligence } from "./learner-intelligence";
import type { SkillMemoryView } from "@/lib/forge/types";

const intelligence = (overrides: Partial<LearnerIntelligence> = {}): LearnerIntelligence => ({
  focusSkills: ["filesystem"],
  fragileSkills: [],
  masteredSkills: [],
  dominantMistakes: [],
  repeatedMistakes: [],
  averageMastery: 55,
  hintDependency: 20,
  independence: 65,
  confidence: 65,
  readiness: 60,
  difficultyAdjustment: 0,
  signals: ["BUILDING"],
  explanation: "test",
  ...overrides,
});

const skill = (overrides: Partial<SkillMemoryView> = {}): SkillMemoryView => ({
  skillId: "filesystem",
  mastery: 50,
  attempts: 5,
  successfulAttempts: 3,
  recentScore: 65,
  recentMistakes: [],
  hintDependency: 20,
  lastPracticed: null,
  nextReview: null,
  confidence: 60,
  retention: 60,
  independence: 70,
  evidenceCount: 5,
  ...overrides,
});

describe("V36 adaptive training engine", () => {
  it("chooses remediation for unsafe evidence", () => {
    const decision = selectAdaptiveTraining({
      skills: [skill({ recentMistakes: ["UNSAFE_APPROACH"] })],
      intelligence: intelligence({ readiness: 85 }),
      currentDifficulty: 3,
    });
    expect(decision.mode).toBe("REMEDIATION");
    expect(decision.difficulty).toBe(3);
    expect(decision.constraints.join(" ")).toContain("isolated lab");
  });

  it("prioritizes spaced review when a skill is due", () => {
    const decision = selectAdaptiveTraining({
      skills: [skill({ mastery: 80, confidence: 80, nextReview: "2000-01-01T00:00:00.000Z" })],
      intelligence: intelligence({ readiness: 70 }),
      currentDifficulty: 3,
    });
    expect(decision.mode).toBe("SPACED_REVIEW");
    expect(decision.sourceStrategy).toBe("review-patterns");
  });

  it("progresses only with strong independent evidence", () => {
    const decision = selectAdaptiveTraining({
      skills: [
        skill({
          mastery: 92,
          confidence: 90,
          retention: 92,
          independence: 90,
          hintDependency: 10,
          recentScore: 92,
          successfulAttempts: 5,
          recentMistakes: [],
        }),
      ],
      intelligence: intelligence({
        readiness: 85,
        independence: 90,
        hintDependency: 10,
        difficultyAdjustment: 1,
      }),
      assessment: { learningSignal: "mastered", grade: 92, mistakeBreakdown: [], hintsUsed: 0 },
      currentDifficulty: 3,
    });
    expect(decision.mode).toBe("PROGRESSION");
    expect(decision.masteryGate).toBe("ADVANCE");
    expect(decision.difficulty).toBe(5);
  });

  it("uses transfer instead of automatic progression for ready learners without mastery evidence", () => {
    const decision = selectAdaptiveTraining({
      skills: [skill({ mastery: 72, confidence: 75, independence: 75, hintDependency: 20 })],
      intelligence: intelligence({ readiness: 68, independence: 75, confidence: 75 }),
      currentDifficulty: 2,
    });
    expect(decision.mode).toBe("TRANSFER");
    expect(decision.sourceStrategy).toBe("transfer-patterns");
  });

  it("keeps dependent learners at controlled difficulty", () => {
    const decision = selectAdaptiveTraining({
      skills: [skill({ mastery: 45, confidence: 45, hintDependency: 80, independence: 25 })],
      intelligence: intelligence({
        readiness: 35,
        hintDependency: 80,
        independence: 25,
        difficultyAdjustment: -1,
      }),
      currentDifficulty: 4,
    });
    expect(["REMEDIATION", "GUIDED_PRACTICE"]).toContain(decision.mode);
    expect(decision.difficulty).toBeLessThanOrEqual(4);
    expect(decision.constraints.join(" ")).toContain("independent");
  });

  it("carries curriculum journey context into the training decision", () => {
    const decision = selectAdaptiveTraining({
      skills: [
        skill({
          skillId: "filesystem",
          mastery: 92,
          confidence: 90,
          retention: 92,
          independence: 90,
          successfulAttempts: 5,
          recentScore: 92,
          evidenceCount: 5,
        }),
        skill({
          skillId: "permissions",
          mastery: 10,
          confidence: 20,
          attempts: 0,
          successfulAttempts: 0,
          evidenceCount: 0,
        }),
      ],
      intelligence: intelligence({ readiness: 85, independence: 90 }),
    });
    expect(decision.journeyPhase).toBe("Linux Foundations");
    expect(decision.journeyNextSkills).toContain("iteration");
  });

  it("preserves prerequisite skills in the training decision", () => {
    const decision = selectAdaptiveTraining({
      skills: [
        skill({ skillId: "hardening", mastery: 40, confidence: 40 }),
        skill({ skillId: "permissions", mastery: 70, confidence: 70 }),
        skill({
          skillId: "filesystem",
          mastery: 80,
          confidence: 70,
          retention: 70,
          independence: 65,
          attempts: 4,
          successfulAttempts: 4,
          recentScore: 80,
          evidenceCount: 4,
        }),
      ],
      intelligence: intelligence({ focusSkills: ["hardening"] }),
    });
    expect(decision.primarySkill).toBe("hardening");
    expect(decision.supportingSkills).toContain("permissions");
    expect(decision.supportingSkills).toContain("filesystem");
  });
});
