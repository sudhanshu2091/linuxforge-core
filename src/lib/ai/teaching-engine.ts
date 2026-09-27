import type { ObservationCategory, SkillId, SkillMemoryView } from "@/lib/forge/types";
import { retrieveKnowledge, type RetrievedKnowledge } from "./knowledge-base";
import { analyzeLearner } from "./learner-intelligence";

export type TeachingStrategy =
  "DISCOVER" | "DIAGNOSE" | "REPAIR" | "EXPLAIN" | "TRANSFER" | "VERIFY";

export type TeachingSituation = {
  learnerLevel: number;
  desiredDifficulty: number;
  mastery: Record<string, number>;
  focusSkills: readonly SkillId[];
  recentMistakes: ObservationCategory[];
  latestMistake: ObservationCategory | null;
  failedCommands: number;
  attempts: number;
  hintsUsed: number;
  previousHintStages: string[];
  objective: string;
  currentTerminalState: string;
};

export type TeachingDecision = {
  strategy: TeachingStrategy;
  reason: string;
  nextAction: string;
  conceptGap: string | null;
  knowledge: RetrievedKnowledge[];
  revealAnswer: boolean;
};

export function decideTeachingStrategy(input: TeachingSituation): TeachingDecision {
  const repeatedMistake =
    input.latestMistake && ["CONCEPT_CONFUSION", "MISREAD_QUESTION"].includes(input.latestMistake)
      ? input.recentMistakes.filter((m) => m === input.latestMistake).length >= 2
      : false;
  const skillViews = input.focusSkills.map((skill) => ({
    skillId: skill,
    mastery: input.mastery[skill] ?? 0,
    attempts: 1,
    successfulAttempts: 0,
    recentScore: null,
    recentMistakes: input.recentMistakes.filter((m) => m === input.latestMistake),
    hintDependency: input.hintsUsed * 10,
    lastPracticed: null,
    nextReview: null,
    confidence: input.mastery[skill] ?? 0,
    retention: input.mastery[skill] ?? 0,
    independence: Math.max(0, 100 - input.hintsUsed * 20),
  }));
  const learner = analyzeLearner(skillViews, input.recentMistakes);
  const weak =
    learner.focusSkills[0] ?? input.focusSkills.find((skill) => (input.mastery[skill] ?? 100) < 55);
  const knowledge = retrieveKnowledge({
    query: `${input.objective} ${input.currentTerminalState} ${input.latestMistake ?? ""}`,
    skills: input.focusSkills,
    mistake: input.latestMistake,
    difficulty: input.desiredDifficulty,
  });

  if (input.attempts === 0 && input.hintsUsed === 0) {
    return {
      strategy: "DISCOVER",
      reason: "The learner has not produced execution evidence yet.",
      nextAction: "Ask for one observable diagnostic or a first attempt.",
      conceptGap: weak ?? null,
      knowledge,
      revealAnswer: false,
    };
  }
  if (input.latestMistake === "UNSAFE_APPROACH") {
    return {
      strategy: "REPAIR",
      reason: "The latest evidence indicates an unsafe approach.",
      nextAction: "Return to the authorized lab workflow and identify a safe observation step.",
      conceptGap: "safe execution boundary",
      knowledge,
      revealAnswer: false,
    };
  }
  if (
    repeatedMistake ||
    learner.signals.includes("CONCEPT_GAP") ||
    input.latestMistake === "CONCEPT_CONFUSION" ||
    input.latestMistake === "MISREAD_QUESTION"
  ) {
    return {
      strategy: "EXPLAIN",
      reason: "The same conceptual problem is recurring.",
      nextAction: "Explain the smallest missing concept, then ask the learner to apply it.",
      conceptGap: weak ?? knowledge[0]?.title ?? null,
      knowledge,
      revealAnswer: input.hintsUsed >= 3,
    };
  }
  if (input.latestMistake && input.failedCommands > 0) {
    return {
      strategy: "DIAGNOSE",
      reason: "There is concrete failure evidence to reason from.",
      nextAction:
        knowledge[0]?.diagnostic ?? "Inspect the exact error and compare it with the objective.",
      conceptGap: knowledge[0]?.title ?? null,
      knowledge,
      revealAnswer: false,
    };
  }
  if (input.hintsUsed >= 2 || learner.signals.includes("DEPENDENT")) {
    return {
      strategy: "REPAIR",
      reason: "Multiple hints have already been used.",
      nextAction: knowledge[0]?.practicePrompt ?? "Try the smallest remaining step and verify it.",
      conceptGap: knowledge[0]?.title ?? null,
      knowledge,
      revealAnswer: input.hintsUsed >= 4,
    };
  }
  if (
    input.latestMistake === "VALID_ALTERNATIVE" ||
    input.latestMistake === "INDEPENDENT_SOLUTION"
  ) {
    return {
      strategy: "TRANSFER",
      reason: "The learner demonstrated a valid method or independent reasoning.",
      nextAction: "Verify the result, then connect it to a nearby concept.",
      conceptGap: null,
      knowledge,
      revealAnswer: false,
    };
  }
  return {
    strategy: "VERIFY",
    reason: "Current evidence is not enough to justify more direct instruction.",
    nextAction: "Make one small change and verify the resulting state.",
    conceptGap: null,
    knowledge,
    revealAnswer: false,
  };
}
