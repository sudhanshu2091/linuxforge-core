/**
 * V38 — Curriculum Knowledge Graph.
 *
 * This is the deterministic structural map of what LinuxForge teaches and how
 * concepts relate. V36 remains authoritative for mastery/progression gates;
 * this graph never grants mastery or progression.
 */
import type { SkillId } from "@/lib/forge/types";
import { PREREQUISITES } from "./mastery-engine";

export type CurriculumNodeKind = "DOMAIN" | "PHASE" | "SKILL" | "CONCEPT";

export type CurriculumNodeId =
  | "domain:linux"
  | "phase:foundations"
  | "phase:shell-operator"
  | "phase:system-operator"
  | "phase:network-operator"
  | "phase:security-operator"
  | `skill:${SkillId}`
  | "concept:paths"
  | "concept:files-directories"
  | "concept:ownership"
  | "concept:rwx"
  | "concept:loops"
  | "concept:shell-scripts"
  | "concept:process-model"
  | "concept:networking-basics"
  | "concept:service-hardening";

export type CurriculumEdgeKind = "CONTAINS" | "PREREQUISITE" | "BUILDS_ON" | "COVERS";

export type CurriculumNode = {
  id: CurriculumNodeId;
  kind: CurriculumNodeKind;
  label: string;
  description: string;
  skillId?: SkillId;
  phaseId?: string;
};

export type CurriculumEdge = {
  from: CurriculumNodeId;
  to: CurriculumNodeId;
  kind: CurriculumEdgeKind;
};

export const CURRICULUM_GRAPH_VERSION = "v38" as const;

const phaseNodes: CurriculumNode[] = [
  {
    id: "phase:foundations",
    kind: "PHASE",
    label: "Linux Foundations",
    description: "Filesystem, paths, permissions and core shell habits.",
  },
  {
    id: "phase:shell-operator",
    kind: "PHASE",
    label: "Shell Operator",
    description: "Iteration and reliable shell scripting built on filesystem fluency.",
  },
  {
    id: "phase:system-operator",
    kind: "PHASE",
    label: "System Operator",
    description: "Processes, jobs and service-oriented Linux operations.",
  },
  {
    id: "phase:network-operator",
    kind: "PHASE",
    label: "Network Operator",
    description: "Networking fundamentals that prepare the learner for security work.",
  },
  {
    id: "phase:security-operator",
    kind: "PHASE",
    label: "Security Operator",
    description: "Defensive hardening and the bridge toward the wider cybersecurity curriculum.",
  },
];

const skillPhase: Record<SkillId, CurriculumNodeId> = {
  filesystem: "phase:foundations",
  permissions: "phase:foundations",
  iteration: "phase:shell-operator",
  "shell-scripting": "phase:shell-operator",
  processes: "phase:system-operator",
  networking: "phase:network-operator",
  hardening: "phase:security-operator",
};

const skillNodes: CurriculumNode[] = (Object.keys(skillPhase) as SkillId[]).map((skillId) => ({
  id: `skill:${skillId}` as CurriculumNodeId,
  kind: "SKILL",
  label:
    skillId === "shell-scripting"
      ? "Shell scripting"
      : skillId[0]!.toUpperCase() + skillId.slice(1),
  description: `Demonstrable LinuxForge capability: ${skillId}.`,
  skillId,
  phaseId: skillPhase[skillId],
}));

const conceptDefinitions: Array<[CurriculumNodeId, string, string]> = [
  ["concept:paths", "Paths", "Absolute/relative paths, working directories and path resolution."],
  [
    "concept:files-directories",
    "Files & directories",
    "Creating, inspecting, moving and removing filesystem objects.",
  ],
  ["concept:ownership", "Ownership", "Users, groups and ownership relationships."],
  [
    "concept:rwx",
    "rwx permissions",
    "Read, write and execute permissions and their representations.",
  ],
  ["concept:loops", "Loops", "Iteration and repeated command execution in shell workflows."],
  [
    "concept:shell-scripts",
    "Shell scripts",
    "Reliable shell programs built from commands, variables and control flow.",
  ],
  [
    "concept:process-model",
    "Process model",
    "Processes, jobs and lifecycle-oriented system operations.",
  ],
  [
    "concept:networking-basics",
    "Networking basics",
    "Core network concepts needed for Linux networking and security.",
  ],
  [
    "concept:service-hardening",
    "Service hardening",
    "Reducing exposure and applying defensive Linux configuration.",
  ],
];

