/** V46 Advanced Cybersecurity Lab Ecosystem. */
import type { ResourcePolicy } from "./contract";
import { DEFAULT_RESOURCE_POLICY } from "./contract";

export const LAB_SCENARIO_KINDS = [
  "KALI_WORKSTATION",
  "WEB_SECURITY",
  "NETWORK_ENUMERATION",
  "SYSTEM_SECURITY",
  "PRIVILEGE_ESCALATION",
  "ACTIVE_DIRECTORY",
  "CTF",
  "MULTI_MACHINE_PENTEST",
] as const;
export type LabScenarioKind = (typeof LAB_SCENARIO_KINDS)[number];

export const LAB_NODE_ROLES = [
  "ATTACKER",
  "TARGET",
  "WEB_TARGET",
  "SERVER",
  "DOMAIN_CONTROLLER",
  "CLIENT",
  "ROUTER",
  "UTILITY",
] as const;
export type LabNodeRole = (typeof LAB_NODE_ROLES)[number];

export const LAB_NODE_OS = ["KALI", "DEBIAN", "UBUNTU", "WINDOWS", "ALPINE", "CUSTOM"] as const;
export type LabNodeOs = (typeof LAB_NODE_OS)[number];

export type LabNetwork = {
  networkId: string;
  name: string;
  cidr: string;
  internetAccess: boolean;
  interNetworkAccess: boolean;
};

export type CyberLabNode = {
  nodeId: string;
  name: string;
  role: LabNodeRole;
  os: LabNodeOs;
  imageRef: string;
  networkIds: string[];
  exposedPorts: number[];
  services: string[];
  vulnerable: boolean;
  isolated: true;
};

export type CyberLabTopology = {
  networks: LabNetwork[];
  nodes: CyberLabNode[];
};

export type LabCapability =
  | "terminal"
  | "filesystem"
  | "process-inspection"
  | "service-management"
  | "network-enumeration"
  | "web-testing"
  | "packet-capture"
  | "privilege-escalation"
  | "credential-testing"
  | "directory-services";

export type CyberLabDefinition = {
  labId: string;
  scenarioKind: LabScenarioKind;
  title: string;
  description: string;
  topology: CyberLabTopology;
  capabilities: LabCapability[];
  resourcePolicy: ResourcePolicy;
  maxNodes: number;
  resettable: true;
  snapshotCapable: true;
};

const IPV4_CIDR = /^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
const validPort = (p: number) => Number.isInteger(p) && p >= 1 && p <= 65535;

export function validateCyberLabTopology(topology: CyberLabTopology): void {
  if (!topology.networks.length || !topology.nodes.length)
    throw new Error("Cyber lab topology must contain a network and at least one node.");
  const networks = new Set<string>();
  for (const network of topology.networks) {
    if (!network.networkId || networks.has(network.networkId))
      throw new Error("Network IDs must be unique.");
    if (!IPV4_CIDR.test(network.cidr)) throw new Error("Network CIDR is invalid.");
    networks.add(network.networkId);
  }
  const nodes = new Set<string>();
  for (const node of topology.nodes) {
    if (!node.nodeId || nodes.has(node.nodeId)) throw new Error("Node IDs must be unique.");
    if (!node.name.trim() || !node.imageRef.trim())
      throw new Error("Lab nodes require a name and image reference.");
    if (node.networkIds.length === 0 || node.networkIds.some((id) => !networks.has(id)))
      throw new Error("Every node must reference existing lab networks.");
    if (node.exposedPorts.some((p) => !validPort(p)))
      throw new Error("Lab node contains an invalid port.");
    if (node.role === "ATTACKER" && node.os !== "KALI")
      throw new Error("ATTACKER nodes must use Kali in V46.");
    nodes.add(node.nodeId);
  }
}

export function assertLabNodeAccess(input: {
  authorizedLabId: string;
  requestedLabId: string;
  nodeLabId: string;
}): void {
  if (input.authorizedLabId !== input.requestedLabId || input.requestedLabId !== input.nodeLabId)
    throw new Error("Cyber lab node access denied: lab boundary mismatch.");
}

export function canConnect(
  topology: CyberLabTopology,
  fromNodeId: string,
  toNodeId: string,
): boolean {
  const from = topology.nodes.find((n) => n.nodeId === fromNodeId);
  const to = topology.nodes.find((n) => n.nodeId === toNodeId);
  if (!from || !to) return false;
  const shared = from.networkIds.some((networkId) => to.networkIds.includes(networkId));
  if (!shared) return false;
  return (
    topology.networks.some(
      (n) =>
        from.networkIds.includes(n.networkId) &&
        to.networkIds.includes(n.networkId) &&
        n.interNetworkAccess === false,
    ) || shared
  );
}

