import type { MissionAssessment, SkillId, SkillMemoryView } from "@/lib/forge/types";

export type AdaptiveAction =
  "RETRY_REMEDIATION" | "REVIEW_WEAK_SKILL" | "ADVANCE" | "MIXED_PRACTICE";

export type AdaptivePlan = {
  action: AdaptiveAction;
  desiredDifficulty: number;
  focusSkills: SkillId[];
  rationale: string;
  learnerMessage: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function buildAdaptivePlan(input: {
  skills: SkillMemoryView[];
  assessment?: Pick<
    MissionAssessment,
    "learningSignal" | "grade" | "hintsUsed" | "mistakeBreakdown"
  > | null;
  currentDifficulty?: number;
}): AdaptivePlan {
  const skills = [...input.skills].sort((a, b) => a.mastery - b.mastery);
  const weak = skills.filter((skill) => skill.mastery < 55).slice(0, 3);
  const due = skills.filter(
    (skill) => skill.nextReview && Date.parse(skill.nextReview) <= Date.now(),
  );
  const mistakes = input.assessment?.mistakeBreakdown ?? [];
  const signal = input.assessment?.learningSignal;
  const current = clamp(input.currentDifficulty ?? 1, 1, 5);

  if (signal === "blocked") {
    return {
      action: "RETRY_REMEDIATION",
      desiredDifficulty: current,
      focusSkills: weak.slice(0, 2).map((skill) => skill.skillId),
      rationale:
        "The last run hit a lab safety boundary, so the next step should reinforce the safe execution path before increasing difficulty.",
      learnerMessage:
        "Pehle safe lab workflow ko solid karte hain. Same concept ko guided retry mein practice karo.",
    };
  }

  if (signal === "needs_practice" || (input.assessment && input.assessment.grade < 70)) {
    const focusSkills = weak.length
      ? weak.map((skill) => skill.skillId)
      : skills.slice(0, 2).map((skill) => skill.skillId);
    const mistakeText = mistakes[0]?.category?.toLowerCase().replace(/_/g, " ");
    return {
      action: "RETRY_REMEDIATION",
      desiredDifficulty: clamp(current - 1, 1, 5),
      focusSkills,
      rationale: mistakeText
        ? `Recent evidence points to ${mistakeText}; repeat at a manageable difficulty before adding complexity.`
        : "Recent evidence shows the concept needs another practice cycle before progression.",
      learnerMessage: mistakeText
        ? `Good attempt. Ab ${mistakeText} ko fix karte hain, phir difficulty badhayenge.`
        : "Good attempt. Ek focused practice round karte hain, phir level up.",
    };
  }

  if (due.length > 0) {
    return {
      action: "REVIEW_WEAK_SKILL",
      desiredDifficulty: clamp(Math.round(current), 1, 5),
      focusSkills: due.slice(0, 3).map((skill) => skill.skillId),
      rationale:
        "Some skills are due for spaced review; retrieval practice should happen before introducing too much new material.",
      learnerMessage:
        "Kuch skills review ke liye due hain. Quick recall drill se retention strong karte hain.",
    };
  }

  if (signal === "mastered" && (input.assessment?.grade ?? 0) >= 85) {
    const strong = skills.filter((skill) => skill.mastery >= 75).slice(0, 2);
    const focusSkills = strong.length
      ? strong.map((skill) => skill.skillId)
      : weak.map((skill) => skill.skillId);
    return {
      action: "ADVANCE",
      desiredDifficulty: clamp(current + 1, 1, 5),
      focusSkills,
      rationale:
        "The latest run was independently verified at a high score, so the next challenge can add complexity while retaining the demonstrated skill.",
      learnerMessage:
        "Mission cleanly clear ho gaya. Ab thoda harder challenge — same skill, more complexity.",
    };
  }

  return {
    action: "MIXED_PRACTICE",
    desiredDifficulty: clamp(current + (signal === "progressing" ? 0 : 1), 1, 5),
    focusSkills: weak.length
      ? weak.map((skill) => skill.skillId)
      : skills.slice(0, 2).map((skill) => skill.skillId),
    rationale:
      "The learner is progressing; combine reinforcement of weaker skills with a small amount of new difficulty.",
    learnerMessage:
      "Progress achhi hai. Next mission mein weak area ko reinforce karke thoda naya challenge add karenge.",
  };
}