const conceptNodes: CurriculumNode[] = conceptDefinitions.map(([id, label, description]) => ({
  id,
  kind: "CONCEPT",
  label,
  description,
}));

export const CURRICULUM_NODES: readonly CurriculumNode[] = [
  {
    id: "domain:linux",
    kind: "DOMAIN",
    label: "Linux",
    description: "Linux and command-line capability foundation for cybersecurity.",
  },
  ...phaseNodes,
  ...skillNodes,
  ...conceptNodes,
];

const containsEdges: CurriculumEdge[] = [
  ...phaseNodes.map((phase) => ({
    from: "domain:linux" as CurriculumNodeId,
    to: phase.id,
    kind: "CONTAINS" as const,
  })),
  ...skillNodes.map((skill) => ({
    from: skillPhase[skill.skillId!]!,
    to: skill.id,
    kind: "CONTAINS" as const,
  })),
];

const conceptEdges: CurriculumEdge[] = [
  ["skill:filesystem", "concept:paths", "COVERS"],
  ["skill:filesystem", "concept:files-directories", "COVERS"],
  ["skill:permissions", "concept:ownership", "COVERS"],
  ["skill:permissions", "concept:rwx", "COVERS"],
  ["skill:iteration", "concept:loops", "COVERS"],
  ["skill:shell-scripting", "concept:shell-scripts", "COVERS"],
  ["skill:processes", "concept:process-model", "COVERS"],
  ["skill:networking", "concept:networking-basics", "COVERS"],
  ["skill:hardening", "concept:service-hardening", "COVERS"],
].map(([from, to, kind]) => ({
  from: from as CurriculumNodeId,
  to: to as CurriculumNodeId,
  kind: kind as CurriculumEdgeKind,
}));

const prerequisiteEdges: CurriculumEdge[] = (
  Object.entries(PREREQUISITES) as [SkillId, SkillId[]][]
).flatMap(([skill, prerequisites]) =>
  prerequisites.map((prerequisite) => ({
    from: `skill:${prerequisite}` as CurriculumNodeId,
    to: `skill:${skill}` as CurriculumNodeId,
    kind: "PREREQUISITE" as const,
  })),
);

export const CURRICULUM_EDGES: readonly CurriculumEdge[] = [
  ...containsEdges,
  ...prerequisiteEdges,
  ...conceptEdges,
];

const nodeMap = new Map(CURRICULUM_NODES.map((node) => [node.id, node]));

export function getCurriculumNode(id: CurriculumNodeId) {
  return nodeMap.get(id) ?? null;
}

export function getSkillNode(skillId: SkillId) {
  return getCurriculumNode(`skill:${skillId}` as CurriculumNodeId);
}

export function getPhaseSkills(phaseId: CurriculumNodeId): SkillId[] {
  return CURRICULUM_NODES.filter((node) => node.kind === "SKILL" && node.phaseId === phaseId)
    .map((node) => node.skillId!)
    .filter(Boolean);
}

export function getPrerequisiteSkills(skillId: SkillId): SkillId[] {
  return CURRICULUM_EDGES.filter(
    (edge) => edge.kind === "PREREQUISITE" && edge.to === `skill:${skillId}`,
  )
    .map((edge) => getCurriculumNode(edge.from)?.skillId ?? null)
    .filter((value): value is SkillId => value !== null);
}

export function getRelatedConcepts(skillId: SkillId): CurriculumNode[] {
  const skillNode = `skill:${skillId}` as CurriculumNodeId;
  return CURRICULUM_EDGES.filter((edge) => edge.kind === "COVERS" && edge.from === skillNode)
    .map((edge) => getCurriculumNode(edge.to))
    .filter((value): value is CurriculumNode => Boolean(value));
}

export function validateCurriculumGraph(): string[] {
  const errors: string[] = [];
  const ids = new Set<CurriculumNodeId>();
  for (const node of CURRICULUM_NODES) {
    if (ids.has(node.id)) errors.push(`duplicate node: ${node.id}`);
    ids.add(node.id);
  }
  for (const edge of CURRICULUM_EDGES) {
    if (!nodeMap.has(edge.from)) errors.push(`missing edge source: ${edge.from}`);
    if (!nodeMap.has(edge.to)) errors.push(`missing edge target: ${edge.to}`);
  }

  for (const skill of Object.keys(PREREQUISITES) as SkillId[]) {
    const expected = [...PREREQUISITES[skill]].sort();
    const actual = getPrerequisiteSkills(skill).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      errors.push(`prerequisite mismatch for ${skill}`);
    }
  }
  return errors;
}
