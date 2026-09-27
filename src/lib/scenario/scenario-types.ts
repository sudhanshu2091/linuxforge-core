export const SCENARIO_MODES = [
  "TRAINING",
  "GUIDED",
  "ASSESSMENT",
  "SIMULATION",
  "CTF",
  "INCIDENT_RESPONSE",
] as const;
export type ScenarioMode = (typeof SCENARIO_MODES)[number];
export const SCENARIO_STATES = [
  "DRAFT",
  "READY",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "EXPIRED",
  "RESETTING",
  "ARCHIVED",
] as const;
export type ScenarioState = (typeof SCENARIO_STATES)[number];
export const SCENARIO_EVENT_TYPES = [
  "COMMAND_EXECUTED",
  "SERVICE_DISCOVERED",
  "PORT_DISCOVERED",
  "AUTHENTICATION_SUCCESS",
  "AUTHENTICATION_FAILURE",
  "FILE_ACCESSED",
  "FILE_CREATED",
  "FILE_MODIFIED",
  "PRIVILEGE_CHANGED",
  "CREDENTIAL_DISCOVERED",
  "OBJECTIVE_COMPLETED",
  "TIME_THRESHOLD",
  "SCENARIO_EVENT",
] as const;
export type ScenarioEventType = (typeof SCENARIO_EVENT_TYPES)[number];
export type ScenarioNode = {
  nodeId: string;
  name: string;
  role: string;
  networkIds: string[];
  services: string[];
  exposedPorts: number[];
  observable: boolean;
};
export type ScenarioNetwork = {
  networkId: string;
  name: string;
  cidr: string;
  observable: boolean;
};
export type ScenarioArtifact = {
  artifactId: string;
  kind:
    "FILE" | "CREDENTIAL" | "LOG" | "CONFIGURATION" | "TOKEN" | "CERTIFICATE" | "DATABASE_RECORD";
  ownerNodeId: string;
  discoverable: boolean;
  contentRef: string;
};
export type ScenarioObjective = {
  objectiveId: string;
  title: string;
  required: boolean;
  dependencies: string[];
  completionPolicy:
    | "ALL_EVIDENCE"
    | "ANY_VALID_PATH"
    | "STATE_REACHED"
    | "ARTIFACT_OBTAINED"
    | "FINDING_DOCUMENTED";
  requiredEvidence: string[];
};
export type ScenarioCondition = {
  key: string;
  equals?: string | number | boolean;
  exists?: boolean;
};
export type ScenarioEffect = {
  kind:
    | "SET_FLAG"
    | "REVEAL_ARTIFACT"
    | "REVEAL_NODE"
    | "REVEAL_SERVICE"
    | "ADD_NETWORK_ACCESS"
    | "COMPLETE_OBJECTIVE";
  key: string;
  value?: string | boolean;
};
export type ScenarioTransition = {
  transitionId: string;
  trigger: ScenarioEventType;
  preconditions: ScenarioCondition[];
  effects: ScenarioEffect[];
  evidence: string[];
};
export type ScenarioWorldState = {
  flags: Record<string, string | number | boolean>;
  knownNodes: string[];
  knownNetworks: string[];
  knownServices: string[];
  knownArtifacts: string[];
  networkAccess: string[];
  completedObjectives: string[];
  triggeredTransitions: string[];
  actionCount: number;
  version: number;
};
export type ScenarioCheckpoint = {
  checkpointId: string;
  name: string;
  state: ScenarioWorldState;
  createdAt: string;
};
export type ScenarioDefinition = {
  scenarioId: string;
  version: number;
  title: string;
  description: string;
  mode: ScenarioMode;
  nodes: ScenarioNode[];
  networks: ScenarioNetwork[];
  artifacts: ScenarioArtifact[];
  objectives: ScenarioObjective[];
  transitions: ScenarioTransition[];
  initialState: ScenarioWorldState;
  maxNodes: number;
  maxTransitions: number;
};
export type ScenarioEvent = {
  eventId: string;
  scenarioId: string;
  sessionId: string;
  learnerId: string;
  runtimeId: string;
  type: ScenarioEventType;
  timestamp: string;
  objectiveId?: string;
  data: Record<string, string | number | boolean | null>;
};
