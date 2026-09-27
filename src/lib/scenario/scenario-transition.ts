import type {
  ScenarioDefinition,
  ScenarioEvent,
  ScenarioTransition,
  ScenarioWorldState,
} from "./scenario-types";
import { applyEvent, hasCondition, cloneState } from "./scenario-state";
export function eligibleTransitions(
  d: ScenarioDefinition,
  s: ScenarioWorldState,
  e: ScenarioEvent,
) {
  return d.transitions.filter(
    (t) =>
      t.trigger === e.type &&
      !s.triggeredTransitions.includes(t.transitionId) &&
      t.preconditions.every((c) => hasCondition(s, c.key, c.equals, c.exists)),
  );
}
export function applyTransitions(s: ScenarioWorldState, ts: readonly ScenarioTransition[]) {
  const n = cloneState(s);
  for (const t of ts) {
    n.triggeredTransitions.push(t.transitionId);
    for (const e of t.effects) {
      if (e.kind === "SET_FLAG" && e.value !== undefined) n.flags[e.key] = e.value;
      if (e.kind === "REVEAL_ARTIFACT" && e.value === true) n.knownArtifacts.push(e.key);
      if (e.kind === "REVEAL_NODE" && e.value === true) n.knownNodes.push(e.key);
      if (e.kind === "REVEAL_SERVICE" && e.value === true) n.knownServices.push(e.key);
      if (e.kind === "ADD_NETWORK_ACCESS" && e.value === true) n.networkAccess.push(e.key);
      if (e.kind === "COMPLETE_OBJECTIVE") n.completedObjectives.push(e.key);
    }
  }
  n.knownArtifacts = [...new Set(n.knownArtifacts)];
  n.knownNodes = [...new Set(n.knownNodes)];
  n.knownServices = [...new Set(n.knownServices)];
  n.networkAccess = [...new Set(n.networkAccess)];
  n.completedObjectives = [...new Set(n.completedObjectives)];
  n.version += ts.length;
  return n;
}
export function processScenarioEvent(
  d: ScenarioDefinition,
  s: ScenarioWorldState,
  e: ScenarioEvent,
) {
  const after = applyEvent(s, e);
  return applyTransitions(after, eligibleTransitions(d, after, e));
}
