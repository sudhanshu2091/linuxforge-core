/**
 * V37 — deterministic Learner Journey / Curriculum Orchestrator.
 *
 * The journey is a rebuildable view over persisted learner evidence. It does
 * not invent progress or store a second source of truth. V36 owns mastery and
 * progression gates; V35 owns the immediate training decision.
 */
import type { SkillId } from "@/lib/forge/types";
import { PREREQUISITES, buildMasterySnapshot, decideProgression } from "./mastery-engine";
import type {
  CurriculumPhase,
  JourneyInput,
  JourneyMilestone,
  LearnerJourney,
} from "./journey-types";
import {
  CURRICULUM_GRAPH_VERSION,
  getPhaseSkills,
  type CurriculumNodeId,
} from "./curriculum-graph";

export const CURRICULUM_PHASES: readonly CurriculumPhase[] = [
  {
    id: "FOUNDATIONS",
    name: "Linux Foundations",
    description: "Filesystem, paths, permissions and core shell habits.",
    skills: ["filesystem", "permissions"],
  },
  {
    id: "SHELL_OPERATOR",
    name: "Shell Operator",
    description: "Iteration and reliable shell scripting built on filesystem fluency.",
    skills: ["iteration", "shell-scripting"],
  },
  {
    id: "SYSTEM_OPERATOR",
    name: "System Operator",
    description: "Processes, jobs and service-oriented Linux operations.",
    skills: ["processes"],
  },
  {
    id: "NETWORK_OPERATOR",
    name: "Network Operator",
    description: "Networking fundamentals that prepare the learner for security work.",
    skills: ["networking"],
  },
  {
    id: "SECURITY_OPERATOR",
    name: "Security Operator",
    description: "Defensive hardening and the bridge toward the wider cybersecurity curriculum.",
    skills: ["hardening"],
  },
];

// V38 owns curriculum structure; V37 keeps its public phase contract for compatibility.
// The graph is checked against the phase definitions so structure cannot silently drift.
const phaseNodeIds: Record<CurriculumPhase["id"], CurriculumNodeId> = {
  FOUNDATIONS: "phase:foundations",
  SHELL_OPERATOR: "phase:shell-operator",
  SYSTEM_OPERATOR: "phase:system-operator",
  NETWORK_OPERATOR: "phase:network-operator",
  SECURITY_OPERATOR: "phase:security-operator",
};

for (const phase of CURRICULUM_PHASES) {
  const graphSkills = getPhaseSkills(phaseNodeIds[phase.id]);
  if (graphSkills.length && JSON.stringify(graphSkills) !== JSON.stringify(phase.skills)) {
    throw new Error(`V38 curriculum graph drift detected for ${phase.id}`);
  }
}

const allSkills = CURRICULUM_PHASES.flatMap((phase) => phase.skills);

function prerequisiteReady(skillId: SkillId, mastered: Set<SkillId>) {
  return (PREREQUISITES[skillId] ?? []).every((id) => mastered.has(id));
}

function buildMilestones(mastery: ReturnType<typeof buildMasterySnapshot>): JourneyMilestone[] {
  const mastered = new Set(
    mastery.filter((item) => item.state === "MASTERED").map((item) => item.skillId),
  );
  return CURRICULUM_PHASES.map((phase) => ({
    id: `phase:${phase.id}`,
    label: `Complete ${phase.name}`,
    skills: [...phase.skills],
    complete: phase.skills.every((skill) => mastered.has(skill)),
  }));
}

export function buildLearnerJourney(input: JourneyInput): LearnerJourney {
  const now = input.now ?? new Date();
  const mastery = buildMasterySnapshot(input.skills, now);
  const bySkill = new Map(mastery.map((item) => [item.skillId, item]));
  const mastered = new Set(
    mastery.filter((item) => item.state === "MASTERED").map((item) => item.skillId),
  );
  const fragile = mastery.filter((item) => item.state === "FRAGILE").map((item) => item.skillId);
  const review = mastery
    .filter((item) => item.due || item.state === "FRAGILE")
    .map((item) => item.skillId);

  // A skill is "ready" only when all deterministic V36 prerequisites are
  // mastered. This is eligibility, not a progression grant.
  const ready = allSkills.filter(
    (skill) => !mastered.has(skill) && prerequisiteReady(skill, mastered),
  );
  const blocked = allSkills.filter(
    (skill) => !mastered.has(skill) && !prerequisiteReady(skill, mastered),
  );

  const requestedPrimary = input.trainingDecision?.primarySkill;
  const target =
    requestedPrimary && bySkill.has(requestedPrimary)
      ? requestedPrimary
      : (review[0] ??
        ready[0] ??
        mastery.find((item) => item.state !== "MASTERED")?.skillId ??
        null);

  const progression = decideProgression({
    skills: input.skills,
    targetSkills: target ? [target] : [],
    now,
  });

  const currentPhase =
    CURRICULUM_PHASES.find((phase) => phase.skills.some((skill) => !mastered.has(skill))) ??
    CURRICULUM_PHASES[CURRICULUM_PHASES.length - 1]!;
  const phaseMastered = currentPhase.skills.filter((skill) => mastered.has(skill)).length;
  const phaseProgress = Math.round((phaseMastered / currentPhase.skills.length) * 100);
  const nextSkills =
    progression.action === "ADVANCE"
      ? progression.eligibleNextSkills
      : review.length > 0
        ? review.slice(0, 2)
        : ready.slice(0, 2);

  const recommendedMode =
    input.trainingDecision?.mode ??
    (progression.action === "REMEDIATE"
      ? "REMEDIATION"
      : progression.action === "REVIEW"
        ? "SPACED_REVIEW"
        : progression.action === "CONFIRM_MASTERY"
          ? "ASSESSMENT"
          : progression.action === "ADVANCE"
            ? "PROGRESSION"
            : "GUIDED_PRACTICE");

  const rationale =
    progression.action === "ADVANCE"
      ? `V36 mastery is complete for ${target ?? "the current target"}; the journey now exposes the next prerequisite-eligible skill.`
      : review.length > 0
        ? `The journey prioritizes ${review.slice(0, 2).join(", ")} because retention/review evidence needs attention before broader progression.`
        : ready.length > 0
          ? `The learner has prerequisite-eligible skills available; V35 can select the immediate training activity without bypassing V36 gates.`
          : "The journey is collecting more evidence before exposing a new progression step.";

  return {
    version: "v37",
    curriculumGraphVersion: CURRICULUM_GRAPH_VERSION,
    currentPhase: currentPhase.id,
    currentPhaseName: currentPhase.name,
    phaseProgress,
    masteredSkills: [...mastered],
    fragileSkills: fragile,
    blockedSkills: blocked,
    readySkills: ready,
    reviewSkills: review,
    nextSkills,
    milestones: buildMilestones(mastery),
    recommendedAction: progression.action,
    recommendedMode,
    primarySkill: target,
    rationale,
    mastery,
  };
}
