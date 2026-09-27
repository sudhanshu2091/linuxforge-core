import type { FailureClassification, VerificationResult } from "../types";

/** Advisory-only semantic boundary. It can enrich classification later but cannot change facts or verdict. */
export type SemanticAnalysis = {
  classification: FailureClassification | null;
  explanation: string;
};

export function deterministicSemanticFallback(result: VerificationResult): SemanticAnalysis {
  if (result.verdict === "PASS")
    return { classification: null, explanation: "All authoritative requirements passed." };
  return {
    classification: result.failureClassification,
    explanation: "Authoritative environment evidence did not satisfy every requirement.",
  };
}
