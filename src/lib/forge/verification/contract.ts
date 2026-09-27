import type { ExerciseContract, VerificationRequirement } from "./types";

const ID = /^[A-Za-z0-9._:-]{1,128}$/;
const ABSOLUTE_PATH = /^\/[A-Za-z0-9._~+@%/-]+$/;

export function assertExerciseContract(contract: ExerciseContract): void {
  if (!ID.test(contract.exerciseId)) throw new Error("Invalid exercise id.");
  if (!Number.isInteger(contract.version) || contract.version < 1)
    throw new Error("Invalid exercise version.");
  if (!contract.objective.trim()) throw new Error("Exercise objective is required.");
  if (!Array.isArray(contract.requirements) || contract.requirements.length === 0) {
    throw new Error("Exercise must contain at least one verification requirement.");
  }
  const ids = new Set<string>();
  for (const requirement of contract.requirements) {
    if (!ID.test(requirement.id) || ids.has(requirement.id))
      throw new Error("Exercise requirement ids must be unique and valid.");
    ids.add(requirement.id);
    validateRequirement(requirement);
  }
}

function validateRequirement(requirement: VerificationRequirement): void {
  if ("path" in requirement && !ABSOLUTE_PATH.test(requirement.path)) {
    throw new Error(`Invalid absolute path in requirement ${requirement.id}.`);
  }
  if (requirement.kind === "permissions" && !/^[0-7]{3,4}$/.test(requirement.permissions)) {
    throw new Error(`Invalid permissions in requirement ${requirement.id}.`);
  }
  if (
    requirement.kind === "network" &&
    (!Number.isInteger(requirement.port) || requirement.port < 1 || requirement.port > 65535)
  ) {
    throw new Error(`Invalid network port in requirement ${requirement.id}.`);
  }
  if (requirement.kind === "content" && requirement.value.length > 64_000) {
    throw new Error(`Content requirement ${requirement.id} is too large.`);
  }
}
