/**
 * Deterministic verifier (server-only).
 *
 * The verifier is the FINAL AUTHORITY on mission status. No AI, no heuristics
 * about "seems right": it inspects the modelled world state, the recorded
 * method evidence and the contract's rules only.
 */

import type { Contract } from "./contracts.server";
import type { MethodEvidence, World } from "./executor.server";
import type { Verification } from "./types";

export function verify(
  contract: Contract,
  world: World,
  evidence: MethodEvidence,
  opts: { blockedReason?: string | null; hintsUsed: number },
): Verification {
  if (opts.blockedReason) {
    return {
      status: "BLOCKED_BY_SAFETY_POLICY",
      objectives: contract.verify(world, evidence).objectives,
      score: 0,
      message: `That action is not allowed in the training sandbox. ${opts.blockedReason}`,
      remediation: [
        "Stay inside your own lab workspace and use the modelled, defensive commands. Type help to see them.",
      ],
      wentWell: [],
    };
  }

  const outcome = contract.verify(world, evidence);
  const met = outcome.objectives.filter((o) => o.met).length;
  const all = outcome.objectives.length;
  const allMet = met === all;

  let status: Verification["status"];
  if (allMet && outcome.skillDemonstrated) status = "COMPLETE";
  else if (allMet && !outcome.skillDemonstrated) status = "RESULT_CORRECT_SKILL_NOT_DEMONSTRATED";
  else if (!allMet && outcome.skillAppliedToWrongTarget)
    status = "RESULT_INCORRECT_SKILL_DEMONSTRATED";
  else status = "INCOMPLETE";

  const base = all === 0 ? 0 : Math.round((met / all) * 100);
  const hintPenalty = Math.min(30, opts.hintsUsed * 7);
  const score =
    status === "COMPLETE"
      ? Math.max(60, 100 - hintPenalty)
      : status === "RESULT_CORRECT_SKILL_NOT_DEMONSTRATED"
        ? Math.min(70, base - 20)
        : Math.max(0, base - hintPenalty);

  const wentWell: string[] = [];
  for (const o of outcome.objectives) if (o.met) wentWell.push(o.label);
  if (outcome.skillDemonstrated)
    wentWell.push(`${contract.requiredSkills.join(" / ")} applied yourself`);
  if (opts.hintsUsed === 0 && status === "COMPLETE") wentWell.push("Solved with no hints");

  const message =
    status === "COMPLETE"
      ? contract.successStory
      : status === "RESULT_CORRECT_SKILL_NOT_DEMONSTRATED"
        ? "The end state is right, but the skill this mission is about was not the thing that got you there. Redo it the intended way and it will count fully."
        : status === "RESULT_INCORRECT_SKILL_DEMONSTRATED"
          ? "You clearly know the technique — it just landed on the wrong target. Check the exact path or name the brief asks for."
          : contract.failureStory;

  return {
    status,
    objectives: outcome.objectives,
    score: Math.max(0, Math.min(100, score)),
    message,
    remediation: status === "COMPLETE" ? [] : contract.remediation,
    wentWell,
  };
}
