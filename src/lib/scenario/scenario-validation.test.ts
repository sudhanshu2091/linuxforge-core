import { describe, it, expect } from "vitest";
import { validateScenario, validateObjectiveReachability } from "./scenario-validation";
import type { ScenarioDefinition } from "./scenario-types";
const b: ScenarioDefinition = {
  scenarioId: "x",
  version: 1,
  title: "x",
  description: "",
  mode: "TRAINING",
  nodes: [
    {
      nodeId: "n",
      name: "n",
      role: "TARGET",
      networkIds: ["net"],
      services: [],
      exposedPorts: [],
      observable: true,
    },
  ],
  networks: [{ networkId: "net", name: "n", cidr: "10.0.0.0/24", observable: true }],
  artifacts: [],
  objectives: [
    {
      objectiveId: "o",
      title: "o",
      required: true,
      dependencies: [],
      completionPolicy: "STATE_REACHED",
      requiredEvidence: [],
    },
  ],
  transitions: [
    {
      transitionId: "t",
      trigger: "SCENARIO_EVENT",
      preconditions: [],
      effects: [{ kind: "COMPLETE_OBJECTIVE", key: "o" }],
      evidence: [],
    },
  ],
  initialState: {
    flags: {},
    knownNodes: ["n"],
    knownNetworks: ["net"],
    knownServices: [],
    knownArtifacts: [],
    networkAccess: [],
    completedObjectives: [],
    triggeredTransitions: [],
    actionCount: 0,
    version: 1,
  },
  maxNodes: 8,
  maxTransitions: 8,
};
describe("V48 validation", () => {
  it("accepts valid", () => {
    expect(() => validateScenario(b)).not.toThrow();
    expect(() => validateObjectiveReachability(b)).not.toThrow();
  });
  it("rejects duplicates", () =>
    expect(() => validateScenario({ ...b, nodes: [...b.nodes, ...b.nodes] })).toThrow());
  it("rejects unknown network", () =>
    expect(() =>
      validateScenario({ ...b, nodes: [{ ...b.nodes[0]!, networkIds: ["bad"] }] }),
    ).toThrow());
  it("rejects unreachable objective", () =>
    expect(() => validateObjectiveReachability({ ...b, transitions: [] })).toThrow());
});
