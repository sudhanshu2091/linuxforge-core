import type { CompletionMode } from "./types";

export type QuestionCandidate = {
  questionId: string;
  variantId: string;
  semanticFingerprint: string;
  skillIds: string[];
  difficulty: number;
};

export type QuestionHistory = {
  questionId: string;
  variantId: string | null;
  semanticFingerprint: string;
  completionMode: CompletionMode | null;
  consumed: boolean;
  completedAt: string;
};

export function isNovelQuestion(
  candidate: QuestionCandidate,
  history: readonly QuestionHistory[],
): boolean {
  return !history.some(
    (item) =>
      item.consumed &&
      (item.questionId === candidate.questionId ||
        item.semanticFingerprint === candidate.semanticFingerprint),
  );
}

export function classifyCompletion(input: {
  verdict: string;
  hintsUsed: number;
  solutionRevealed: boolean;
  tutorInterventions?: number;
}): CompletionMode {
  if (input.verdict !== "PASS" && input.verdict !== "COMPLETE") {
    return input.verdict === "PARTIAL" ? "PARTIAL" : "FAILED";
  }
  if (input.solutionRevealed) return "SOLUTION_REVEALED";
  const interventions = input.tutorInterventions ?? 0;
  if (input.hintsUsed === 0 && interventions === 0) return "DIRECT";
  if (input.hintsUsed >= 3 || interventions >= 3) return "HEAVILY_ASSISTED";
  return "ASSISTED";
}

export function shouldConsume(mode: CompletionMode): boolean {
  return mode === "DIRECT";
}
