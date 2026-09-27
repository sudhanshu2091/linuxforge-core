/** Pure learner-model calculations. No database, network, or UI dependencies. */

export type SkillUpdateInput = {
  mastery: number;
  attempts: number;
  successfulAttempts: number;
  hintDependency: number;
  score: number;
  complete: boolean;
  hintsUsed: number;
  mistake: string | null;
  now: Date;
  durationMs?: number;
  expectedMinutes?: number;
  difficulty?: number;
  retention?: number;
  independence?: number;
  consistency?: number;
};

export type SkillUpdate = {
  mastery: number;
  attempts: number;
  successfulAttempts: number;
  recentScore: number;
  recentMistakes: string[];
  hintDependency: number;
  lastPracticed: string;
  nextReview: string;
  confidence: number;
  retention: number;
  independence: number;
  speedScore: number;
  consistency: number;
  difficultyRating: number;
  evidenceCount: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function calculateSkillUpdate(input: SkillUpdateInput, previousMistakes: string[]) {
  const attempts = input.attempts + 1;
  const successfulAttempts = input.successfulAttempts + (input.complete ? 1 : 0);
  const mastery = clamp(
    Math.round(
      input.mastery + (input.complete ? Math.max(6, (input.score - input.mastery) * 0.4) : -2),
    ),
    0,
    100,
  );
  const recentMistakes = [...previousMistakes, ...(input.mistake ? [input.mistake] : [])].slice(-5);
  const previousRetention = clamp(input.retention ?? input.mastery, 0, 100);
  const retention = clamp(
    Math.round(previousRetention * 0.7 + (input.complete ? 100 : 35) * 0.3),
    0,
    100,
  );
  const reviewDays = input.complete
    ? retention >= 90
      ? 30
      : retention >= 75
        ? 14
        : retention >= 55
          ? 7
          : retention >= 35
            ? 3
            : 1
    : 2;
  const nextReview = new Date(input.now.getTime() + reviewDays * 24 * 60 * 60 * 1000);
  const confidence = Math.round(mastery * (successfulAttempts / Math.max(1, attempts)));
  const independenceEvidence = clamp(100 - input.hintsUsed * 25, 0, 100);
  const independence = clamp(
    Math.round(
      (input.independence ?? 100 - input.hintDependency) * 0.65 + independenceEvidence * 0.35,
    ),
    0,
    100,
  );
  const expectedMs = Math.max(60_000, (input.expectedMinutes ?? 10) * 60_000);
  const durationMs = input.durationMs ?? expectedMs;
  const ratio = Math.max(0.25, durationMs / expectedMs);
  const speedScore = clamp(Math.round(100 / Math.sqrt(ratio)), 30, 100);
  const consistency = clamp(
    Math.round(
      (input.complete ? 100 : 0) * 0.35 +
        (input.consistency ?? (input.mastery > 0 ? input.mastery : 50)) * 0.65,
    ),
    0,
    100,
  );
  const difficultyRating = clamp(Math.round((input.difficulty ?? 1) * 10) / 10, 1, 5);

  return {
    mastery,
    attempts,
    successfulAttempts,
    recentScore: clamp(Math.round(input.score), 0, 100),
    recentMistakes,
    hintDependency: clamp(input.hintDependency + input.hintsUsed * 10, 0, 100),
    lastPracticed: input.now.toISOString(),
    nextReview: nextReview.toISOString(),
    confidence: clamp(confidence, 0, 100),
    retention,
    independence,
    speedScore,
    consistency,
    difficultyRating,
    evidenceCount: attempts,
  } satisfies SkillUpdate;
}

export type Rank = "Recruit" | "Operator" | "Engineer" | "Architect";

export function rankForLevel(level: number): Rank {
  if (level >= 15) return "Architect";
  if (level >= 10) return "Engineer";
  if (level >= 5) return "Operator";
  return "Recruit";
}

export function xpToNextLevel(totalXp: number, level: number) {
  return Math.max(0, level * 500 - totalXp);
}

export function levelProgress(totalXp: number, level: number) {
  const currentFloor = Math.max(0, (level - 1) * 500);
  return clamp(Math.round(((totalXp - currentFloor) / 500) * 100), 0, 100);
}

export function currentStreakFromDates(dates: string[], now = new Date()) {
  const days = new Set(
    dates
      .map((value) => {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      })
      .filter((value): value is string => Boolean(value)),
  );
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function longestStreakFromDates(dates: string[]) {
  const sorted = [
    ...new Set(
      dates
        .map((value) => {
          const d = new Date(value);
          return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
        })
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const day of sorted) {
    const current = new Date(`${day}T00:00:00.000Z`);
    if (previous && current.getTime() - previous.getTime() === 24 * 60 * 60 * 1000) run += 1;
    else run = 1;
    best = Math.max(best, run);
    previous = current;
  }
  return best;
}
