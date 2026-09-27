import { describe, expect, it } from "vitest";
import { buildMissionBlueprint } from "./mission-generator";
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
  independence: 75,
  confidence: 70,
  readiness: 65,
  difficultyAdjustment: 0,
  signals: ["BUILDING"],
  explanation: "test",
  ...overrides,
});

const skills: SkillMemoryView[] = [
  {
    skillId: "filesystem",
    mastery: 40,
    attempts: 5,
    successfulAttempts: 2,
    recentScore: 55,
    recentMistakes: ["WRONG_PATH"],
    hintDependency: 30,
    lastPracticed: null,
    nextReview: null,
    confidence: 50,
    evidenceCount: 5,
  },
  {
    skillId: "permissions",
    mastery: 72,
    attempts: 4,
    successfulAttempts: 3,
    recentScore: 80,
    recentMistakes: [],
    hintDependency: 20,
    lastPracticed: null,
    nextReview: null,
    confidence: 75,
    evidenceCount: 4,
  },
];

describe("V32 mission generator", () => {
  it("targets the weakest skill and retrieves grounded knowledge", () => {
    const plan = buildMissionBlueprint({
      skills,
      intelligence: intelligence(),
      recentMistakes: ["WRONG_PATH"],
    });
    expect(plan.version).toBe("v32");
    expect(plan.primarySkill).toBe("filesystem");
    expect(plan.archetype).toBe("REMEDIATION");
    expect(plan.knowledgeIds.length).toBeGreaterThan(0);
  });

  it("forces safety remediation when unsafe evidence is present", () => {
    const plan = buildMissionBlueprint({
      skills,
      intelligence: intelligence({ dominantMistakes: ["UNSAFE_APPROACH"], readiness: 85 }),
      recentMistakes: ["UNSAFE_APPROACH"],
    });
    expect(plan.archetype).toBe("REMEDIATION");
    expect(plan.mistakeFocus).toBe("UNSAFE_APPROACH");
  });

  it("uses progression only when readiness supports it", () => {
    const strong: SkillMemoryView[] = skills.map((s) => ({
      ...s,
      mastery: 90,
      confidence: 90,
      hintDependency: 10,
      retention: 92,
      independence: 90,
    }));
    const plan = buildMissionBlueprint({
      skills: strong,
      intelligence: intelligence({
        readiness: 85,
        independence: 90,
        difficultyAdjustment: 1,
        focusSkills: ["permissions"],
      }),
      currentDifficulty: 3,
    });
    expect(plan.archetype).toBe("PROGRESSION");
    expect(plan.difficulty).toBe(5);
  });

  it("keeps prerequisite skills visible in the blueprint", () => {
    const plan = buildMissionBlueprint({
      skills,
      intelligence: intelligence(),
      currentDifficulty: 2,
    });
    expect(plan.prerequisites).toContain("filesystem");
  });
});
