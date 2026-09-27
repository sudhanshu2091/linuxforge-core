import { describe, expect, it } from "vitest";
import { analyzeLearner } from "./learner-intelligence";
import type { SkillMemoryView } from "@/lib/forge/types";

const skill = (overrides: Partial<SkillMemoryView>): SkillMemoryView => ({
  skillId: "filesystem",
  mastery: 50,
  attempts: 4,
  successfulAttempts: 2,
  recentScore: 55,
  recentMistakes: [],
  hintDependency: 20,
  lastPracticed: null,
  nextReview: null,
  confidence: 50,
  retention: 50,
  ...overrides,
});

describe("learner intelligence", () => {
  it("detects conceptual weakness and repeated mistakes", () => {
    const result = analyzeLearner([
      skill({
        mastery: 42,
        confidence: 40,
        recentMistakes: ["CONCEPT_CONFUSION", "CONCEPT_CONFUSION"],
      }),
    ]);
    expect(result.focusSkills).toContain("filesystem");
    expect(result.repeatedMistakes).toContain("CONCEPT_CONFUSION");
    expect(result.signals).toContain("CONCEPT_GAP");
  });

  it("raises difficulty only when independent evidence is strong", () => {
    const result = analyzeLearner([
      skill({
        mastery: 92,
        confidence: 90,
        retention: 92,
        independence: 92,
        hintDependency: 5,
        attempts: 12,
        successfulAttempts: 12,
        recentMistakes: [],
      }),
    ]);
    expect(result.difficultyAdjustment).toBe(1);
    expect(result.signals).toContain("INDEPENDENT");
  });

  it("does not raise difficulty for hint-dependent learners", () => {
    const result = analyzeLearner([
      skill({
        mastery: 90,
        confidence: 80,
        retention: 85,
        independence: 40,
        hintDependency: 80,
        attempts: 10,
        successfulAttempts: 9,
      }),
    ]);
    expect(result.difficultyAdjustment).not.toBe(1);
    expect(result.signals).toContain("DEPENDENT");
  });
});
