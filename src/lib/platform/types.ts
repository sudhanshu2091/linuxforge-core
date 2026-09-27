import type { SkillId } from "@/lib/forge/types";

export type MissionLifecycle = "PLANNED" | "ACTIVE" | "BLOCKED" | "COMPLETED" | "ABANDONED";
export type CompletionMode =
  "DIRECT" | "ASSISTED" | "HEAVILY_ASSISTED" | "SOLUTION_REVEALED" | "FAILED" | "PARTIAL";
export type RuntimeNodeState = "ONLINE" | "DRAINING" | "OFFLINE" | "QUARANTINED";
export type SquadRole = "OWNER" | "MEMBER";
export type SecurityDecision = "ALLOW" | "DENY" | "THROTTLE" | "QUARANTINE";

export type LearnerEvidence = {
  skillIds: SkillId[];
  score: number;
  hintsUsed: number;
  solutionRevealed: boolean;
  tutorInterventions: number;
  completionMode: CompletionMode;
  semanticFingerprint: string;
  exerciseId: string;
  environmentGeneration: number;
  completedAt: string;
};

export type ProgressionPlan = {
  primarySkill: SkillId;
  supportingSkills: SkillId[];
  difficulty: number;
  action: "PRACTICE" | "REVIEW" | "CONFIRM_MASTERY" | "ADVANCE" | "REMEDIATE";
  rationale: string;
};

export type PlatformState = {
  learnerId: string;
  activeMissionId: string | null;
  missionState: MissionLifecycle;
  environmentId: string | null;
  environmentGeneration: number | null;
  currentQuestionFingerprint: string | null;
  progression: ProgressionPlan | null;
  security: SecurityDecision;
};

export type RuntimeNode = {
  nodeId: string;
  provider: "qemu" | "cloud" | "mock";
  endpoint: string;
  state: RuntimeNodeState;
  activeEnvironments: number;
  maxEnvironments: number;
  lastHeartbeatAt: string;
};

export type Squad = {
  squadId: string;
  name: string;
  ownerId: string;
  members: Array<{ userId: string; role: SquadRole; joinedAt: string }>;
};

export type SecurityEvent = {
  userId: string;
  event: string;
  decision: SecurityDecision;
  reason: string;
  occurredAt: string;
};
