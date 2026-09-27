import type { ScenarioDefinition, ScenarioEvent, ScenarioWorldState } from "./scenario-types";
export function cloneState(s: ScenarioWorldState): ScenarioWorldState {
  return {
    ...s,
    flags: { ...s.flags },
    knownNodes: [...s.knownNodes],
    knownNetworks: [...s.knownNetworks],
    knownServices: [...s.knownServices],
    knownArtifacts: [...s.knownArtifacts],
    networkAccess: [...s.networkAccess],
    completedObjectives: [...s.completedObjectives],
    triggeredTransitions: [...s.triggeredTransitions],
  };
}
export function initialWorldState(d: ScenarioDefinition) {
  return cloneState(d.initialState);
}
export function applyEvent(s: ScenarioWorldState, e: ScenarioEvent): ScenarioWorldState {
  const n = cloneState(s);
  n.actionCount++;
  n.version++;
  const node = e.data["nodeId"];
  const service = e.data["service"];
  const artifact = e.data["artifactId"];
  if (e.type === "PORT_DISCOVERED" && typeof node === "string")
    n.knownNodes = [...new Set([...n.knownNodes, node])];
  if (e.type === "SERVICE_DISCOVERED" && typeof service === "string")
    n.knownServices = [...new Set([...n.knownServices, service])];
  if (e.type === "CREDENTIAL_DISCOVERED" && typeof artifact === "string")
    n.knownArtifacts = [...new Set([...n.knownArtifacts, artifact])];
  if (e.type === "OBJECTIVE_COMPLETED" && e.objectiveId)
    n.completedObjectives = [...new Set([...n.completedObjectives, e.objectiveId])];
  return n;
}
export function hasCondition(
  s: ScenarioWorldState,
  key: string,
  expected?: string | number | boolean,
  exists?: boolean,
) {
  const v = s.flags[key];
  return exists !== undefined ? (exists ? v !== undefined : v === undefined) : v === expected;
}