export function scenarioCapabilities(kind: LabScenarioKind): LabCapability[] {
  switch (kind) {
    case "KALI_WORKSTATION":
      return [
        "terminal",
        "filesystem",
        "process-inspection",
        "service-management",
        "network-enumeration",
      ];
    case "WEB_SECURITY":
      return ["terminal", "filesystem", "network-enumeration", "web-testing", "packet-capture"];
    case "NETWORK_ENUMERATION":
      return ["terminal", "network-enumeration", "packet-capture", "service-management"];
    case "SYSTEM_SECURITY":
      return ["terminal", "filesystem", "process-inspection", "service-management"];
    case "PRIVILEGE_ESCALATION":
      return [
        "terminal",
        "filesystem",
        "process-inspection",
        "service-management",
        "privilege-escalation",
      ];
    case "ACTIVE_DIRECTORY":
      return [
        "terminal",
        "network-enumeration",
        "credential-testing",
        "directory-services",
        "web-testing",
      ];
    case "CTF":
      return [
        "terminal",
        "filesystem",
        "network-enumeration",
        "web-testing",
        "privilege-escalation",
        "credential-testing",
      ];
    case "MULTI_MACHINE_PENTEST":
      return [
        "terminal",
        "network-enumeration",
        "web-testing",
        "packet-capture",
        "privilege-escalation",
        "credential-testing",
      ];
  }
}

export function buildScenario(input: {
  labId: string;
  kind: LabScenarioKind;
  resourcePolicy?: ResourcePolicy;
}): CyberLabDefinition {
  const resourcePolicy = input.resourcePolicy ?? DEFAULT_RESOURCE_POLICY;
  const networkId = `${input.labId}-training-net`;
  const attackerId = `${input.labId}-kali`;
  const targetId = `${input.labId}-target`;
  const multi =
    input.kind === "ACTIVE_DIRECTORY" ||
    input.kind === "MULTI_MACHINE_PENTEST" ||
    input.kind === "CTF";
  const networks: LabNetwork[] = [
    {
      networkId,
      name: "training",
      cidr: "10.42.0.0/24",
      internetAccess: resourcePolicy.network !== "none",
      interNetworkAccess: false,
    },
  ];
  const nodes: CyberLabNode[] = [
    {
      nodeId: attackerId,
      name: "Kali Attacker",
      role: "ATTACKER",
      os: "KALI",
      imageRef: "kali-rolling",
      networkIds: [networkId],
      exposedPorts: [],
      services: [],
      vulnerable: false,
      isolated: true,
    },
  ];
  if (input.kind !== "KALI_WORKSTATION")
    nodes.push({
      nodeId: targetId,
      name: "Training Target",
      role: input.kind === "WEB_SECURITY" ? "WEB_TARGET" : "TARGET",
      os: input.kind === "ACTIVE_DIRECTORY" ? "WINDOWS" : "DEBIAN",
      imageRef: input.kind === "ACTIVE_DIRECTORY" ? "windows-server-lab" : "training-target",
      networkIds: [networkId],
      exposedPorts: input.kind === "WEB_SECURITY" ? [80, 443] : [22],
      services: input.kind === "WEB_SECURITY" ? ["http", "https"] : ["ssh"],
      vulnerable: true,
      isolated: true,
    });
  if (multi)
    nodes.push({
      nodeId: `${input.labId}-utility`,
      name: "Lab Utility",
      role: "UTILITY",
      os: "ALPINE",
      imageRef: "lab-utility",
      networkIds: [networkId],
      exposedPorts: [],
      services: [],
      vulnerable: false,
      isolated: true,
    });
  const topology = { networks, nodes };
  validateCyberLabTopology(topology);
  return {
    labId: input.labId,
    scenarioKind: input.kind,
    title: `${input.kind.replaceAll("_", " ")} Lab`,
    description: `Isolated ${input.kind.replaceAll("_", " ").toLowerCase()} training environment.`,
    topology,
    capabilities: scenarioCapabilities(input.kind),
    resourcePolicy,
    maxNodes: 8,
    resettable: true,
    snapshotCapable: true,
  };
}

export type LabScenarioState =
  | "DRAFT"
  | "PROVISIONING"
  | "READY"
  | "ACTIVE"
  | "RESETTING"
  | "STOPPED"
  | "QUARANTINED"
  | "DESTROYED";
export const canUseScenario = (state: LabScenarioState): boolean =>
  state === "READY" || state === "ACTIVE";
