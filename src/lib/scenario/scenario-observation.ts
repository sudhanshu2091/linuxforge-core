import type { ScenarioDefinition, ScenarioWorldState } from "./scenario-types";
export type ScenarioObservation = {
  nodes: ScenarioDefinition["nodes"];
  networks: ScenarioDefinition["networks"];
  services: string[];
  artifacts: ScenarioDefinition["artifacts"];
  objectives: ScenarioDefinition["objectives"];
  stateVersion: number;
};
export function observeScenario(d: ScenarioDefinition, s: ScenarioWorldState): ScenarioObservation {
  return {
    nodes: d.nodes.filter((n) => s.knownNodes.includes(n.nodeId) && n.observable),
    networks: d.networks.filter((n) => s.knownNetworks.includes(n.networkId) && n.observable),
    services: [...s.knownServices],
    artifacts: d.artifacts.filter((a) => s.knownArtifacts.includes(a.artifactId) && a.discoverable),
    objectives: d.objectives,
    stateVersion: s.version,
  };
}
