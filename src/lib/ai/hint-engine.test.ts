import { describe, expect, it } from "vitest";
import { buildGuidedHint } from "./hint-engine";

describe("guided hint engine", () => {
  it("starts with concept teaching and targets an observed mistake", () => {
    const hint = buildGuidedHint({
      level: 1,
      totalLevels: 5,
      baseHint: "Think about the directory command.",
      observation: { category: "TYPO", conceptUnderstanding: "solid", skillDemonstrated: true },
      failedCommands: 1,
      attempts: 1,
    });
    expect(hint.stage).toBe("CONCEPT");
    expect(hint.teachingNote).toContain("typo");
    expect(hint.text).toContain("directory command");
  });

  it("only reaches solution stage at the final level", () => {
    expect(
      buildGuidedHint({
        level: 4,
        totalLevels: 5,
        baseHint: "Almost there.",
        observation: null,
        failedCommands: 0,
        attempts: 2,
      }).stage,
    ).toBe("NEAR_SOLUTION");
    expect(
      buildGuidedHint({
        level: 5,
        totalLevels: 5,
        baseHint: "Run the command.",
        observation: null,
        failedCommands: 0,
        attempts: 2,
      }).stage,
    ).toBe("SOLUTION");
  });

  it("uses concept-first coaching when the learner has not tried yet", () => {
    const hint = buildGuidedHint({
      level: 1,
      totalLevels: 5,
      baseHint: "Start by identifying the tool.",
      observation: null,
      failedCommands: 0,
      attempts: 0,
    });
    expect(hint.stage).toBe("CONCEPT");
    expect(hint.teachingNote).toContain("attempt");
  });
});

it("adapts the hint to learner mastery and recurring mistakes", () => {
  const hint = buildGuidedHint({
    level: 2,
    totalLevels: 5,
    baseHint: "Inspect the target path.",
    observation: {
      category: "WRONG_PATH",
      conceptUnderstanding: "partial",
      skillDemonstrated: false,
    },
    failedCommands: 2,
    attempts: 3,
    learnerLevel: 2,
    desiredDifficulty: 2,
    skills: [
      {
        skillId: "filesystem",
        mastery: 35,
        attempts: 4,
        successfulAttempts: 1,
        recentScore: 40,
        recentMistakes: ["WRONG_PATH", "WRONG_PATH"],
        hintDependency: 20,
        lastPracticed: null,
        nextReview: null,
        confidence: 30,
      },
    ],
    mistakeHistory: ["WRONG_PATH", "WRONG_PATH"],
    previousHintStages: ["CONCEPT"],
    objective: "Create a child directory using a relative path",
    currentTerminalState: "cd missing-child",
  });
  expect(hint.strategy).toBe("DIAGNOSE");
  expect(hint.conceptGap).toBeTruthy();
  expect(hint.sourceRefs.length).toBeGreaterThan(0);
});
