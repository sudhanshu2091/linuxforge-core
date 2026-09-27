import { assertExerciseContract } from "./contract";
import { verifyFilesystem } from "./deterministic/filesystem";
import { verifyPermissions } from "./deterministic/permissions";
import { verifyOwnership } from "./deterministic/ownership";
import { verifyContent } from "./deterministic/content";
import { verifyProcess } from "./deterministic/process";
import { verifyService } from "./deterministic/service";
import { verifyNetwork } from "./deterministic/networking";
import type {
  ExerciseContract,
  VerificationEvidence,
  VerificationResult,
  FailureClassification,
} from "./types";

export const VERIFIER_VERSION = "m5-deterministic-v1";

export function verifyExercise(
  contract: ExerciseContract,
  evidence: VerificationEvidence,
): VerificationResult {
  assertExerciseContract(contract);
  if (evidence.environmentId.length === 0)
    throw new Error("Verification evidence has no environment identity.");
  const requirements = contract.requirements.map((requirement) => {
    switch (requirement.kind) {
      case "filesystem":
        return verifyFilesystem(requirement, evidence.filesystem);
      case "permissions":
        return verifyPermissions(requirement, evidence.filesystem);
      case "ownership":
        return verifyOwnership(requirement, evidence.filesystem);
      case "content":
        return verifyContent(requirement, evidence.filesystem);
      case "process":
        return verifyProcess(requirement, evidence);
      case "service":
        return verifyService(requirement, evidence);
      case "network":
        return verifyNetwork(requirement, evidence);
    }
  });
  const met = requirements.filter((result) => result.met).length;
  const total = requirements.length;
  const score = total === 0 ? 0 : Math.round((met / total) * 100);
  const verdict = met === total ? "PASS" : met === 0 ? "FAIL" : "PARTIAL";
  const failureClassification: FailureClassification | null =
    verdict === "PASS" ? null : classifyFailure(requirements);
  return {
    verdict,
    requirements,
    score,
    failureClassification,
    evidence,
    verifierVersion: VERIFIER_VERSION,
    contractVersion: contract.version,
  };
}

function classifyFailure(
  results: Array<{ met: boolean; evidence: string }>,
): FailureClassification {
  if (results.every((result) => !result.met)) return "INCOMPLETE";
  const text = results
    .filter((result) => !result.met)
    .map((result) => result.evidence)
    .join(" ")
    .toLowerCase();
  if (text.includes("permission")) return "PERMISSION_ERROR";
  if (text.includes("path") || text.includes("observed")) return "WRONG_PATH";
  return "INCOMPLETE";
}
