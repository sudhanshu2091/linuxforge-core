import { describe, it, expect } from "vitest";
import { createScenarioState, isScenarioComplete, recordScenarioEvent } from "./scenario-engine";
import { observeScenario } from "./scenario-observation";
import { createCheckpoint, restoreCheckpoint } from "./scenario-checkpoints";
import type { ScenarioDefinition } from "./scenario-types";
const d: ScenarioDefinition = {
  scenarioId: "s",
  version: 1,
  title: "Scenario",
  description: "",
  mode: "SIMULATION",
  nodes: [
    {
      nodeId: "k",
      name: "Kali",
      role: "ATTACKER",
      networkIds: ["n"],
      services: [],
      exposedPorts: [],
      observable: true,
    },
  ],
  networks: [{ networkId: "n", name: "net", cidr: "10.0.0.0/24", observable: true }],
  artifacts: [
    {
      artifactId: "secret",
      kind: "CREDENTIAL",
      ownerNodeId: "k",
      discoverable: true,
      contentRef: "redacted",
    },
  ],
  objectives: [
    {
      objectiveId: "o",
      title: "Access",
      required: true,
      dependencies: [],
      completionPolicy: "ANY_VALID_PATH",
      requiredEvidence: ["access"],
    },
  ],
  transitions: [
    {
      transitionId: "t",
      trigger: "CREDENTIAL_DISCOVERED",
      preconditions: [],
      effects: [{ kind: "COMPLETE_OBJECTIVE", key: "o" }],
      evidence: ["credential"],
    },
  ],
  initialState: {
    flags: {},
    knownNodes: ["k"],
    knownNetworks: ["n"],
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
describe("V48 scenario engine", () => {
  it("processes stateful events", () => {
    const s = createScenarioState(d),
      n = recordScenarioEvent(d, s, {
        eventId: "e",
        scenarioId: "s",
        sessionId: "x",
        learnerId: "u",
        runtimeId: "r",
        type: "CREDENTIAL_DISCOVERED",
        timestamp: "now",
        data: { artifactId: "secret" },
      });
    expect(isScenarioComplete(d, n)).toBe(true);
  });
  it("hides undiscovered artifacts", () =>
    expect(observeScenario(d, createScenarioState(d)).artifacts).toHaveLength(0));
  it("restores checkpoints", () => {
    const s = createScenarioState(d);
    expect(restoreCheckpoint(createCheckpoint("c", "start", s, "now"))).toEqual(s);
  });
  it("rejects cross scenario", () =>
    expect(() =>
      recordScenarioEvent(d, createScenarioState(d), {
        eventId: "e",
        scenarioId: "x",
        sessionId: "s",
        learnerId: "u",
        runtimeId: "r",
        type: "SCENARIO_EVENT",
        timestamp: "now",
        data: {},
      }),
    ).toThrow());
});
