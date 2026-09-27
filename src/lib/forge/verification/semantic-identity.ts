import { createHash } from "node:crypto";
import type { ExerciseContract, VerificationRequirement } from "./types";

/**
 * Build the learner-facing semantic identity of an exercise.
 *
 * Identity fields such as exercise/question ids, version numbers, titles and
 * prose objectives are deliberately excluded. Literal filesystem paths are
 * also normalized so renaming the target object does not create a new
 * semantic question.
 */
export function buildSemanticFingerprint(contract: ExerciseContract): string {
  const identity = {
    concepts: [...contract.concepts].map(normalizeText).sort(),
    prerequisites: [...(contract.prerequisites ?? [])].map(normalizeText).sort(),
    reasoningPattern: normalizeText(contract.reasoningPattern ?? ""),
    scenarioType: normalizeText(contract.scenarioType ?? ""),
    difficulty: contract.difficulty ?? null,
    constraints: {
      requiredMethod: normalizeText(contract.constraints?.requiredMethod ?? ""),
      forbiddenActions: [...(contract.constraints?.forbiddenActions ?? [])]
        .map(normalizeText)
        .sort(),
    },
    requirements: contract.requirements
      .map(normalizeRequirement)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  };

  const canonical = JSON.stringify(sortObject(identity));
  return `m5:${createHash("sha256").update(canonical).digest("hex")}`;
}

function normalizeRequirement(requirement: VerificationRequirement): Record<string, unknown> {
  switch (requirement.kind) {
    case "filesystem":
      return {
        kind: requirement.kind,
        path: "<PATH>",
        objectType: requirement.objectType ?? null,
        exists: requirement.exists ?? null,
      };
    case "permissions":
      return {
        kind: requirement.kind,
        path: "<PATH>",
        permissions: requirement.permissions,
      };
    case "ownership":
      return {
        kind: requirement.kind,
        path: "<PATH>",
        owner: requirement.owner ?? null,
        group: requirement.group ?? null,
      };
    case "content":
      return {
        kind: requirement.kind,
        path: "<PATH>",
        mode: requirement.mode,
        value: normalizeContentValue(requirement.value),
      };
    case "process":
      return {
        kind: requirement.kind,
        command: normalizeCommand(requirement.command),
        state: requirement.state ?? null,
        user: requirement.user ?? null,
        exists: requirement.exists ?? null,
      };
    case "service":
      return {
        kind: requirement.kind,
        name: normalizeText(requirement.name),
        state: requirement.state ?? null,
        enabled: requirement.enabled ?? null,
      };
    case "network":
      return {
        kind: requirement.kind,
        port: requirement.port,
        listening: requirement.listening,
        process: requirement.process ? normalizeCommand(requirement.process) : null,
      };
  }
}

function normalizeContentValue(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function normalizeCommand(value: string): string {
  return normalizeText(value).replace(
    /\/(?:[A-Za-z0-9._~+@%/-]+\/)+[A-Za-z0-9._~+@%/-]+/g,
    "<PATH>",
  );
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortObject(item)]),
    );
  }
  return value;
}
