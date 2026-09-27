import type { ScenarioDefinition } from "./scenario-types";
const uniq = (a: string[], label: string) => {
  if (new Set(a).size !== a.length) throw new Error(`${label} IDs must be unique.`);
};
export function validateScenario(d: ScenarioDefinition) {
  if (!d.scenarioId || !d.title.trim()) throw new Error("Scenario requires an id and title.");
  if (!Number.isInteger(d.version) || d.version < 1)
    throw new Error("Scenario version must be positive.");
  if (!d.nodes.length || !d.networks.length)
    throw new Error("Scenario requires nodes and networks.");
  if (d.nodes.length > d.maxNodes || d.transitions.length > d.maxTransitions)
    throw new Error("Scenario exceeds configured limit.");
  uniq(
    d.nodes.map((n) => n.nodeId),
    "Node",
  );
  uniq(
    d.networks.map((n) => n.networkId),
    "Network",
  );
  uniq(
    d.objectives.map((o) => o.objectiveId),
    "Objective",
  );
  uniq(
    d.transitions.map((t) => t.transitionId),
    "Transition",
  );
  const nodes = new Set(d.nodes.map((n) => n.nodeId)),
    nets = new Set(d.networks.map((n) => n.networkId));
  for (const n of d.nodes)
    if (n.networkIds.some((x) => !nets.has(x))) throw new Error("Node references unknown network.");
  for (const t of d.transitions)
    for (const e of t.effects)
      if (e.kind === "COMPLETE_OBJECTIVE" && !d.objectives.some((o) => o.objectiveId === e.key))
        throw new Error("Transition references unknown objective.");
  for (const o of d.objectives)
    if (o.dependencies.some((x) => !d.objectives.some((y) => y.objectiveId === x)))
      throw new Error("Objective references unknown dependency.");
  if (d.initialState.knownNodes.some((x) => !nodes.has(x)))
    throw new Error("Initial state references unknown node.");
  if (d.initialState.knownNetworks.some((x) => !nets.has(x)))
    throw new Error("Initial state references unknown network.");
  for (const a of d.artifacts)
    if (!nodes.has(a.ownerNodeId)) throw new Error("Artifact references unknown node.");
}
export function validateObjectiveReachability(d: ScenarioDefinition) {
  const objectives = new Set(d.initialState.completedObjectives);
  let changed = true;
  while (changed) {
    changed = false;
    for (const o of d.objectives) {
      if (objectives.has(o.objectiveId) || !o.dependencies.every((x) => objectives.has(x)))
        continue;
      if (
        d.transitions.some((t) =>
          t.effects.some((e) => e.kind === "COMPLETE_OBJECTIVE" && e.key === o.objectiveId),
        )
      ) {
        objectives.add(o.objectiveId);
        changed = true;
      }
    }
  }
  for (const o of d.objectives.filter((x) => x.required))
    if (!objectives.has(o.objectiveId))
      throw new Error(`Required objective ${o.objectiveId} is unreachable.`);
}
