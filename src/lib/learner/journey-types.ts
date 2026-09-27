import type { LearningMode, TrainingDecision } from "@/lib/ai/adaptive-training";
import type {
  ProgressionAction,
  SkillId,
  SkillMasteryView,
  SkillMemoryView,
} from "@/lib/forge/types";

export type CurriculumPhaseId =
  "FOUNDATIONS" | "SHELL_OPERATOR" | "SYSTEM_OPERATOR" | "NETWORK_OPERATOR" | "SECURITY_OPERATOR";

export type CurriculumPhase = {
  id: CurriculumPhaseId;
  name: string;
  description: string;
  skills: SkillId[];
};

export type JourneyMilestone = {
  id: string;
  label: string;
  skills: SkillId[];
  complete: boolean;
};

export type LearnerJourney = {
  version: "v37";
  curriculumGraphVersion: "v38";
  currentPhase: CurriculumPhaseId;
  currentPhaseName: string;
  phaseProgress: number;
  masteredSkills: SkillId[];
  fragileSkills: SkillId[];
  blockedSkills: SkillId[];
  readySkills: SkillId[];
  reviewSkills: SkillId[];
  nextSkills: SkillId[];
  milestones: JourneyMilestone[];
  recommendedAction: ProgressionAction;
  recommendedMode: LearningMode;
  primarySkill: SkillId | null;
  rationale: string;
  mastery: SkillMasteryView[];
};

export type JourneyInput = {
  skills: readonly SkillMemoryView[];
  trainingDecision?: Pick<TrainingDecision, "mode" | "primarySkill"> | null;
  now?: Date;
};
