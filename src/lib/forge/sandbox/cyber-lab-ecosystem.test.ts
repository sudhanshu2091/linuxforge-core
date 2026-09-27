import { describe, expect, test } from "vitest";
import {
  buildScenario,
  canConnect,
  canUseScenario,
  validateCyberLabTopology,
} from "./cyber-lab-ecosystem";

describe("V46 advanced cybersecurity lab ecosystem", () => {
  test("builds an isolated web-security scenario", () => {
    const lab = buildScenario({ labId: "lab-a", kind: "WEB_SECURITY" });
    expect(lab.topology.nodes).toHaveLength(2);
    expect(lab.topology.nodes[0]?.os).toBe("KALI");
    expect(lab.topology.nodes[1]?.exposedPorts).toEqual([80, 443]);
    expect(lab.capabilities).toContain("web-testing");
  });
  test("builds multi-machine scenarios with bounded node count", () => {
    const lab = buildScenario({ labId: "lab-a", kind: "ACTIVE_DIRECTORY" });
    expect(lab.topology.nodes.length).toBe(3);
    expect(lab.maxNodes).toBe(8);
  });
  test("rejects duplicate nodes and unknown networks", () => {
    expect(() =>
      validateCyberLabTopology({
        networks: [
          {
            networkId: "n",
            name: "n",
            cidr: "10.0.0.0/24",
            internetAccess: false,
            interNetworkAccess: false,
          },
        ],
        nodes: [
          {
            nodeId: "x",
            name: "x",
            role: "TARGET",
            os: "DEBIAN",
            imageRef: "x",
            networkIds: ["n"],
            exposedPorts: [],
            services: [],
            vulnerable: false,
            isolated: true,
          },
          {
            nodeId: "x",
            name: "y",
            role: "TARGET",
            os: "DEBIAN",
            imageRef: "y",
            networkIds: ["missing"],
            exposedPorts: [],
            services: [],
            vulnerable: false,
            isolated: true,
          },
        ],
      }),
    ).toThrow();
  });
  test("prevents a direct connection when nodes do not share a network", () => {
    const lab = buildScenario({ labId: "lab-a", kind: "WEB_SECURITY" });
    const target = lab.topology.nodes[1]!;
    const isolated = { ...target, nodeId: "isolated", networkIds: ["other-net"] };
    expect(
      canConnect(
        { ...lab.topology, nodes: [...lab.topology.nodes, isolated] },
        lab.topology.nodes[0]!.nodeId,
        "isolated",
      ),
    ).toBe(false);
  });
  test("requires lab ownership for node access", async () => {
    const { assertLabNodeAccess } = await import("./cyber-lab-ecosystem");
    expect(() =>
      assertLabNodeAccess({ authorizedLabId: "a", requestedLabId: "b", nodeLabId: "b" }),
    ).toThrow("lab boundary");
  });
  test("only ready or active scenarios accept learner activity", () => {
    expect(canUseScenario("READY")).toBe(true);
    expect(canUseScenario("ACTIVE")).toBe(true);
    expect(canUseScenario("QUARANTINED")).toBe(false);
    expect(canUseScenario("DESTROYED")).toBe(false);
  });
});
