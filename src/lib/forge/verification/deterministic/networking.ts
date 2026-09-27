import type { VerificationEvidence, VerificationRequirement, RequirementResult } from "../types";

export function verifyNetwork(
  requirement: Extract<VerificationRequirement, { kind: "network" }>,
  evidence: VerificationEvidence,
): RequirementResult {
  const listeners = evidence.network.filter((entry) => entry.port === requirement.port);
  const found =
    listeners.length > 0 &&
    (!requirement.process ||
      listeners.some((entry) => entry.process.includes(requirement.process!)));
  const met = requirement.listening ? found : !found;
  return {
    requirementId: requirement.id,
    met,
    evidence: met
      ? `Port ${requirement.port} matches the requested listening state.`
      : `Port ${requirement.port} does not match the requested listening state.`,
    observed: listeners,
  };
}
