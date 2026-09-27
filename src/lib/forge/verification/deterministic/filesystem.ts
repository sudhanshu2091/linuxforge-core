import type {
  VerificationFilesystemObject,
  VerificationRequirement,
  RequirementResult,
} from "../types";

export function verifyFilesystem(
  requirement: Extract<VerificationRequirement, { kind: "filesystem" }>,
  objects: VerificationFilesystemObject[],
): RequirementResult {
  const object = objects.find((entry) => entry.path === requirement.path);
  const exists = Boolean(object);
  if (requirement.exists === false) {
    return {
      requirementId: requirement.id,
      met: !exists,
      evidence: exists ? `${requirement.path} exists.` : `${requirement.path} does not exist.`,
      observed: object ?? null,
    };
  }
  const met = exists && (!requirement.objectType || object?.objectType === requirement.objectType);
  return {
    requirementId: requirement.id,
    met,
    evidence: !exists
      ? `${requirement.path} does not exist.`
      : met
        ? `${requirement.path} exists as ${object?.objectType}.`
        : `${requirement.path} exists as ${object?.objectType}, not ${requirement.objectType}.`,
    observed: object ?? null,
  };
}
