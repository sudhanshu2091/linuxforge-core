/**
 * Context Engine (server-only).
 *
 * Retrieves ONLY what the current mission needs: relevant objects, relevant
 * story beats, the skills in play and recent performance. It deliberately does
 * not pass the learner's whole history around.
 */

import type { Contract } from "./contracts.server";
import type {
  LearnerContext,
  NarrativeEventView,
  SkillId,
  SkillMemoryView,
  VerificationStatus,
  WorldObjectView,
} from "./types";

export type ContextInputs = {
  contract: Contract;
  labTitle: string;
  cwd: string;
  objects: WorldObjectView[];
  events: NarrativeEventView[];
  skills: SkillMemoryView[];
  attempts: { challengeId: string; status: VerificationStatus; score: number; updatedAt: string }[];
  level: number;
};

const RELEVANT_PREFIXES = ["project"];

export function buildContext(input: ContextInputs): LearnerContext {
  const { contract } = input;

  const mastery: Record<string, number> = {};
  for (const s of input.skills) mastery[s.skillId] = s.mastery;

  const weak = input.skills.filter((s) => s.attempts > 0 && s.mastery < 55).map((s) => s.skillId as SkillId);
  const strong = input.skills.filter((s) => s.mastery >= 75).map((s) => s.skillId as SkillId);

  const recentMistakes = input.skills
    .filter((s) => contract.requiredSkills.includes(s.skillId) || weak.includes(s.skillId))
    .flatMap((s) => s.recentMistakes.slice(-2));

  const recentChallenges = [...input.attempts]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4)
    .map(({ challengeId, status, score }) => ({ challengeId, status, score }));

  // Only objects this mission actually references or lives inside.
  const relevantObjects = input.objects.filter(
    (o) =>
      RELEVANT_PREFIXES.some((p) => o.path === p || o.path.startsWith(`${p}/`)) &&
      (contract.previousReferences.length === 0 ||
        contract.previousReferences.includes(o.createdByChallenge ?? "") ||
        o.path.split("/").length <= 3),
  );

  // Only story beats tied to referenced missions, the current skills, or high importance.
  const relevantEvents = input.events
    .filter(
      (e) =>
        contract.previousReferences.includes(e.challengeId ?? "") ||
        e.relatedSkillIds.some((s) => contract.requiredSkills.includes(s as SkillId)) ||
        e.importance >= 3,
    )
    .slice(0, 6);

  const completed = new Set(input.attempts.filter((a) => a.status === "COMPLETE").map((a) => a.challengeId));

  const avgRequired =
    contract.requiredSkills.reduce((acc, s) => acc + (mastery[s] ?? 0), 0) / Math.max(1, contract.requiredSkills.length);

  return {
    learner_level: input.level,
    current_mastery: mastery,
    weak_skills: weak,
    strong_skills: strong,
    recent_mistakes: recentMistakes,
    recent_challenges: recentChallenges,
    relevant_previous_objects: relevantObjects,
    relevant_story_events: relevantEvents,
    current_lab_state: { labTitle: input.labTitle, cwd: input.cwd, objects: input.objects },
    prerequisites: contract.prerequisites.map((p) => ({ challengeId: p, met: completed.has(p) })),
    desired_difficulty: Math.max(1, Math.min(5, contract.difficulty + (avgRequired >= 75 ? 1 : avgRequired < 40 ? -1 : 0))),
  };
}
