import type { AssessmentBlueprint, AssessmentState } from "./professional-assessment";
import { transitionAssessment } from "./professional-assessment";

export type AssessmentSession = {
  sessionId: string;
  assessmentId: string;
  learnerId: string;
  state: AssessmentState;
  startedAt: string | null;
  submittedAt: string | null;
  deadlineAt: string | null;
  activeSeconds: number;
  pausedSeconds: number;
};

export function startAssessmentSession(input: {
  sessionId: string;
  learnerId: string;
  blueprint: AssessmentBlueprint;
  now?: Date;
}): AssessmentSession {
  const now = input.now ?? new Date();
  return {
    sessionId: input.sessionId,
    assessmentId: input.blueprint.assessmentId,
    learnerId: input.learnerId,
    state: transitionAssessment("READY", "PROVISIONING"),
    startedAt: null,
    submittedAt: null,
    deadlineAt: new Date(now.getTime() + input.blueprint.durationSeconds * 1000).toISOString(),
    activeSeconds: 0,
    pausedSeconds: 0,
  };
}

export function activateSession(session: AssessmentSession, now = new Date()): AssessmentSession {
  if (session.state !== "PROVISIONING") throw new Error("Assessment session is not provisioning.");
  return {
    ...session,
    state: transitionAssessment(session.state, "ACTIVE"),
    startedAt: now.toISOString(),
  };
}

export function submitSession(session: AssessmentSession, now = new Date()): AssessmentSession {
  if (session.state !== "ACTIVE") throw new Error("Only active assessments can be submitted.");
  const expired = session.deadlineAt !== null && now.getTime() >= Date.parse(session.deadlineAt);
  return {
    ...session,
    state: transitionAssessment(session.state, expired ? "EXPIRED" : "SUBMITTED"),
    submittedAt: now.toISOString(),
  };
}

export function expireIfDue(session: AssessmentSession, now = new Date()): AssessmentSession {
  if (
    session.state !== "ACTIVE" ||
    !session.deadlineAt ||
    now.getTime() < Date.parse(session.deadlineAt)
  )
    return session;
  return {
    ...session,
    state: transitionAssessment(session.state, "EXPIRED"),
    submittedAt: now.toISOString(),
  };
}
