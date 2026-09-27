import type {
  VerificationFilesystemObject,
  VerificationRequirement,
  RequirementResult,
} from "../types";

export function verifyPermissions(
  requirement: Extract<VerificationRequirement, { kind: "permissions" }>,
  objects: VerificationFilesystemObject[],
): RequirementResult {
  const object = objects.find((entry) => entry.path === requirement.path);
  const met = Boolean(object && object.permissions === requirement.permissions);
  return {
    requirementId: requirement.id,
    met,
    evidence: !object
      ? `${requirement.path} was not observed.`
      : met
        ? `${requirement.path} has permissions ${object.permissions}.`
        : `${requirement.path} has permissions ${object.permissions}; expected ${requirement.permissions}.`,
    observed: object?.permissions ?? null,
  };
}
