/**
 * V42 — Learning Session Engine.
 *
 * Deterministic session orchestration. It coordinates existing V35/V36/V37/V41
 * outputs without becoming authoritative for mastery, grading, lab control, or security.
 */
import type { SkillId, VerificationStatus } from "@/lib/forge/types";
import type { LearningMode, TrainingDecision } from "@/lib/ai/adaptive-training";
import type { LearnerJourney } from "./journey-types";

export type LearningSessionPhase =
  "ORIENT" | "TEACH" | "PRACTICE" | "VERIFY" | "REFLECT" | "COMPLETE";

export type LearningSessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "ABANDONED";

export type LearningSessionEventType =
  | "SESSION_STARTED"
  | "PHASE_STARTED"
  | "TEACHING_VIEWED"
  | "ACTIVITY_STARTED"
  | "ACTIVITY_COMPLETED"
  | "ASSESSMENT_RECORDED"
  | "REFLECTION_RECORDED"
  | "SESSION_PAUSED"
  | "SESSION_RESUMED"
  | "SESSION_COMPLETED"
  | "SESSION_ABANDONED";

export type LearningSessionEvent = {
  type: LearningSessionEventType;
  phase: LearningSessionPhase;
  at: string;
  data?: Record<string, string | number | boolean | null> | undefined;
};

export type LearningSessionPlan = {
  version: "v42";
  mode: LearningMode;
  primarySkill: SkillId;
  supportingSkills: readonly SkillId[];
  difficulty: number;
  rationale: string;
  phases: LearningSessionPhase[];
  initialPhase: "ORIENT";
  teachingGoal: string;
  practiceGoal: string;
  verificationGoal: string;
  reflectionPrompt: string;
};

export type LearningSession = {
  version: "v42";
  id: string;
  status: LearningSessionStatus;
  phase: LearningSessionPhase;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  plan: LearningSessionPlan;
  activityId: string | null;
  challengeId: string | null;
  lastVerification: { status: VerificationStatus; score: number } | null;
  events: LearningSessionEvent[];
};

export type BuildLearningSessionInput = {
  id: string;
  now?: Date;
  trainingDecision: Omit<
    Pick<TrainingDecision, "mode" | "primarySkill" | "supportingSkills" | "difficulty" | "reason">,
    "supportingSkills"
  > & {
    supportingSkills: readonly SkillId[];
  };
  journey: Pick<LearnerJourney, "currentPhaseName" | "recommendedAction" | "rationale">;
  activityId?: string | null;
  challengeId?: string | null;
  teachingGoal?: string;
  practiceGoal?: string;
  verificationGoal?: string;
};

const PHASES: LearningSessionPhase[] = [
  "ORIENT",
  "TEACH",
  "PRACTICE",
  "VERIFY",
  "REFLECT",
  "COMPLETE",
];

export function buildLearningSessionPlan(input: BuildLearningSessionInput): LearningSessionPlan {
  const teachingGoal =
    input.teachingGoal ??
    `Understand the target concept for ${input.trainingDecision.primarySkill} before practicing it.`;
  const practiceGoal =
    input.practiceGoal ??
    `Demonstrate ${input.trainingDecision.primarySkill} through an observable activity at difficulty ${input.trainingDecision.difficulty}.`;
  const verificationGoal =
    input.verificationGoal ??
    "Use objective evidence from the existing verifier/assessment pipeline; the session engine does not grade the learner.";
  return {
    version: "v42",
    mode: input.trainingDecision.mode,
    primarySkill: input.trainingDecision.primarySkill,
    supportingSkills: [...input.trainingDecision.supportingSkills],
    difficulty: input.trainingDecision.difficulty,
    rationale: `${input.trainingDecision.reason} Journey phase: ${input.journey.currentPhaseName}. ${input.journey.rationale}`,
    phases: [...PHASES],
    initialPhase: "ORIENT",
    teachingGoal,
    practiceGoal,
    verificationGoal,
    reflectionPrompt:
      "What did you understand, what went wrong (if anything), and what would you try independently next time?",
  };
}

