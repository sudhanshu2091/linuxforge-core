import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { loadTutorContext } from "@/lib/forge/engine.server";
import { analyzeLearner } from "@/lib/ai/learner-intelligence";
import { selectAdaptiveTraining } from "@/lib/ai/adaptive-training";
import { buildLearnerJourney } from "./journey-engine";
import {
  createLearningSession,
  type LearningSession,
  type LearningSessionEvent,
  pauseLearningSession,
  resumeLearningSession,
  startTeaching,
  startPractice,
  finishPractice,
  recordSessionAssessment,
  recordReflection,
  completeLearningSession,
  abandonLearningSession,
} from "./learning-session";
import type { SkillId } from "@/lib/forge/types";

export type SessionDb = SupabaseClient<Database>;

function parseSession(
  row: Database["public"]["Tables"]["learning_sessions"]["Row"],
  events: Database["public"]["Tables"]["learning_session_events"]["Row"][],
): LearningSession {
  const plan = row.plan as unknown as LearningSession["plan"];
  return {
    version: "v42",
    id: row.id,
    status: row.status as LearningSession["status"],
    phase: row.phase as LearningSession["phase"],
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    plan,
    activityId: row.activity_id,
    challengeId: row.challenge_id,
    lastVerification: row.last_verification as LearningSession["lastVerification"],
    events: events.map((event) => ({
      type: event.event_type as LearningSessionEvent["type"],
      phase: event.phase as LearningSessionEvent["phase"],
      at: event.created_at,
      ...(event.data !== null && event.data !== undefined
        ? { data: event.data as LearningSessionEvent["data"] }
        : {}),
    })),
  };
}

async function saveSession(
  db: SessionDb,
  userId: string,
  session: LearningSession,
  eventStart: number,
) {
  const sessionRow: Database["public"]["Tables"]["learning_sessions"]["Insert"] = {
    id: session.id,
    user_id: userId,
    status: session.status,
    phase: session.phase,
    activity_id: session.activityId,
    challenge_id: session.challengeId,
    started_at: session.startedAt,
    updated_at: session.updatedAt,
    completed_at: session.completedAt,
    plan: session.plan as unknown as NonNullable<
      Database["public"]["Tables"]["learning_sessions"]["Insert"]["plan"]
    >,
    ...(session.lastVerification !== null
      ? {
          last_verification: session.lastVerification as unknown as NonNullable<
            Database["public"]["Tables"]["learning_sessions"]["Insert"]["last_verification"]
          >,
        }
      : {}),
  };
  const saved = await db.from("learning_sessions").upsert(sessionRow);
  if (saved.error) throw new Error(saved.error.message);
  const newEvents = session.events.slice(eventStart);
  if (newEvents.length) {
    const inserted = await db.from("learning_session_events").insert(
      newEvents.map((event) => ({
        session_id: session.id,
        user_id: userId,
        event_type: event.type,
        phase: event.phase,
        created_at: event.at,
        ...(event.data !== undefined
          ? {
              data: event.data as NonNullable<
                Database["public"]["Tables"]["learning_session_events"]["Insert"]["data"]
              >,
            }
          : {}),
      })),
    );
    if (inserted.error) throw new Error(inserted.error.message);
  }
  return session;
}

export async function startOrRestoreLearningSession(
  db: SessionDb,
  userId: string,
  requestedId?: string,
): Promise<LearningSession> {
  if (requestedId) {
    const existing = await db
      .from("learning_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("id", requestedId)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) {
      const events = await db
        .from("learning_session_events")
        .select("*")
        .eq("user_id", userId)
        .eq("session_id", requestedId)
        .order("created_at", { ascending: true });
      if (events.error) throw new Error(events.error.message);
      return parseSession(existing.data, events.data ?? []);
    }
  }

  const active = await db
    .from("learning_sessions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["ACTIVE", "PAUSED"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active.error) throw new Error(active.error.message);
  if (active.data) {
    const events = await db
      .from("learning_session_events")
      .select("*")
      .eq("user_id", userId)
      .eq("session_id", active.data.id)
      .order("created_at", { ascending: true });
    if (events.error) throw new Error(events.error.message);
    return parseSession(active.data, events.data ?? []);
  }

  const learner = await loadTutorContext(db, userId);
  const skills = learner.skills.map((s) => ({
    skillId: s.skill_id as SkillId,
    mastery: s.mastery,
    attempts: s.attempts,
    successfulAttempts: s.successful_attempts,
    recentScore: s.recent_score ?? null,
    recentMistakes: s.recent_mistakes ?? [],
    hintDependency: s.hint_dependency,
    lastPracticed: s.last_practiced ?? null,
    nextReview: s.next_review ?? null,
    confidence: s.confidence,
    retention: s.retention,
    independence: s.independence,
    speedScore: s.speed_score,
    consistency: s.consistency,
    difficultyRating: s.difficulty_rating,
    evidenceCount: s.evidence_count,
  }));
  const intelligence = analyzeLearner(
    skills,
    skills.flatMap((s) => s.recentMistakes),
  );
  const trainingDecision = selectAdaptiveTraining({
    skills,
    intelligence,
    currentDifficulty: Math.max(1, Math.min(5, learner.progression?.level ?? 1)),
  });
  const journey = buildLearnerJourney({ skills, trainingDecision });
  const session = createLearningSession({
    id: `ls-${crypto.randomUUID()}`,
    trainingDecision,
    journey,
  });
  return saveSession(db, userId, session, 0);
}

export async function loadLearningSession(
  db: SessionDb,
  userId: string,
  sessionId: string,
): Promise<LearningSession> {
  const row = await db
    .from("learning_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", sessionId)
    .single();
  if (row.error) throw new Error(row.error.message);
  const events = await db
    .from("learning_session_events")
    .select("*")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (events.error) throw new Error(events.error.message);
  return parseSession(row.data, events.data ?? []);
}

export async function transitionLearningSession(
  db: SessionDb,
  userId: string,
  sessionId: string,
  action:
    | "teach"
    | "practice"
    | "finish-practice"
    | "assess"
    | "reflect"
    | "complete"
    | "pause"
    | "resume"
    | "abandon",
  assessment?: { status: Parameters<typeof recordSessionAssessment>[1]["status"]; score: number },
): Promise<LearningSession> {
  const session = await loadLearningSession(db, userId, sessionId);
  const eventStart = session.events.length;
  const now = new Date();
  let next = session;
  if (action === "teach") next = startTeaching(session, now);
  else if (action === "practice") next = startPractice(session, now);
  else if (action === "finish-practice") next = finishPractice(session, now);
  else if (action === "assess" && assessment)
    next = recordSessionAssessment(session, assessment, now);
  else if (action === "reflect") next = recordReflection(session, now);
  else if (action === "complete") next = completeLearningSession(session, now);
  else if (action === "pause") next = pauseLearningSession(session, now);
  else if (action === "resume") next = resumeLearningSession(session, now);
  else if (action === "abandon") next = abandonLearningSession(session, now);
  return saveSession(db, userId, next, eventStart);
}
