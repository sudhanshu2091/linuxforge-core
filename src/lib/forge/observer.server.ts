/**
 * AI Observer layer (server-only).
 *
 * The observer OBSERVES. It classifies what the learner appeared to do and
 * writes friendly coaching, but it never decides the mission status — that is
 * the deterministic verifier's job alone.
 *
 * FUTURE AI ADAPTER BOUNDARY
 * --------------------------
 * `ObserverAdapter` is the seam a real model would plug into later. Today the
 * only implementation is `deterministicObserver`. No model is called and no
 * model output is simulated.
 */

import type { Contract } from "./contracts.server";
import type { ExecutionResult } from "./executor.server";
import type { Observation, Verification } from "./types";

export type ObserverInput = {
  contract: Contract;
  raw: string;
  execution: ExecutionResult;
  verification: Verification;
  /** Commands recorded across this attempt, oldest first. */
  history: string[];
  hintsUsed: number;
  language: "English" | "Hinglish" | "Mix both";
};

export type ObserverAdapter = {
  id: string;
  observe: (input: ObserverInput) => Observation;
};

const KNOWN = ["mkdir", "touch", "chmod", "ls", "cd", "cat", "echo", "pwd", "stat", "tree", "help", "clear", "for"];

function nearestKnown(word: string): string | null {
  const distance = (a: string, b: string) => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]) as number[][];
    for (let j = 0; j <= b.length; j++) (dp[0] as number[])[j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        (dp[i] as number[])[j] = Math.min(
          (dp[i - 1] as number[])[j]! + 1,
          (dp[i] as number[])[j - 1]! + 1,
          (dp[i - 1] as number[])[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
    return (dp[a.length] as number[])[b.length]!;
  };
  let best: string | null = null;
  let bestD = 99;
  for (const k of KNOWN) {
    const d = distance(word, k);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return bestD > 0 && bestD <= 2 ? best : null;
}

function line(language: ObserverInput["language"], english: string, hinglish: string): string {
  if (language === "English") return english;
  if (language === "Hinglish") return hinglish;
  return `${english} ${hinglish}`;
}

export const deterministicObserver: ObserverAdapter = {
  id: "forge-deterministic-observer-v1",
  observe({ contract, raw, execution, verification, history, hintsUsed, language }) {
    const first = raw.trim().split(/\s+/)[0] ?? "";
    const errored = execution.lines.some((l) => l.kind === "error");
    const skillTarget = contract.requiredSkills;
    const base = { intent: contract.objective, skillTarget };

    if (execution.blocked) {
      return {
        ...base,
        approach: "Tried an action outside the sandbox safety policy",
        category: "UNSAFE_APPROACH",
        conceptUnderstanding: "partial",
        skillDemonstrated: false,
        coaching: line(
          language,
          "Let's stay inside the training lab — that one is off limits here. Same goal, safer route.",
          "Yeh command sandbox ke bahar hai, isliye block ho gayi. Wahi kaam safe tarike se kar lete hain.",
        ),
      };
    }

    if (verification.status === "COMPLETE") {
      const independent = hintsUsed === 0;
      const alternative = !contract.allowedApproaches.some((a) => raw.trim().startsWith(a.split(" ")[0] ?? ""));
      return {
        ...base,
        approach: raw.trim(),
        category: independent ? "INDEPENDENT_SOLUTION" : alternative ? "VALID_ALTERNATIVE" : "INDEPENDENT_SOLUTION",
        conceptUnderstanding: "solid",
        skillDemonstrated: true,
        coaching: line(
          language,
          independent
            ? "Clean work — you reasoned that out yourself and the end state proves it."
            : "That works, and it counts: the skill showed up in what you actually did.",
          independent
            ? "Solid! Bilkul khud se nikala, aur result bhi verify ho gaya."
            : "Ho gaya — tareeqa valid hai, skill dikh gayi.",
        ),
      };
    }

    if (verification.status === "RESULT_CORRECT_SKILL_NOT_DEMONSTRATED") {
      return {
        ...base,
        approach: `${history.length} separate commands, no loop construct`,
        category: "SKILL_BYPASS",
        conceptUnderstanding: "partial",
        skillDemonstrated: false,
        coaching: line(
          language,
          "The files are all there — but this mission is about making the shell repeat for you. Try expressing it once, as a loop.",
          "Files sab ban gaye, par mission ka point loop hai. Ek hi baar likho aur shell ko repeat karne do.",
        ),
      };
    }

    if (verification.status === "RESULT_INCORRECT_SKILL_DEMONSTRATED") {
      return {
        ...base,
        approach: raw.trim(),
        category: /log|error/i.test(raw) ? "WRONG_PATH" : "WRONG_ARGUMENT",
        conceptUnderstanding: "partial",
        skillDemonstrated: true,
        coaching: line(
          language,
          "Technique is right, target is off. Re-read the exact path or filename in the brief and point the same command at it.",
          "Technique sahi hai, target galat. Brief me diya exact path/filename dekho aur wahi command wahan chala do.",
        ),
      };
    }

    if (errored) {
      const typoOf = nearestKnown(first);
      if (typoOf) {
        return {
          ...base,
          approach: `Typed ${first}`,
          category: "TYPO",
          conceptUnderstanding: "partial",
          skillDemonstrated: false,
          coaching: line(
            language,
            `Small slip — that looks like ${typoOf} with a letter out of place. Your thinking was fine.`,
            `Chhoti si typo hai — lagta hai ${typoOf} likhna tha. Soch bilkul sahi thi.`,
          ),
        };
      }
      if (!KNOWN.includes(first)) {
        return {
          ...base,
          approach: `Used ${first}`,
          category: "WRONG_COMMAND",
          conceptUnderstanding: "unclear",
          skillDemonstrated: false,
          coaching: line(
            language,
            "That is not the tool for this job. Think about what you want to change, then which command owns that job.",
            "Yeh command is kaam ke liye nahi hai. Socho kya change karna hai, phir uska command dhoondo.",
          ),
        };
      }
      const missingPath = execution.lines.some((l) => /No such file|cannot access|Not a directory/.test(l.text));
      return {
        ...base,
        approach: raw.trim(),
        category: missingPath ? "WRONG_PATH" : "WRONG_ARGUMENT",
        conceptUnderstanding: "partial",
        skillDemonstrated: false,
        coaching: line(
          language,
          missingPath
            ? "Right command, but the path it was pointed at does not exist yet. pwd and ls will tell you where you actually are."
            : "Right command, the arguments need a look. Check the order and spelling of what you passed it.",
          missingPath
            ? "Command sahi, par path exist nahi karta. pwd aur ls se check karo kahan ho."
            : "Command sahi hai, arguments check karo — order aur spelling.",
        ),
      };
    }

    const repeated = history.length >= 4 && new Set(history.slice(-4)).size <= 2;
    if (repeated) {
      return {
        ...base,
        approach: "Repeating similar commands without changing the outcome",
        category: "RANDOM_TRIAL_AND_ERROR",
        conceptUnderstanding: "unclear",
        skillDemonstrated: false,
        coaching: line(
          language,
          "Pause the typing for a second. Say out loud what end state you need, then pick one command that changes it.",
          "Ek second ruk jao. Pehle bolo final state kya chahiye, phir ek hi command chuno jo wo change kare.",
        ),
      };
    }

    const partial = verification.objectives.some((o) => o.met);
    return {
      ...base,
      approach: raw.trim(),
      category: partial ? "PARTIAL_UNDERSTANDING" : "CONCEPT_CONFUSION",
      conceptUnderstanding: partial ? "partial" : "unclear",
      skillDemonstrated: false,
      coaching: line(
        language,
        partial
          ? "Part of it is done. Compare the objective list against what the lab actually shows and close the gap."
          : "Let's rebuild the idea first, then the command. Ask me for a nudge and we will do it step by step.",
        partial
          ? "Aadha ho gaya. Objective list aur lab ki current state compare karo, gap band karo."
          : "Pehle concept clear karein, phir command. Nudge maango, step by step karte hain.",
      ),
    };
  },
};
