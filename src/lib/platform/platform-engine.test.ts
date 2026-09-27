import { describe, expect, it } from "vitest";
import { assessProfessionalEvidence } from "./assessment";
import { classifyCompletion, isNovelQuestion, shouldConsume } from "./novelty";
import { buildProgressionPlan } from "./progression";
import { evaluateSecurity } from "./security";
import { addSquadMember, createSquad, removeSquadMember } from "./squad";
import { chooseRuntimeNode } from "./runtime-fleet";

const baseSkill = {
  skillId: "filesystem" as const,
  mastery: 40,
  attempts: 2,
  successfulAttempts: 1,
  recentScore: 50,
  recentMistakes: [],
  hintDependency: 20,
  lastPracticed: null,
  nextReview: null,
  confidence: 50,
  retention: 50,
  independence: 60,
  speedScore: 50,
  consistency: 50,
  difficultyRating: 2,
  evidenceCount: 2,
};

describe("integrated completion platform", () => {
  it("permanently consumes only independent novel completions", () => {
    expect(classifyCompletion({ verdict: "PASS", hintsUsed: 0, solutionRevealed: false })).toBe(
      "DIRECT",
    );
    expect(shouldConsume("DIRECT")).toBe(true);
    expect(
      isNovelQuestion(
        {
          questionId: "q2",
          variantId: "v1",
          semanticFingerprint: "fp2",
          skillIds: ["filesystem"],
          difficulty: 2,
        },
        [
          {
            questionId: "q1",
            variantId: "v1",
            semanticFingerprint: "fp1",
            completionMode: "DIRECT",
            consumed: true,
            completedAt: new Date().toISOString(),
          },
        ],
      ),
    ).toBe(true);
    expect(
      isNovelQuestion(
        {
          questionId: "q2",
          variantId: "v2",
          semanticFingerprint: "fp1",
          skillIds: ["filesystem"],
          difficulty: 2,
        },
        [
          {
            questionId: "q1",
            variantId: "v1",
            semanticFingerprint: "fp1",
            completionMode: "DIRECT",
            consumed: true,
            completedAt: new Date().toISOString(),
          },
        ],
      ),
    ).toBe(false);
  });

  it("chooses safe capacity and throttles abuse", () => {
    const now = new Date();
    expect(
      chooseRuntimeNode(
        [
          {
            nodeId: "a",
            provider: "qemu",
            endpoint: "x",
            state: "ONLINE",
            activeEnvironments: 1,
            maxEnvironments: 8,
            lastHeartbeatAt: now.toISOString(),
          },
        ],
        now,
      )?.nodeId,
    ).toBe("a");
    const events = Array.from({ length: 120 }, (_, i) => ({
      userId: "u",
      event: String(i),
      decision: "ALLOW" as const,
      reason: "ok",
      occurredAt: now.toISOString(),
    }));
    expect(evaluateSecurity({ recentEvents: events, now }).decision).toBe("THROTTLE");
  });

  it("builds progression from authoritative mastery", () => {
    const plan = buildProgressionPlan({
      skills: [baseSkill],
      score: 40,
      status: "INCOMPLETE",
      difficulty: 2,
    });
    expect(plan.primarySkill).toBe("filesystem");
    expect(plan.action).toBe("PRACTICE");
  });

  it("supports squad lifecycle and assessment evidence", () => {
    let squad = createSquad("owner", "Red Team");
    squad = addSquadMember(squad, "friend");
    expect(squad.members).toHaveLength(2);
    squad = removeSquadMember(squad, "friend");
    expect(squad.members).toHaveLength(1);
    const result = assessProfessionalEvidence(
      [
        {
          skillIds: ["filesystem"],
          score: 100,
          hintsUsed: 0,
          solutionRevealed: false,
          tutorInterventions: 0,
          completionMode: "DIRECT",
          semanticFingerprint: "x",
          exerciseId: "x",
          environmentGeneration: 1,
          completedAt: new Date().toISOString(),
        },
      ],
      ["filesystem"],
    );
    expect(result.passed).toBe(true);
  });
});
