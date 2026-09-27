import { describe, expect, it } from "vitest";
import { buildMissionAssessment } from "./assessment.server";
import type { Verification } from "./types";

const complete: Verification = {
  status: "COMPLETE",
  objectives: [{ label: "target exists", met: true, evidence: "present" }],
  score: 100,
  message: "done",
  remediation: [],
  wentWell: [],
};

describe("mission assessment", () => {
  it("summarises verified execution evidence without changing the verifier grade", () => {
    const result = buildMissionAssessment({
      contract: { difficulty: 2, requiredSkills: ["filesystem"] },
      verification: complete,
      commands: [
        {
          commands: ["mkdir project"],
          exitCode: 0,
          mutationCount: 1,
          blocked: null,
          usedLoop: false,
        },
        { commands: ["ls"], exitCode: 0, mutationCount: 0, blocked: null, usedLoop: false },
      ],
      observations: [
        {
          category: "INDEPENDENT_SOLUTION",
          conceptUnderstanding: "solid",
          skillDemonstrated: true,
        },
      ],
      hintsUsed: 0,
      startedAt: "2026-09-16T10:00:00.000Z",
      completedAt: "2026-09-16T10:02:10.000Z",
      now: new Date("2026-09-16T10:02:10.000Z"),
    });
    expect(result.grade).toBe(100);
    expect(result.objectivesMet).toBe(1);
    expect(result.commandCount).toBe(2);
    expect(result.mutationOperations).toBe(1);
    expect(result.elapsedSeconds).toBe(130);
    expect(result.learningSignal).toBe("mastered");
    expect(result.evidenceQuality.cleanExecution).toBe(true);
    expect(result.evidenceQuality.independenceSignal).toBe("high");
  });

  it("counts mistake categories and blocked commands", () => {
    const result = buildMissionAssessment({
      contract: { difficulty: 1, requiredSkills: ["filesystem"] },
      verification: {
        ...complete,
        status: "INCOMPLETE",
        score: 0,
        objectives: [{ label: "target", met: false, evidence: "missing" }],
      },
      commands: [
        {
          commands: ["mkdr project"],
          exitCode: 1,
          mutationCount: 0,
          blocked: null,
          usedLoop: false,
        },
        {
          commands: ["sudo mkdir project"],
          exitCode: 1,
          mutationCount: 0,
          blocked: "policy",
          usedLoop: false,
        },
      ],
      observations: [
        { category: "TYPO", conceptUnderstanding: "partial", skillDemonstrated: false },
        { category: "UNSAFE_APPROACH", conceptUnderstanding: "partial", skillDemonstrated: false },
      ],
      hintsUsed: 2,
      startedAt: "2026-09-16T10:00:00.000Z",
      completedAt: null,
      now: new Date("2026-09-16T10:03:00.000Z"),
    });
    expect(result.failedCommands).toBe(2);
    expect(result.blockedCommands).toBe(1);
    expect(result.mistakeBreakdown).toEqual([
      { category: "TYPO", count: 1 },
      { category: "UNSAFE_APPROACH", count: 1 },
    ]);
    expect(result.nextActions.some((item) => item.includes("Typo"))).toBe(true);
    expect(result.evidenceQuality.cleanExecution).toBe(false);
    expect(result.evidenceQuality.independenceSignal).toBe("low");
  });
});
