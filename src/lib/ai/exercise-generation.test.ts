import { describe, expect, it } from "vitest";
import type { AdaptiveExercise } from "@/lib/forge/types";
import { validateGeneratedExercise, isMeaningfullyDifferent } from "./exercise-generation.server";

type ExerciseOverrides = Omit<Partial<AdaptiveExercise>, "evaluationPlan"> & {
  evaluationPlan?: AdaptiveExercise["evaluationPlan"] | undefined;
};

const base = (overrides: ExerciseOverrides = {}): AdaptiveExercise => {
  const exercise = {
    id: "GEN-1",
    kind: "task",
    title: "Path practice drill",
    scenario: "A lab technician needs to organize a small workspace before an audit.",
    objective:
      "Create the requested practice directory and demonstrate filesystem navigation in the isolated lab.",
    skills: ["filesystem"],
    difficulty: 2,
    estimatedMinutes: 10,
    sourceRefs: [{ id: "linuxjourney", name: "Linux Journey", url: "https://linuxjourney.com/" }],
    evaluationFocus: ["objective", "method"],
    learnerReason: "Your verified evidence calls for more filesystem practice.",
    allowedApproaches: ["Use valid Linux commands in the lab."],
    bannedShortcuts: ["Do not access the host."],
    hints: ["Inspect the current directory before changing it."],
    successStory: "The workspace is ready.",
    failureStory: "The workspace still needs work.",
    remediation: ["Inspect the current state and retry one requirement at a time."],
    evaluationPlan: {
      objectives: [
        { label: "practice directory exists", path: "practice", objectType: "directory" },
      ],
      requiredCommandKinds: ["mkdir"],
      minimumMutations: 1,
    },
    ...overrides,
  } as AdaptiveExercise;

  if (
    Object.prototype.hasOwnProperty.call(overrides, "evaluationPlan") &&
    overrides.evaluationPlan === undefined
  ) {
    delete (exercise as { evaluationPlan?: AdaptiveExercise["evaluationPlan"] }).evaluationPlan;
  }

  return exercise;
};

describe("V33 generated exercise quality gate", () => {
  it("accepts a safe machine-verifiable task", () => {
    expect(validateGeneratedExercise(base()).valid).toBe(true);
  });
  it("rejects unsafe paths and unsupported commands", () => {
    const result = validateGeneratedExercise(
      base({
        evaluationPlan: {
          objectives: [{ label: "bad", path: "../host", objectType: "directory" }],
          requiredCommandKinds: ["nmap"],
        },
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/Unsafe objective path|Unsupported generated command/);
  });
  it("requires conceptual questions to stay non-executable", () => {
    const result = validateGeneratedExercise(base({ kind: "question", evaluationPlan: undefined }));
    expect(result.valid).toBe(true);
  });
  it("rejects executable exercises without an evaluation plan", () => {
    expect(validateGeneratedExercise(base({ evaluationPlan: undefined })).valid).toBe(false);
  });
  it("detects direct repetition of recent topics", () => {
    expect(
      isMeaningfullyDifferent(base({ title: "Filesystem navigation drill" }), [
        "filesystem navigation",
      ]),
    ).toBe(false);
    expect(
      isMeaningfullyDifferent(base({ title: "Permission audit drill" }), ["filesystem navigation"]),
    ).toBe(true);
  });
});
