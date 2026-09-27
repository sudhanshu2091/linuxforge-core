import type {
  RequirementResult,
  VerificationFilesystemObject,
  VerificationRequirement,
} from "../types";

function normalized(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

export function verifyContent(
  requirement: Extract<VerificationRequirement, { kind: "content" }>,
  objects: VerificationFilesystemObject[],
): RequirementResult {
  const object = objects.find((entry) => entry.path === requirement.path);
  const content = object?.content;

  if (!object || typeof content !== "string") {
    return {
      requirementId: requirement.id,
      met: false,
      evidence: `${requirement.path} content was not available.`,
      observed: null,
    };
  }

  let met = false;
  try {
    met =
      requirement.mode === "exact"
        ? content === requirement.value
        : requirement.mode === "contains"
          ? content.includes(requirement.value)
          : requirement.mode === "normalized"
            ? normalized(content) === normalized(requirement.value)
            : new RegExp(requirement.value, "m").test(content);
  } catch {
    met = false;
  }

  return {
    requirementId: requirement.id,
    met,
    evidence: met
      ? `${requirement.path} satisfies the ${requirement.mode} content requirement.`
      : `${requirement.path} content does not satisfy the ${requirement.mode} requirement.`,
    observed: content.slice(0, 4096),
  };
}
