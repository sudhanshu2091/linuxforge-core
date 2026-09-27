import type { VerificationEvidence } from "./types";

export function assertEvidenceCurrent(input: {
  evidence: VerificationEvidence;
  environmentGeneration: number;
}): void {
  if (input.evidence.environmentGeneration !== input.environmentGeneration) {
    throw new Error("Verification evidence is stale because the environment generation changed.");
  }
}
