import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  currentStreakFromDates,
  levelProgress,
  longestStreakFromDates,
  rankForLevel,
  xpToNextLevel,
  type Rank,
} from "./learner-model";
import { SKILL_LABELS, type SkillId } from "@/lib/forge/types";

export type Db = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];

type SkillView = {
  id: SkillId;
  label: string;
  mastery: number;
  confidence: number;
  attempts: number;
  successfulAttempts: number;
  hintDependency: number;
  recentScore: number | null;
  recentMistakes: string[];
  nextReview: string | null;
  retention: number;
  independence: number;
  speedScore: number;
  consistency: number;
  difficultyRating: number;
  evidenceCount: number;
};

type ChallengeView = {
  id: string;
  status: string;
  score: number;
  attempts: number;
  xpAwarded: number;
  completedAt: string | null;
  updatedAt: string;
};

export type LearnerOverview = {
  profile: {
    displayName: string;
    email: string;
    comfortLevel: Database["public"]["Enums"]["linux_comfort_level"];
    createdAt: string;
  } | null;
  preferences: {
    tutorLanguage: Database["public"]["Enums"]["tutor_language"];
    notifyDailyDrill: boolean;
    notifyStreakRisk: boolean;
    notifySquadActivity: boolean;
    notifyAchievements: boolean;
    notifyEmailDigest: boolean;
  } | null;
  progression: {
    totalXp: number;
    level: number;
    rank: Rank;
    xpToNextLevel: number;
    levelProgress: number;
    challengesCompleted: number;
    labsCompleted: number;
  };
  skills: SkillView[];
  challenges: ChallengeView[];
  activityDates: string[];
  currentStreak: number;
  longestStreak: number;
  accuracy: number;
  firstTryAccuracy: number;
  timeOnTaskMinutes: number;
  commandCount: number;
  activeLab: {
    id: string;
    provider: string;
    environmentId: string;
    status: string;
    lastActiveAt: string;
    expiresAt: string | null;
  } | null;
};

const skillIds = Object.keys(SKILL_LABELS) as SkillId[];

function skillView(row: Tables["learner_skill_memory"]["Row"]): SkillView | null {
  if (!skillIds.includes(row.skill_id as SkillId)) return null;
  return {
    id: row.skill_id as SkillId,
    label: SKILL_LABELS[row.skill_id as SkillId],
    mastery: row.mastery,
    confidence: row.confidence,
    attempts: row.attempts,
    successfulAttempts: row.successful_attempts,
    hintDependency: row.hint_dependency,
    recentScore: row.recent_score,
    recentMistakes: row.recent_mistakes ?? [],
    nextReview: row.next_review,
    retention: row.retention,
    independence: row.independence,
    speedScore: row.speed_score,
    consistency: row.consistency,
    difficultyRating: row.difficulty_rating,
    evidenceCount: row.evidence_count,
  };
}

export async function getLearnerOverview(db: Db, userId: string): Promise<LearnerOverview> {
  const [profile, preferences, progression, skills, attempts, narrative, commands, lab] =
    await Promise.all([
      db.from("learner_profiles").select("*").eq("user_id", userId).maybeSingle(),
      db.from("learner_preferences").select("*").eq("user_id", userId).maybeSingle(),
      db.from("learner_progression").select("*").eq("user_id", userId).maybeSingle(),
      db.from("learner_skill_memory").select("*").eq("user_id", userId).order("skill_id"),
      db
        .from("learner_challenge_attempts")
        .select("challenge_id,status,best_score,attempts,xp_awarded,completed_at,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(100),
      db
        .from("learning_narrative_events")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(365),
      db
        .from("lab_command_events")
        .select("created_at,duration_ms")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000),
      db
        .from("lab_instances")
        .select("id,provider,environment_id,status,last_active_at,expires_at")
        .eq("user_id", userId)
        .order("last_active_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  for (const result of [
    profile,
    preferences,
    progression,
    skills,
    attempts,
    narrative,
    commands,
    lab,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const p = profile.data;
  const pref = preferences.data;
  const prog = progression.data ?? {
    total_xp: 0,
    level: 1,
    challenges_completed: 0,
    labs_completed: 0,
  };
  const challengeRows = attempts.data ?? [];
  const activityDates = [
    ...(narrative.data ?? []).map((r) => r.created_at),
    ...(commands.data ?? []).map((r) => r.created_at),
    ...challengeRows.map((r) => r.completed_at).filter((v): v is string => Boolean(v)),
  ];
  const attempted = challengeRows.filter((r) => r.attempts > 0);
  const completed = attempted.filter((r) => r.status === "COMPLETE");
  const firstTry = attempted.filter((r) => r.attempts === 1);
  const firstTryCompleted = firstTry.filter((r) => r.status === "COMPLETE");
  const durationMs = (commands.data ?? []).reduce(
    (sum, row) => sum + Math.max(0, row.duration_ms),
    0,
  );

  return {
    profile: p
      ? {
          displayName: p.display_name,
          email: p.email,
          comfortLevel: p.linux_comfort_level,
          createdAt: p.created_at,
        }
      : null,
    preferences: pref
      ? {
          tutorLanguage: pref.preferred_tutor_language,
          notifyDailyDrill: pref.notify_daily_drill,
          notifyStreakRisk: pref.notify_streak_risk,
          notifySquadActivity: pref.notify_squad_activity,
          notifyAchievements: pref.notify_achievements,
          notifyEmailDigest: pref.notify_email_digest,
        }
      : null,
    progression: {
      totalXp: prog.total_xp,
      level: prog.level,
      rank: rankForLevel(prog.level),
      xpToNextLevel: xpToNextLevel(prog.total_xp, prog.level),
      levelProgress: levelProgress(prog.total_xp, prog.level),
      challengesCompleted: prog.challenges_completed,
      labsCompleted: prog.labs_completed,
    },
    skills: (skills.data ?? []).map(skillView).filter((v): v is SkillView => Boolean(v)),
    challenges: challengeRows.map((row) => ({
      id: row.challenge_id,
      status: row.status,
      score: row.best_score,
      attempts: row.attempts,
      xpAwarded: row.xp_awarded,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    })),
    activityDates,
    currentStreak: currentStreakFromDates(activityDates),
    longestStreak: longestStreakFromDates(activityDates),
    accuracy: attempted.length ? Math.round((completed.length / attempted.length) * 100) : 0,
    firstTryAccuracy: firstTry.length
      ? Math.round((firstTryCompleted.length / firstTry.length) * 100)
      : 0,
    timeOnTaskMinutes: Math.round(durationMs / 60000),
    commandCount: commands.data?.length ?? 0,
    activeLab: lab.data
      ? {
          id: lab.data.id,
          provider: lab.data.provider,
          environmentId: lab.data.environment_id,
          status: lab.data.status,
          lastActiveAt: lab.data.last_active_at,
          expiresAt: lab.data.expires_at,
        }
      : null,
  };
}
