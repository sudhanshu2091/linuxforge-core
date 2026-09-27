/**
 * V39 — Curriculum Content Engine.
 *
 * V38 defines the structural curriculum graph. V39 supplies reusable teaching
 * representations for that graph. It does not decide mastery, progression,
 * grades, lab control, or security policy.
 *
 * Content is original LinuxForge instructional copy grounded in the trusted
 * knowledge/question intelligence layers. External material is represented by
 * provenance and pattern references rather than copied verbatim.
 */
import type { ObservationCategory, SkillId } from "@/lib/forge/types";
import {
  getPrerequisiteSkills,
  getRelatedConcepts,
  getSkillNode,
  type CurriculumNodeId,
} from "./curriculum-graph";
import { KNOWLEDGE_CORPUS } from "@/lib/ai/knowledge-corpus";
import { retrieveKnowledgeChunks } from "@/lib/ai/knowledge-retrieval";
import { getTrustedQuestionSource, type QuestionPattern } from "@/lib/ai/question-intelligence";

export const CURRICULUM_CONTENT_VERSION = "v39" as const;

export type CurriculumContentKind =
  | "EXPLANATION"
  | "EXAMPLE"
  | "DEMONSTRATION"
  | "EXERCISE"
  | "CHALLENGE"
  | "HINT"
  | "REMEDIATION"
  | "REVIEW"
  | "VARIATION"
  | "PREREQUISITE"
  | "ASSESSMENT"
  | "LAB";

export type ContentOrigin = "original" | "source_grounded";

export type ContentProvenance = {
  origin: ContentOrigin;
  sourceIds: string[];
  sourceRefs: Array<{ id: string; name: string; url: string }>;
  patternRefs: string[];
  attributionRequired: boolean;
};

export type CurriculumContentItem = {
  id: string;
  version: typeof CURRICULUM_CONTENT_VERSION;
  nodeId: CurriculumNodeId;
  skillId: SkillId;
  conceptIds: CurriculumNodeId[];
  kind: CurriculumContentKind;
  title: string;
  body: string;
  objective: string;
  difficulty: number;
  prerequisites: SkillId[];
  mistakeTargets: ObservationCategory[];
  tags: string[];
  provenance: ContentProvenance;
};

export type CurriculumContentRequest = {
  skillId: SkillId;
  difficulty?: number;
  kinds?: readonly CurriculumContentKind[];
  mistake?: ObservationCategory | null;
  query?: string;
  questionPatterns?: readonly QuestionPattern[];
  limit?: number;
};

export type CurriculumContentBundle = {
  version: typeof CURRICULUM_CONTENT_VERSION;
  skillId: SkillId;
  skillLabel: string;
  conceptIds: CurriculumNodeId[];
  prerequisiteSkills: SkillId[];
  items: CurriculumContentItem[];
  groundingChunkIds: string[];
};

const clampDifficulty = (value: number) => Math.max(1, Math.min(5, Math.round(value)));

const defaultKinds: readonly CurriculumContentKind[] = [
  "EXPLANATION",
  "EXAMPLE",
  "DEMONSTRATION",
  "EXERCISE",
  "HINT",
  "REVIEW",
  "VARIATION",
];

const skillContent: Record<
  SkillId,
  {
    objective: string;
    explanation: string;
    example: string;
    demonstration: string;
    exercise: string;
    challenge: string;
    hint: string;
    remediation: string;
    review: string;
    variation: string;
    assessment: string;
    lab: string;
  }
