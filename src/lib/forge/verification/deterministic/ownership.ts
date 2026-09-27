import type {
  VerificationFilesystemObject,
  VerificationRequirement,
  RequirementResult,
} from "../types";

export function verifyOwnership(
  requirement: Extract<VerificationRequirement, { kind: "ownership" }>,
  objects: VerificationFilesystemObject[],
): RequirementResult {
  const object = objects.find((entry) => entry.path === requirement.path);
  const ownerOk = !requirement.owner || object?.owner === requirement.owner;
  const groupOk = !requirement.group || object?.group === requirement.group;
  const met = Boolean(object && ownerOk && groupOk);
  return {
    requirementId: requirement.id,
    met,
    evidence: !object
      ? `${requirement.path} was not observed.`
      : met
        ? `${requirement.path} ownership is ${object.owner ?? "unknown"}:${object.group ?? "unknown"}.`
        : `${requirement.path} ownership is ${object.owner ?? "unknown"}:${object.group ?? "unknown"}; expected ${requirement.owner ?? "*"}:${requirement.group ?? "*"}.`,
    observed: object ? { owner: object.owner, group: object.group } : null,
  };
}
