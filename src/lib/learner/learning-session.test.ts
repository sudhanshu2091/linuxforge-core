import { describe, expect, it } from "vitest";
import {
  abandonLearningSession,
  buildLearningSessionPlan,
  completeLearningSession,
  createLearningSession,
  finishPractice,
  pauseLearningSession,
  recordReflection,
  recordSessionAssessment,
  resumeLearningSession,
  startPractice,
  startTeaching,
} from "./learning-session";

const input = {
  id: "session-1",
  now: new Date("2026-09-17T10:00:00.000Z"),
  trainingDecision: {
    mode: "GUIDED_PRACTICE" as const,
    primarySkill: "filesystem" as const,
    supportingSkills: [] as const,
    difficulty: 2,
    reason: "Focused practice is needed.",
  },
  journey: {
    currentPhaseName: "Linux Foundations",
    recommendedAction: "PRACTICE" as const,
    rationale: "Build more evidence.",
  },
};

describe("V42 learning session", () => {
  it("builds a deterministic session plan from existing engines", () => {
    const plan = buildLearningSessionPlan(input);
    expect(plan.version).toBe("v42");
    expect(plan.mode).toBe("GUIDED_PRACTICE");
    expect(plan.primarySkill).toBe("filesystem");
    expect(plan.phases).toEqual(["ORIENT", "TEACH", "PRACTICE", "VERIFY", "REFLECT", "COMPLETE"]);
  });

  it("moves through the full session lifecycle without grading", () => {
    let session = createLearningSession(input);
    session = startTeaching(session, new Date("2026-09-17T10:01:00.000Z"));
    session = startPractice(session, new Date("2026-09-17T10:02:00.000Z"));
    session = finishPractice(session, new Date("2026-09-17T10:05:00.000Z"));
    session = recordSessionAssessment(
      session,
      { status: "COMPLETE", score: 92 },
      new Date("2026-09-17T10:06:00.000Z"),
    );
    session = recordReflection(session, new Date("2026-09-17T10:07:00.000Z"));
    session = completeLearningSession(session, new Date("2026-09-17T10:08:00.000Z"));
    expect(session.status).toBe("COMPLETED");
    expect(session.phase).toBe("COMPLETE");
    expect(session.lastVerification).toEqual({ status: "COMPLETE", score: 92 });
    expect(session.completedAt).toBe("2026-09-17T10:08:00.000Z");
  });

  it("does not allow invalid phase skips", () => {
    let session = createLearningSession(input);
    session = startPractice(session);
    expect(session.phase).toBe("ORIENT");
    session = startTeaching(session);
    session = finishPractice(session);
    expect(session.phase).toBe("TEACH");
  });

  it("supports pause and resume without losing phase", () => {
    let session = startTeaching(createLearningSession(input));
    session = pauseLearningSession(session);
    expect(session.status).toBe("PAUSED");
    session = resumeLearningSession(session);
    expect(session.status).toBe("ACTIVE");
    expect(session.phase).toBe("TEACH");
  });

  it("clamps assessment scores and keeps verifier status authoritative", () => {
    let session = createLearningSession(input);
    session = startTeaching(session);
    session = startPractice(session);
    session = finishPractice(session);
    session = recordSessionAssessment(session, { status: "INCOMPLETE", score: 140 });
    expect(session.lastVerification).toEqual({ status: "INCOMPLETE", score: 100 });
  });

  it("can abandon an active session and cannot revive it through resume", () => {
    const session = abandonLearningSession(createLearningSession(input));
    expect(session.status).toBe("ABANDONED");
    expect(resumeLearningSession(session).status).toBe("ABANDONED");
  });
});