> = {
  filesystem: {
    objective: "Navigate and manipulate Linux filesystem objects while verifying paths and state.",
    explanation:
      "Treat a path as a precise address. Start from the current working directory, distinguish absolute from relative paths, and inspect each parent before changing filesystem state.",
    example:
      "If the target is reports/today.txt, first establish where you are with pwd and inspect the parent with ls. Then operate on the exact path rather than guessing its location.",
    demonstration:
      "Demonstrate a filesystem task by observing the starting directory, creating or locating the required object, and verifying the final state with an independent observation.",
    exercise:
      "Create a small directory tree, place a file at a specified relative path, then prove that the requested object exists at that exact location.",
    challenge:
      "Recover a task after the apparent target path is wrong: inspect the filesystem, identify the intended object, correct the path, and verify the final state.",
    hint: "Before changing the command, ask: what does pwd say, what exists in the parent directory, and is the final name spelled exactly as requested?",
    remediation:
      "Repair path reasoning with a short sequence: establish cwd, inspect the parent, identify object type, perform one change, then verify.",
    review:
      "Explain the difference between an absolute path and a relative path, then demonstrate both against a known lab directory.",
    variation:
      "Repeat the same filesystem objective from a different starting directory so path reasoning, not memorized commands, is tested.",
    assessment:
      "Given a target path and an existing lab state, complete the objective and provide observable evidence that the intended filesystem state was reached.",
    lab: "Use the isolated Linux lab to create, inspect, move, or verify filesystem objects without leaving the authorized workspace.",
  },
  permissions: {
    objective:
      "Reason about owner, group, and other permission classes and apply the requested access safely.",
    explanation:
      "Unix permissions are evaluated separately for owner, group, and others. In numeric notation, read, write, and execute contribute 4, 2, and 1 respectively.",
    example:
      "For a requested owner read/write and group read configuration, translate each class independently before choosing a chmod representation, then inspect the resulting mode.",
    demonstration:
      "Demonstrate permission reasoning by inspecting the current mode, translating the requested access class-by-class, applying the change, and verifying it.",
    exercise:
      "Given a lab file with known ownership, set a specified owner/group/other access pattern and verify the resulting mode.",
    challenge:
      "Diagnose a permission mismatch where the command ran but the resulting access is not the requested state; inspect the mode and correct only the necessary class.",
    hint: "Do not memorize a number in isolation. Map owner, group, and others first, then map read/write/execute to the numeric or symbolic representation.",
    remediation:
      "Practice translating one permission class at a time and verifying with ls -l before combining multiple classes.",
    review:
      "Translate several owner/group/other permission requirements into symbolic and numeric forms, then verify one in the lab.",
    variation:
      "Keep the same access objective but change ownership or the starting mode so the learner must reason about the current state.",
    assessment:
      "Apply and verify a requested permission state while demonstrating that the requested access classes were understood rather than guessed.",
    lab: "Use the isolated Linux lab to inspect ownership and modes, change permissions, and verify access without affecting host files.",
  },
  iteration: {
    objective: "Use shell iteration to repeat an operation across changing values or conditions.",
    explanation:
      "A loop is a method, not merely repeated output. It contains a changing value or condition, a command body, and a stopping rule.",
    example:
      "A for loop can process each name in a known set while using the current item inside the command body.",
    demonstration:
      "Demonstrate iteration by identifying the loop variable, the repeated command, and the stopping condition before running it.",
    exercise:
      "Use a shell loop to perform the same observable filesystem operation across a small set of lab values.",
    challenge:
      "Repair a loop that produces some correct results but mishandles one item; inspect the changing value and adjust the loop logic rather than manually patching output.",
    hint: "Name the three moving parts: what changes, what repeats, and what stops the repetition.",
    remediation:
      "Start with the smallest loop that proves one iteration, then add the collection or condition and verify each iteration's effect.",
    review:
      "Explain when a loop demonstrates more than manually repeating the same command, then write a minimal example.",
    variation:
      "Keep the objective but change the input collection or stopping condition so the learner must adapt the loop.",
    assessment:
      "Complete a repeated-operation task using an actual loop and provide evidence that the loop, not manual repetition, performed the work.",
    lab: "Use the isolated Linux lab to run bounded loops over small, explicit inputs and inspect their results.",
  },
  "shell-scripting": {
    objective:
      "Build reliable shell scripts from commands, variables, control flow, and observable exit behavior.",
    explanation:
      "Shell scripting combines commands with variables, quoting, control flow, and exit behavior. Reliability comes from making inputs and state changes explicit and testable.",
    example:
      "A script can store a target path in a variable, quote it when used, perform an operation, and then inspect the result instead of assuming success.",
    demonstration:
      "Demonstrate a script by showing its inputs, the command flow, the branch or loop involved, and the evidence used to verify the result.",
    exercise:
      "Write a small Bash script that accepts a controlled input, performs a filesystem operation, and reports a meaningful result.",
    challenge:
      "Debug a script that works for simple input but fails on a path containing spaces or an unexpected state; identify the shell-language issue before changing the objective.",
    hint: "Separate the problem into input, expansion, command execution, exit status, and verification.",
    remediation:
      "Reduce the script to one variable and one command, verify it, then add quoting and control flow one piece at a time.",
    review: "Explain how variables, quoting, pipes, and exit codes affect a small shell workflow.",
    variation:
      "Preserve the same script objective while changing input shape or adding one controlled failure case.",
    assessment:
      "Create or repair a small shell script and demonstrate its behavior on both a normal case and one controlled edge case.",
    lab: "Use the isolated Linux lab to execute bounded shell scripts against lab-owned inputs and inspect their outputs and exit behavior.",
  },
  processes: {
    objective:
      "Inspect Linux processes and jobs, reason about their state, and act on the correct process identity.",
    explanation:
      "A running process has an identity such as a PID and a state. Inspect the process before sending a signal or changing its execution context.",
    example:
      "Use process inspection to identify a target PID and state before taking an authorized action against that specific process.",
    demonstration:
      "Demonstrate process reasoning by observing process identity and state, choosing the least invasive authorized action, and verifying the result.",
    exercise:
      "Inspect a controlled lab process, identify its PID and state, and perform a permitted lifecycle operation followed by verification.",
    challenge:
      "Troubleshoot a process that is not behaving as expected by separating identity, state, parent/child relationships, and resource evidence.",
    hint: "Never act on a vague process name when the task requires a specific process. First identify the PID and relevant state.",
    remediation:
      "Practice a repeatable sequence: list, identify, inspect state, act on the exact target, verify.",
    review:
      "Explain PID, process state, job, and signal in the context of one controlled lab process.",
    variation:
      "Use a different process state or parent/child relationship while keeping the observation-and-verification workflow.",
    assessment:
      "Identify and safely manage a specified lab process using observable evidence of identity and resulting state.",
    lab: "Use the isolated Linux lab for controlled process inspection and lifecycle exercises only.",
  },
  networking: {
    objective:
      "Observe Linux network state systematically and identify the layer relevant to a connectivity problem.",
    explanation:
      "Network troubleshooting is layered. Observe interface/address state, routes, name resolution, reachability, and socket/service state before changing configuration.",
    example:
      "If a service name resolves but cannot be reached, separate DNS evidence from routing and socket evidence instead of treating the failure as one generic network problem.",
    demonstration:
      "Demonstrate layered troubleshooting by collecting local interface, route, resolution, reachability, and socket evidence in that order where applicable.",
    exercise:
      "Inspect a controlled lab network scenario and determine which layer explains the observed failure before making an authorized change.",
    challenge:
      "Diagnose a multi-symptom network scenario where one observation is healthy and another is failing; use evidence to isolate the failing layer.",
    hint: "Start with what the local machine knows: interface/address, route, name resolution, reachability, then listening sockets.",
    remediation:
      "Practice one observation per layer and write down what each result rules in or rules out.",
    review:
      "Explain why interface, route, DNS, reachability, and socket observations answer different questions.",
    variation:
      "Change the failing layer while preserving the same troubleshooting workflow so the learner must interpret new evidence.",
    assessment:
      "Diagnose a bounded lab networking issue and justify the selected layer using concrete observations.",
    lab: "Use the isolated network lab for authorized discovery and troubleshooting against explicitly modeled targets.",
  },
  hardening: {
    objective:
      "Apply defensive Linux hardening principles while preserving authorized functionality and minimizing exposure.",
    explanation:
      "Hardening reduces unnecessary exposure. Confirm scope, observe current configuration, identify the risk, apply the least invasive authorized change, and verify the resulting state.",
    example:
      "A service-hardening task should establish what is listening and why before disabling or restricting anything, then verify that the intended exposure changed.",
    demonstration:
      "Demonstrate a hardening workflow with scope confirmation, baseline observation, controlled change, and post-change verification.",
    exercise:
      "Inspect a deliberately weak but safe lab configuration, identify one unnecessary exposure, apply the specified hardening change, and verify it.",
    challenge:
      "Choose the smallest authorized defensive change that addresses a modeled exposure without breaking an unrelated service.",
    hint: "Observe first. Ask what is exposed, why it exists, what the task authorizes, and how you will verify the change.",
    remediation:
      "Return to the safety-first workflow: scope, observe, hypothesize, least-invasive authorized change, verify, record evidence.",
    review:
      "Explain least privilege, attack surface, authorization scope, and verification using a controlled lab example.",
    variation:
      "Present a different modeled exposure with the same safety boundary so the learner must transfer the hardening method.",
    assessment:
      "Perform and verify a bounded defensive change while staying inside the explicitly authorized lab scope.",
    lab: "Use only isolated, authorized security labs. Stop when an action would leave the modeled training boundary.",
  },
};

