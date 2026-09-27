import { describe, expect, it } from "vitest";
import { assessSkillMastery, buildMasterySnapshot, decideProgression } from "./mastery-engine";
import type { SkillMemoryView } from "@/lib/forge/types";

const skill = (overrides: Partial<SkillMemoryView> = {}): SkillMemoryView => ({
  skillId: "filesystem",
  mastery: 82,
  attempts: 4,
  successfulAttempts: 4,
  recentScore: 92,
  recentMistakes: [],
  hintDependency: 10,
  lastPracticed: "2026-09-10T00:00:00.000Z",
  nextReview: "2099-01-01T00:00:00.000Z",
  confidence: 85,
  retention: 88,
  independence: 90,
  speedScore: 90,
  consistency: 90,
  difficultyRating: 3,
  evidenceCount: 4,
  ...overrides,
});

describe("V36 mastery and progression engine", () => {
  it("requires multiple independent evidence dimensions for mastery", () => {
    expect(assessSkillMastery(skill()).state).toBe("MASTERED");
    expect(assessSkillMastery(skill({ evidenceCount: 1 })).state).not.toBe("MASTERED");
    expect(assessSkillMastery(skill({ independence: 40 })).state).not.toBe("MASTERED");
  });

  it("marks previously strong but decayed evidence as fragile", () => {
    const result = assessSkillMastery(skill({ retention: 45, confidence: 55, mastery: 78 }));
    expect(result.state).toBe("FRAGILE");
    expect(result.due).toBe(false);
  });

  it("blocks mastery when recent conceptual or safety evidence exists", () => {
    const result = assessSkillMastery(skill({ recentMistakes: ["CONCEPT_CONFUSION"] }));
    expect(result.state).toBe("FUNCTIONAL");
    expect(result.missingGates).toContain("resolve recent concept/safety evidence");
  });

  it("requests a distinct mastery confirmation near the threshold", () => {
    const result = decideProgression({
      skills: [
        skill({
          mastery: 76,
          recentScore: 90,
          confidence: 75,
          retention: 75,
          independence: 80,
          evidenceCount: 3,
        }),
      ],
      targetSkills: ["filesystem"],
      assessment: {
        status: "COMPLETE",
        grade: 90,
        hintsUsed: 0,
        evidenceQuality: {
          methodEvidenceScore: 90,
          recoveryCount: 0,
          independenceSignal: "high",
          cleanExecution: true,
        },
      },
    });
    expect(result.action).toBe("CONFIRM_MASTERY");
  });

  it("advances only after the full mastery gate", () => {
    const result = decideProgression({ skills: [skill()], targetSkills: ["filesystem"] });
    expect(result.action).toBe("ADVANCE");
    expect(result.masteredSkills).toContain("filesystem");
    expect(result.eligibleNextSkills).toContain("permissions");
    expect(result.eligibleNextSkills).toContain("iteration");
  });

  it("keeps dependent skills behind mastered prerequisites", () => {
    const result = decideProgression({
      skills: [skill({ skillId: "permissions" })],
      targetSkills: ["permissions"],
    });
    expect(result.action).toBe("ADVANCE");
    expect(result.eligibleNextSkills).not.toContain("hardening");
    expect(result.eligibleNextSkills).not.toContain("processes");
  });

  it("prioritizes remediation for a blocked assessment", () => {
    const result = decideProgression({
      skills: [skill()],
      targetSkills: ["filesystem"],
      assessment: { status: "BLOCKED_BY_SAFETY_POLICY", grade: 0, hintsUsed: 0 },
    });
    expect(result.action).toBe("REMEDIATE");
  });

  it("builds deterministic snapshots for every persisted skill", () => {
    const result = buildMasterySnapshot([
      skill(),
      skill({ skillId: "permissions", mastery: 50, evidenceCount: 2 }),
    ]);
    expect(result.map((item) => item.skillId)).toEqual(["filesystem", "permissions"]);
    expect(result[1]?.state).toBe("DEVELOPING");
  });
});
