/**
 * LinuxForge Core — challenge engine shared types (client-safe).
 *
 * These types cross the server-function boundary, so they contain no
 * verification rules, hint text or scoring policy. Those live only in
 * `*.server.ts` modules and are never shipped to the browser.
 */

export type SkillId =
  | "filesystem"
  | "permissions"
  | "iteration"
  | "shell-scripting"
  | "processes"
  | "networking"
  | "hardening";

export const SKILL_LABELS: Record<SkillId, string> = {
  filesystem: "Filesystem",
  permissions: "Permissions",
  iteration: "Iteration & loops",
  "shell-scripting": "Shell scripting",
  processes: "Processes",
  networking: "Networking",
  hardening: "Hardening",
};

/** Final authority verdicts — produced only by the deterministic verifier. */
export type VerificationStatus =
  | "COMPLETE"
  | "RESULT_CORRECT_SKILL_NOT_DEMONSTRATED"
  | "RESULT_INCORRECT_SKILL_DEMONSTRATED"
  | "INCOMPLETE"
  | "BLOCKED_BY_SAFETY_POLICY";

/** Observer classifications — advisory only, never a final status. */
export type ObservationCategory =
  | "TYPO"
  | "WRONG_COMMAND"
  | "WRONG_ARGUMENT"
  | "WRONG_PATH"
  | "WRONG_FILENAME"
  | "MISREAD_QUESTION"
  | "CONCEPT_CONFUSION"
  | "PARTIAL_UNDERSTANDING"
  | "UNSAFE_APPROACH"
  | "RANDOM_TRIAL_AND_ERROR"
  | "SKILL_BYPASS"
  | "VALID_ALTERNATIVE"
  | "INDEPENDENT_SOLUTION";

export type Observation = {
  /** What the learner appeared to be trying to do. */
  intent: string;
  /** How they went about it. */
  approach: string;
  skillTarget: SkillId[];
  category: ObservationCategory | null;
  conceptUnderstanding: "unclear" | "partial" | "solid";
  skillDemonstrated: boolean;
  /** Learner-facing mentor line. Hidden scores/policies are never included. */
  coaching: string;
};

export type ObjectiveResult = {
  label: string;
  met: boolean;
  /** Evidence sentence the learner can verify themselves. */
  evidence: string;
};

export type Verification = {
  status: VerificationStatus;
  objectives: ObjectiveResult[];
  /** 0-100 deterministic grade. */
  score: number;
  message: string;
  remediation: string[];
  wentWell: string[];
};

export type WorldObjectView = {
  objectId: string;
  objectType: "directory" | "file";
  path: string;
  name: string;
  permissions: string;
  createdByChallenge: string | null;
  lastModifiedByChallenge: string | null;
  createdAt: string;
};

export type NarrativeEventView = {
  eventId: string;
  challengeId: string | null;
  eventType: string;
  summary: string;
  importance: number;
  createdAt: string;
  relatedSkillIds: string[];
};

export type SkillMemoryView = {
  skillId: SkillId;
  mastery: number;
  attempts: number;
  successfulAttempts: number;
  recentScore: number | null;
  recentMistakes: string[];
  hintDependency: number;
  lastPracticed: string | null;
  nextReview: string | null;
  confidence: number;
};

/** Exactly the structured context the engine retrieves per challenge. */
export type LearnerContext = {
  learner_level: number;
  current_mastery: Record<string, number>;
  weak_skills: SkillId[];
  strong_skills: SkillId[];
  recent_mistakes: string[];
  recent_challenges: { challengeId: string; status: VerificationStatus; score: number }[];
  relevant_previous_objects: WorldObjectView[];
  relevant_story_events: NarrativeEventView[];
  current_lab_state: { labTitle: string; cwd: string; objects: WorldObjectView[] };
  prerequisites: { challengeId: string; met: boolean }[];
  desired_difficulty: number;
};

/** Public (learner-facing) part of a challenge contract. */
export type ChallengeBrief = {
  id: string;
  order: number;
  title: string;
  storyIntro: string;
  objective: string;
  requiredSkills: SkillId[];
  allowedApproaches: string[];
  bannedShortcuts: string[];
  difficulty: number;
  prerequisites: string[];
  previousReferences: string[];
  xpReward: number;
  hintLevels: number;
};

export type AttemptView = {
  challengeId: string;
  status: VerificationStatus;
  attempts: number;
  bestScore: number;
  xpAwarded: number;
  completedAt: string | null;
};

export type TerminalLine = { kind: "input" | "output" | "error" | "system"; text: string };

export type MissionState = {
  challenge: ChallengeBrief;
  context: LearnerContext;
  attempt: AttemptView;
  catalogue: (ChallengeBrief & { attempt: AttemptView | null; unlocked: boolean })[];
  transcript: TerminalLine[];
  cwd: string;
  hints: { level: number; text: string }[];
  hintsRemaining: number;
  skills: SkillMemoryView[];
  progression: { totalXp: number; level: number; challengesCompleted: number };
  lastVerification: Verification | null;
  lastObservation: Observation | null;
  nextChallengeId: string | null;
};

export type RunResult = {
  transcript: TerminalLine[];
  cwd: string;
  observation: Observation;
  verification: Verification;
  xpAwarded: number;
  state: MissionState;
};