export function createLearningSession(input: BuildLearningSessionInput): LearningSession {
  const now = input.now ?? new Date();
  const at = now.toISOString();
  const plan = buildLearningSessionPlan(input);
  return {
    version: "v42",
    id: input.id,
    status: "ACTIVE",
    phase: "ORIENT",
    startedAt: at,
    updatedAt: at,
    completedAt: null,
    plan,
    activityId: input.activityId ?? null,
    challengeId: input.challengeId ?? null,
    lastVerification: null,
    events: [
      { type: "SESSION_STARTED", phase: "ORIENT", at },
      { type: "PHASE_STARTED", phase: "ORIENT", at },
    ],
  };
}

function transition(
  session: LearningSession,
  phase: LearningSessionPhase,
  now: Date,
  eventType: LearningSessionEventType,
  data?: Record<string, string | number | boolean | null>,
): LearningSession {
  const at = now.toISOString();
  return {
    ...session,
    phase,
    updatedAt: at,
    events: [
      ...session.events,
      { type: eventType, phase, at, ...(data ? { data } : {}) },
      ...(session.phase !== phase ? [{ type: "PHASE_STARTED" as const, phase, at }] : []),
    ],
  };
}

export function pauseLearningSession(session: LearningSession, now = new Date()): LearningSession {
  if (session.status !== "ACTIVE") return session;
  const at = now.toISOString();
  return {
    ...session,
    status: "PAUSED",
    updatedAt: at,
    events: [...session.events, { type: "SESSION_PAUSED", phase: session.phase, at }],
  };
}

export function resumeLearningSession(session: LearningSession, now = new Date()): LearningSession {
  if (session.status !== "PAUSED") return session;
  const at = now.toISOString();
  return {
    ...session,
    status: "ACTIVE",
    updatedAt: at,
    events: [...session.events, { type: "SESSION_RESUMED", phase: session.phase, at }],
  };
}

export function startTeaching(session: LearningSession, now = new Date()): LearningSession {
  if (session.status !== "ACTIVE" || session.phase !== "ORIENT") return session;
  return transition(session, "TEACH", now, "TEACHING_VIEWED");
}

export function startPractice(session: LearningSession, now = new Date()): LearningSession {
  if (session.status !== "ACTIVE" || session.phase !== "TEACH") return session;
  return transition(session, "PRACTICE", now, "ACTIVITY_STARTED");
}

export function finishPractice(session: LearningSession, now = new Date()): LearningSession {
  if (session.status !== "ACTIVE" || session.phase !== "PRACTICE") return session;
  return transition(session, "VERIFY", now, "ACTIVITY_COMPLETED");
}

export function recordSessionAssessment(
  session: LearningSession,
  input: { status: VerificationStatus; score: number },
  now = new Date(),
): LearningSession {
  if (session.status !== "ACTIVE" || session.phase !== "VERIFY") return session;
  const score = Math.max(0, Math.min(100, Math.round(input.score)));
  return transition(
    { ...session, lastVerification: { status: input.status, score } },
    "REFLECT",
    now,
    "ASSESSMENT_RECORDED",
    { status: input.status, score },
  );
}

export function recordReflection(session: LearningSession, now = new Date()): LearningSession {
  if (session.status !== "ACTIVE" || session.phase !== "REFLECT") return session;
  return transition(session, "COMPLETE", now, "REFLECTION_RECORDED");
}

export function completeLearningSession(
  session: LearningSession,
  now = new Date(),
): LearningSession {
  if (session.status !== "ACTIVE" || session.phase !== "COMPLETE") return session;
  const at = now.toISOString();
  return {
    ...session,
    status: "COMPLETED",
    completedAt: at,
    updatedAt: at,
    events: [...session.events, { type: "SESSION_COMPLETED", phase: "COMPLETE", at }],
  };
}

export function abandonLearningSession(
  session: LearningSession,
  now = new Date(),
): LearningSession {
  if (session.status === "COMPLETED" || session.status === "ABANDONED") return session;
  const at = now.toISOString();
  return {
    ...session,
    status: "ABANDONED",
    updatedAt: at,
    events: [...session.events, { type: "SESSION_ABANDONED", phase: session.phase, at }],
  };
}

export function canAdvanceSession(session: LearningSession): boolean {
  return session.status === "ACTIVE" && session.phase !== "COMPLETE";
}