function sourceRefsFor(ids: readonly string[]) {
  return ids.flatMap((id) => {
    const source = getTrustedQuestionSource(id);
    if (source) return [{ id: source.id, name: source.name, url: source.url }];
    const item = KNOWLEDGE_CORPUS.find((chunk) => chunk.sourceIds.includes(id));
    return item ? [{ id, name: id, url: `source:${id}` }] : [];
  });
}

function buildGrounding(skillId: SkillId, request: CurriculumContentRequest) {
  const query =
    request.query ??
    `${skillId} ${getRelatedConcepts(skillId)
      .map((node) => node.label)
      .join(" ")}`;
  const chunks = retrieveKnowledgeChunks({
    query,
    skills: [skillId],
    ...(request.mistake ? { mistake: request.mistake } : {}),
    ...(request.difficulty != null ? { difficulty: request.difficulty } : {}),
    limit: 6,
  });
  const patterns = (request.questionPatterns ?? [])
    .filter((pattern) => pattern.skills.includes(skillId))
    .slice(0, 6);
  const sourceIds = [
    ...new Set([
      ...chunks.flatMap((chunk) => chunk.sourceIds),
      ...patterns.map((pattern) => pattern.sourceId),
    ]),
  ];
  return { chunks, patterns, sourceIds };
}

