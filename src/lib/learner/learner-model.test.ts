import { describe, expect, it } from "vitest";
import {
  calculateSkillUpdate,
  currentStreakFromDates,
  levelProgress,
  longestStreakFromDates,
  rankForLevel,
  xpToNextLevel,
} from "./learner-model";

describe("learner model", () => {
  it("updates mastery, confidence, review date and hint dependency", () => {
    const now = new Date("2026-09-15T00:00:00.000Z");
    const result = calculateSkillUpdate(
      {
        mastery: 50,
        attempts: 2,
        successfulAttempts: 1,
        hintDependency: 20,
        score: 90,
        complete: true,
        hintsUsed: 1,
        mistake: null,
        now,
      },
      ["WRONG_ARGUMENT"],
    );
    expect(result.mastery).toBe(66);
    expect(result.attempts).toBe(3);
    expect(result.successfulAttempts).toBe(2);
    expect(result.confidence).toBe(44);
    expect(result.hintDependency).toBe(30);
    expect(result.nextReview).toBe("2026-09-22T00:00:00.000Z");
  });

  it("derives rank and level progress from XP", () => {
    expect(rankForLevel(1)).toBe("Recruit");
    expect(rankForLevel(10)).toBe("Engineer");
    expect(rankForLevel(15)).toBe("Architect");
    expect(xpToNextLevel(4820, 10)).toBe(180);
    expect(levelProgress(4820, 10)).toBe(64);
  });

  it("calculates current and longest UTC-day streaks", () => {
    const now = new Date("2026-09-15T12:00:00.000Z");
    const dates = [
      "2026-09-13T10:00:00.000Z",
      "2026-09-14T10:00:00.000Z",
      "2026-09-15T10:00:00.000Z",
      "2026-09-10T10:00:00.000Z",
      "2026-09-11T10:00:00.000Z",
      "2026-09-12T10:00:00.000Z",
    ];
    expect(currentStreakFromDates(dates, now)).toBe(6);
    expect(longestStreakFromDates(dates)).toBe(6);
  });
});

it("tracks multidimensional learner evidence and stretches review intervals", () => {
  const now = new Date("2026-09-15T00:00:00.000Z");
  const result = calculateSkillUpdate(
    {
      mastery: 80,
      attempts: 4,
      successfulAttempts: 4,
      hintDependency: 0,
      score: 95,
      complete: true,
      hintsUsed: 0,
      mistake: null,
      now,
      durationMs: 120_000,
      expectedMinutes: 5,
      difficulty: 4,
      retention: 92,
      independence: 95,
      consistency: 90,
    },
    [],
  );

  expect(result.retention).toBeGreaterThan(90);
  expect(result.independence).toBeGreaterThan(90);
  expect(result.speedScore).toBeGreaterThan(90);
  expect(result.consistency).toBeGreaterThan(80);
  expect(result.difficultyRating).toBe(4);
  expect(result.evidenceCount).toBe(5);
  expect(result.nextReview).toBe("2026-10-15T00:00:00.000Z");
});
