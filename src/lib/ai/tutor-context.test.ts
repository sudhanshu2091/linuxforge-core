import { describe, expect, it } from "vitest";
import { buildMissionTutorContext } from "./tutor-context";
import type { MissionState } from "@/lib/forge/types";

const state = (overrides: Partial<MissionState> = {}): MissionState => ({
  challenge: {
    id: "C01",
    order: 1,
    title: "Project setup",
    storyIntro: "Start",
    objective: "Create project and a file.",
    requiredSkills: ["filesystem"],
    allowedApproaches: ["mkdir"],
    bannedShortcuts: ["host access"],
    difficulty: 1,
    prerequisites: [],
    previousReferences: [],
    xpReward: 10,
    hintLevels: 3,
  },
  context: {
    learner_level: 2,
    current_mastery: { filesystem: 40 },
    weak_skills: ["filesystem"],
    strong_skills: [],
    recent_mistakes: [],
    recent_challenges: [],
    relevant_previous_objects: [],
    relevant_story_events: [],
    current_lab_state: { labTitle: "Forge", cwd: "project", objects: [] },
    prerequisites: [],
    desired_difficulty: 1,
  },
  attempt: {
    challengeId: "C01",
    status: "INCOMPLETE",
    attempts: 1,
    bestScore: 0,
    xpAwarded: 0,
    completedAt: null,
    startedAt: null,
  },
  catalogue: [],
  transcript: [
    { kind: "input", text: "$ echo password=supersecret" },
    { kind: "error", text: "permission denied" },
  ],
  cwd: "project",
  hints: [],
  hintsRemaining: 3,
  skills: [
    {
      skillId: "filesystem",
      mastery: 40,
      attempts: 2,
      successfulAttempts: 0,
      recentScore: 30,
      recentMistakes: ["WRONG_PATH"],
      hintDependency: 20,
      lastPracticed: null,
      nextReview: null,
      confidence: 40,
    },
  ],
  progression: { totalXp: 20, level: 2, challengesCompleted: 0 },
  lastVerification: null,
  lastObservation: null,
  nextChallengeId: null,
  ...overrides,
});

describe("mission tutor context", () => {
  it("keeps context bounded and preserves learner-relevant state", () => {
    const context = buildMissionTutorContext(state());
    expect(context.mission.id).toBe("C01");
    expect(context.learner.focusSkills).toEqual(["filesystem"]);
    expect(context.run.recentTerminal).toHaveLength(2);
    expect(context.run.recentTerminal.join(" ")).not.toContain("supersecret");
  });

  it("does not expose hidden challenge approach lists", () => {
    const context = buildMissionTutorContext(state());
    expect(JSON.stringify(context)).not.toContain("host access");
    expect(JSON.stringify(context)).not.toContain("allowedApproaches");
  });
});
