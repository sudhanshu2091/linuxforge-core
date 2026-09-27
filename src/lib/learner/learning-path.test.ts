import { describe, expect, it } from "vitest";
import { buildLearningPath, nextLearningChallenge } from "./learning-path";
import type { SkillId } from "@/lib/forge/types";

const item = (id: string, unlocked: boolean, status: "COMPLETE" | "INCOMPLETE" = "INCOMPLETE") => ({
  id,
  order: 1,
  title: id,
  storyIntro: "",
  objective: "",
  requiredSkills: ["filesystem"] as SkillId[],
  allowedApproaches: [],
  bannedShortcuts: [],
  difficulty: 1,
  prerequisites: [],
  previousReferences: [],
  xpReward: 10,
  hintLevels: 1,
  attempt: {
    challengeId: id,
    status,
    attempts: 1,
    bestScore: status === "COMPLETE" ? 100 : 0,
    xpAwarded: 0,
    completedAt: null,
    startedAt: null,
  },
  unlocked,
});

describe("learning path", () => {
  it("derives progress from verified challenge attempts", () => {
    const paths = buildLearningPath([
      item("C01", true, "COMPLETE"),
      item("C02", true),
      item("C03", false),
    ]);
    const linux = paths.find((p) => p.id === "linux")!;
    expect(linux.completed).toBe(1);
    expect(linux.total).toBe(3);
    expect(linux.progress).toBe(33);
    expect(linux.currentChallengeId).toBe("C02");
  });
  it("returns the first actionable challenge across tracks", () => {
    expect(nextLearningChallenge([item("C01", true), item("C02", false)])).toBe("C01");
  });
  it("does not invent progress for tracks without mapped challenges", () => {
    const networking = buildLearningPath([]).find((p) => p.id === "networking")!;
    expect(networking.total).toBe(0);
    expect(networking.progress).toBe(0);
    expect(networking.currentChallengeId).toBeNull();
  });
});
