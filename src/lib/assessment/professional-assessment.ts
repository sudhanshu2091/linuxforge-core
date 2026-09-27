/** V47 Professional Assessment Engine — deterministic assessment lifecycle. */

export const ASSESSMENT_TYPES = [
  "KNOWLEDGE",
  "PRACTICAL",
  "SCENARIO",
  "DEFENSIVE",
  "PROFESSIONAL_SIMULATION",
] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];
export const ASSESSMENT_DIFFICULTIES = [
  "FOUNDATIONAL",
  "INTERMEDIATE",
  "ADVANCED",
  "PROFESSIONAL",
  "EXPERT",
] as const;
export type AssessmentDifficulty = (typeof ASSESSMENT_DIFFICULTIES)[number];
export const ASSESSMENT_STATES = [
  "DRAFT",
  "READY",
  "PROVISIONING",
  "ACTIVE",
  "SUBMITTED",
  "EVALUATING",
  "EVALUATED",
  "REVIEWED",
  "ARCHIVED",
  "PROVISIONING_FAILED",
  "ABORTED",
  "EXPIRED",
  "QUARANTINED",
  "EVALUATION_FAILED",
] as const;
export type AssessmentState = (typeof ASSESSMENT_STATES)[number];

export type AssessmentObjective = {
  objectiveId: string;
  title: string;
  description: string;
  required: boolean;
  evidenceRequirements: string[];
  skillIds: string[];
};

export type AssessmentScope = {
  allowedTargets: string[];
  allowedNetworks: string[];
  allowedPorts: number[];
  allowedTechniques: string[];
  prohibitedTechniques: string[];
  allowedTools: string[];
  prohibitedTools: string[];
  dataHandlingRules: string[];
};

export type AssessmentEnvironmentBinding = {
  scenarioId: string;
  labId: string;
  runtimeIds: string[];
  learnerId: string;
  bindingGeneration: number;
};

export type AssessmentBlueprint = {
  assessmentId: string;
  version: number;
  title: string;
  description: string;
  assessmentType: AssessmentType;
  difficulty: AssessmentDifficulty;
  durationSeconds: number;
  skills: string[];
  prerequisites: string[];
  objectives: AssessmentObjective[];
  environment: AssessmentEnvironmentBinding;
  scope: AssessmentScope;
  evidenceRequirements: string[];
  scoringDimensions: string[];
  passRequirements: {
    minimumObjectiveRate: number;
    minimumOverallScore: number;
    requiredDimensions?: Record<string, number>;
  };
  assistancePolicy:
    "NONE" | "POLICY_ONLY" | "CLARIFICATION_ONLY" | "LIMITED_HINTS" | "FULL_TUTORING";
};

const transitions: Record<AssessmentState, readonly AssessmentState[]> = {
  DRAFT: ["READY", "ABORTED"],
  READY: ["PROVISIONING", "ABORTED"],
  PROVISIONING: ["ACTIVE", "PROVISIONING_FAILED", "QUARANTINED", "ABORTED"],
  ACTIVE: ["SUBMITTED", "EXPIRED", "QUARANTINED", "ABORTED"],
  SUBMITTED: ["EVALUATING"],
  EVALUATING: ["EVALUATED", "EVALUATION_FAILED"],
  EVALUATED: ["REVIEWED", "ARCHIVED"],
  REVIEWED: ["ARCHIVED"],
  ARCHIVED: [],
  PROVISIONING_FAILED: ["PROVISIONING", "ABORTED"],
  ABORTED: ["ARCHIVED"],
  EXPIRED: ["EVALUATING", "ARCHIVED"],
  QUARANTINED: ["EVALUATING", "ARCHIVED"],
  EVALUATION_FAILED: ["EVALUATING", "ARCHIVED"],
};

export function canTransition(from: AssessmentState, to: AssessmentState): boolean {
  return transitions[from].includes(to);
}
export function transitionAssessment(from: AssessmentState, to: AssessmentState): AssessmentState {
  if (!canTransition(from, to)) throw new Error(`Invalid assessment transition: ${from} -> ${to}`);
  return to;
}

export function validateBlueprint(blueprint: AssessmentBlueprint): void {
  if (!blueprint.assessmentId || !blueprint.title.trim())
    throw new Error("Assessment requires an id and title.");
  if (!Number.isInteger(blueprint.version) || blueprint.version < 1)
    throw new Error("Assessment version must be a positive integer.");
  if (!Number.isFinite(blueprint.durationSeconds) || blueprint.durationSeconds <= 0)
    throw new Error("Assessment duration must be positive.");
  if (!blueprint.objectives.length) throw new Error("Assessment requires at least one objective.");
  if (blueprint.objectives.some((o) => !o.objectiveId || !o.title.trim()))
    throw new Error("Every objective requires an id and title.");
  if (new Set(blueprint.objectives.map((o) => o.objectiveId)).size !== blueprint.objectives.length)
    throw new Error("Objective IDs must be unique.");
  if (
    blueprint.passRequirements.minimumObjectiveRate < 0 ||
    blueprint.passRequirements.minimumObjectiveRate > 1
  )
    throw new Error("Objective pass rate must be between 0 and 1.");
  if (
    blueprint.passRequirements.minimumOverallScore < 0 ||
    blueprint.passRequirements.minimumOverallScore > 100
  )
    throw new Error("Overall score must be between 0 and 100.");
  if (
    blueprint.environment.runtimeIds.length === 0 ||
    !blueprint.environment.labId ||
    !blueprint.environment.scenarioId
  )
    throw new Error("Assessment must bind to a lab scenario and runtime.");
  if (blueprint.scope.allowedPorts.some((p) => !Number.isInteger(p) || p < 1 || p > 65535))
    throw new Error("Assessment scope contains an invalid port.");
  if (blueprint.scope.prohibitedTools.some((tool) => blueprint.scope.allowedTools.includes(tool)))
    throw new Error("A tool cannot be both allowed and prohibited.");
}

export function assertAssessmentBinding(
  expected: AssessmentEnvironmentBinding,
  actual: AssessmentEnvironmentBinding,
): void {
  if (
    expected.learnerId !== actual.learnerId ||
    expected.labId !== actual.labId ||
    expected.scenarioId !== actual.scenarioId ||
    expected.bindingGeneration !== actual.bindingGeneration
  ) {
    throw new Error("Assessment environment binding mismatch.");
  }
  const allowed = new Set(expected.runtimeIds);
  if (
    actual.runtimeIds.some((id) => !allowed.has(id)) ||
    actual.runtimeIds.length !== expected.runtimeIds.length
  )
    throw new Error("Assessment runtime binding mismatch.");
}
