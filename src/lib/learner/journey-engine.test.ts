import { describe, expect, it } from "vitest";
import { buildLearnerJourney } from "./journey-engine";
import type { SkillMemoryView } from "@/lib/forge/types";

const skill = (
  skillId: SkillMemoryView["skillId"],
  overrides: Partial<SkillMemoryView> = {},
): SkillMemoryView => ({
  skillId,
  mastery: 20,
  attempts: 1,
  successfulAttempts: 0,
  recentScore: 20,
  recentMistakes: [],
  hintDependency: 20,
  lastPracticed: null,
  nextReview: null,
  confidence: 30,
  retention: 30,
  independence: 70,
  evidenceCount: 1,
  ...overrides,
});

const mastered = (skillId: SkillMemoryView["skillId"]): SkillMemoryView =>
  skill(skillId, {
    mastery: 92,
    attempts: 5,
    successfulAttempts: 5,
    recentScore: 92,
    confidence: 90,
    retention: 92,
    independence: 90,
    evidenceCount: 5,
  });

describe("V37 learner journey orchestrator", () => {
  it("starts in foundations and exposes only prerequisite-ready skills", () => {
    const journey = buildLearnerJourney({
      skills: [skill("filesystem"), skill("permissions"), skill("iteration")],
    });
    expect(journey.currentPhase).toBe("FOUNDATIONS");
    expect(journey.readySkills).toContain("filesystem");
    expect(journey.readySkills).not.toContain("permissions");
    expect(journey.blockedSkills).toContain("permissions");
    expect(journey.blockedSkills).toContain("hardening");
  });

  it("moves the journey forward after deterministic mastery without granting it", () => {
    const journey = buildLearnerJourney({
      skills: [mastered("filesystem"), mastered("permissions"), skill("iteration")],
    });
    expect(journey.currentPhase).toBe("SHELL_OPERATOR");
    expect(journey.milestones.find((m) => m.id === "phase:FOUNDATIONS")?.complete).toBe(true);
    expect(journey.readySkills).toContain("iteration");
    expect(journey.nextSkills).toContain("iteration");
  });

  it("keeps fragile skills in the journey review queue", () => {
    const journey = buildLearnerJourney({
      skills: [
        mastered("filesystem"),
        skill("permissions", {
          mastery: 75,
          confidence: 55,
          retention: 50,
          attempts: 4,
          successfulAttempts: 3,
          recentScore: 80,
          evidenceCount: 4,
        }),
      ],
    });
    expect(journey.reviewSkills).toContain("permissions");
    expect(journey.recommendedMode).toBe("SPACED_REVIEW");
  });

  it("preserves the immediate V35 training target while adding curriculum context", () => {
    const journey = buildLearnerJourney({
      skills: [mastered("filesystem"), skill("permissions"), skill("iteration")],
      trainingDecision: { mode: "TRANSFER", primarySkill: "iteration" },
    });
    expect(journey.primarySkill).toBe("iteration");
    expect(journey.recommendedMode).toBe("TRANSFER");
  });

  it("does not expose hardening before its prerequisites are mastered", () => {
    const journey = buildLearnerJourney({
      skills: [
        mastered("filesystem"),
        mastered("permissions"),
        mastered("networking"),
        skill("hardening"),
      ],
    });
    expect(journey.readySkills).toContain("hardening");
    expect(journey.blockedSkills).not.toContain("hardening");
  });
});