function bodyFor(kind: CurriculumContentKind, material: (typeof skillContent)[SkillId]): string {
  const key: Record<CurriculumContentKind, keyof typeof material> = {
    EXPLANATION: "explanation",
    EXAMPLE: "example",
    DEMONSTRATION: "demonstration",
    EXERCISE: "exercise",
    CHALLENGE: "challenge",
    HINT: "hint",
    REMEDIATION: "remediation",
    REVIEW: "review",
    VARIATION: "variation",
    PREREQUISITE: "explanation",
    ASSESSMENT: "assessment",
    LAB: "lab",
  };
  return material[key[kind]];
}

function mistakeTargets(
  kind: CurriculumContentKind,
  mistake: ObservationCategory | null | undefined,
): ObservationCategory[] {
  if (mistake) return [mistake];
  if (kind === "HINT" || kind === "REMEDIATION")
    return ["CONCEPT_CONFUSION", "PARTIAL_UNDERSTANDING"];
  if (kind === "CHALLENGE") return ["MISREAD_QUESTION", "RANDOM_TRIAL_AND_ERROR"];
  return [];
}

function makeItem(
  skillId: SkillId,
  kind: CurriculumContentKind,
  difficulty: number,
  request: CurriculumContentRequest,
  grounding: ReturnType<typeof buildGrounding>,
): CurriculumContentItem {
  const node = getSkillNode(skillId);
  if (!node) throw new Error(`Unknown curriculum skill: ${skillId}`);
  const concepts = getRelatedConcepts(skillId).map((concept) => concept.id);
  const prerequisites = getPrerequisiteSkills(skillId);
  const material = skillContent[skillId];
  const title = `${material.objective.split(".")[0]} — ${kind.toLowerCase().replace(/_/g, " ")}`;
  const sourceIds = grounding.sourceIds;
  const patternRefs = grounding.patterns.map((pattern) => pattern.id);
  return {
    id: `content:${skillId}:${kind.toLowerCase()}:d${difficulty}`,
    version: CURRICULUM_CONTENT_VERSION,
    nodeId: node.id,
    skillId,
    conceptIds: concepts,
    kind,
    title,
    body: bodyFor(kind, material),
    objective: material.objective,
    difficulty,
    prerequisites,
    mistakeTargets: mistakeTargets(kind, request.mistake),
    tags: [skillId, ...concepts.map((id) => id.replace(/^concept:/, "")), kind.toLowerCase()],
    provenance: {
      origin: sourceIds.length || patternRefs.length ? "source_grounded" : "original",
      sourceIds,
      sourceRefs: sourceRefsFor(sourceIds),
      patternRefs,
      attributionRequired: sourceIds.some((id) => id === "linuxjourney"),
    },
  };
}

