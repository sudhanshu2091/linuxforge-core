import { describe, expect, it } from "vitest";
import {
  createLearnerIntelligenceSnapshot,
  snapshotSummary,
} from "./learner-intelligence-snapshot";

describe("V31 learner intelligence snapshot", () => {
  it("materializes skill evidence and mistake heatmap", () => {
    const snapshot = createLearnerIntelligenceSnapshot(
      [
        {
          skillId: "filesystem",
          mastery: 45,
          attempts: 4,
          successfulAttempts: 2,
          recentScore: 55,
          recentMistakes: ["WRONG_PATH", "WRONG_PATH"],
          hintDependency: 30,
          lastPracticed: null,
          nextReview: null,
          confidence: 50,
          retention: 48,
          independence: 70,
          evidenceCount: 4,
        },
      ],
      ["WRONG_PATH"],
    );
    expect(snapshot.version).toBe("v31");
    expect(snapshot.skillEvidence["filesystem"]?.evidenceCount).toBe(4);
    expect(snapshot.mistakeHeatmap.WRONG_PATH).toBe(3);
    expect(snapshot.focusSkills).toContain("filesystem");
    expect(snapshotSummary(snapshot)).toContain("readiness");
  });

  it("is rebuildable from the same evidence", () => {
    const skills = [
      {
        skillId: "permissions" as const,
        mastery: 82,
        attempts: 5,
        successfulAttempts: 5,
        recentScore: 95,
        recentMistakes: [],
        hintDependency: 5,
        lastPracticed: null,
        nextReview: null,
        confidence: 88,
        retention: 84,
        independence: 92,
        evidenceCount: 5,
      },
    ];
    const a = createLearnerIntelligenceSnapshot(skills, [], new Date("2026-09-17T10:00:00Z"));
    const b = createLearnerIntelligenceSnapshot(skills, [], new Date("2026-09-17T10:00:00Z"));
    expect(a).toEqual(b);
  });
});
