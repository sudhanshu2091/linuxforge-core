import type { RequirementResult, VerificationEvidence, VerificationRequirement } from "../types";

export function verifyService(
  requirement: Extract<VerificationRequirement, { kind: "service" }>,
  evidence: VerificationEvidence,
): RequirementResult {
  const service = evidence.services.find((s) => s.name === requirement.name);
  const met = Boolean(
    service &&
    (!requirement.state || service.state === requirement.state) &&
    (requirement.enabled === undefined || service.enabled === requirement.enabled),
  );

  return {
    requirementId: requirement.id,
    met,
    evidence: !service
      ? `Service ${requirement.name} was not observed.`
      : met
        ? `Service ${requirement.name} matches the requested state.`
        : `Service ${requirement.name} does not match the requested state.`,
    observed: service ?? null,
  };
}