export function buildCurriculumContent(input: CurriculumContentRequest): CurriculumContentBundle {
  const material = skillContent[input.skillId];
  if (!material) throw new Error(`Unsupported curriculum skill: ${input.skillId}`);
  const difficulty = clampDifficulty(input.difficulty ?? 1);
  const allowed = input.kinds?.length ? input.kinds : defaultKinds;
  const grounding = buildGrounding(input.skillId, input);
  const prerequisiteKinds = getPrerequisiteSkills(input.skillId).length
    ? ["PREREQUISITE" as const]
    : [];
  const kinds = [...new Set([...prerequisiteKinds, ...allowed])];
  const items = kinds
    .map((kind) => makeItem(input.skillId, kind, difficulty, input, grounding))
    .slice(0, input.limit ?? 8);
  return {
    version: CURRICULUM_CONTENT_VERSION,
    skillId: input.skillId,
    skillLabel: material.objective.split(".")[0] ?? input.skillId,
    conceptIds: getRelatedConcepts(input.skillId).map((node) => node.id),
    prerequisiteSkills: getPrerequisiteSkills(input.skillId),
    items,
    groundingChunkIds: grounding.chunks.map((chunk) => chunk.id),
  };
}

export function validateCurriculumContent(bundle: CurriculumContentBundle): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const item of bundle.items) {
    if (ids.has(item.id)) errors.push(`duplicate content id: ${item.id}`);
    ids.add(item.id);
    if (item.version !== CURRICULUM_CONTENT_VERSION)
      errors.push(`invalid content version: ${item.id}`);
    if (item.skillId !== bundle.skillId) errors.push(`skill mismatch: ${item.id}`);
    if (!item.body.trim()) errors.push(`empty body: ${item.id}`);
    if (item.difficulty < 1 || item.difficulty > 5) errors.push(`invalid difficulty: ${item.id}`);
    if (
      item.provenance.origin === "source_grounded" &&
      item.provenance.sourceIds.length === 0 &&
      item.provenance.patternRefs.length === 0
    ) {
      errors.push(`grounded item has no provenance: ${item.id}`);
    }
  }
  return errors;
}
