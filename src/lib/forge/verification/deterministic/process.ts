import type { RequirementResult, VerificationEvidence, VerificationRequirement } from "../types";

export function verifyProcess(
  requirement: Extract<VerificationRequirement, { kind: "process" }>,
  evidence: VerificationEvidence,
): RequirementResult {
  const matches = evidence.processes.filter(
    (process) =>
      process.command === requirement.command || process.command.includes(requirement.command),
  );
  const found = matches.some(
    (process) =>
      (!requirement.state || process.state.includes(requirement.state)) &&
      (!requirement.user || process.user === requirement.user),
  );
  const met = requirement.exists === false ? matches.length === 0 : found;

  return {
    requirementId: requirement.id,
    met,
    evidence: met
      ? `Process ${requirement.command} matched.`
      : `No matching process state was observed for ${requirement.command}.`,
    observed: matches.map((process) => ({
      ...process,
      user: process.user ?? null,
    })),
  };
}
