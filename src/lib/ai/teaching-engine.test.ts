import { describe, expect, it } from "vitest";
import { decideTeachingStrategy } from "./teaching-engine";

describe("V29 teaching strategy", () => {
  const base = {
    learnerLevel: 2,
    desiredDifficulty: 2,
    mastery: { filesystem: 35 },
    focusSkills: ["filesystem"] as const,
    recentMistakes: [],
    latestMistake: null,
    failedCommands: 0,
    attempts: 0,
    hintsUsed: 0,
    previousHintStages: [],
    objective: "Create a child directory using a relative path",
    currentTerminalState: "",
  };

  it("starts with discovery instead of dumping a command", () => {
    const decision = decideTeachingStrategy(base);
    expect(decision.strategy).toBe("DISCOVER");
    expect(decision.revealAnswer).toBe(false);
  });

  it("moves to diagnosis when there is concrete failure evidence", () => {
    const decision = decideTeachingStrategy({
      ...base,
      attempts: 2,
      failedCommands: 1,
      latestMistake: "WRONG_PATH",
      recentMistakes: ["WRONG_PATH"],
    });
    expect(decision.strategy).toBe("DIAGNOSE");
    expect(decision.knowledge[0]?.id).toBe("fs-paths");
  });

  it("recognizes recurring concept confusion as an explanation need", () => {
    const decision = decideTeachingStrategy({
      ...base,
      attempts: 4,
      hintsUsed: 3,
      latestMistake: "CONCEPT_CONFUSION",
      recentMistakes: ["CONCEPT_CONFUSION", "CONCEPT_CONFUSION"],
    });
    expect(decision.strategy).toBe("EXPLAIN");
    expect(decision.revealAnswer).toBe(true);
  });
});
