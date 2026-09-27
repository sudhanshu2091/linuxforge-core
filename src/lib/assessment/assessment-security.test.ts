import { describe, expect, it } from "vitest";
import { authorizeAssessmentAction } from "./assessment.functions";
import { assertLabBinding } from "./assessment-lab-binding";
import { assertAssessmentOwner, assertRuntimeAllowed } from "./assessment-authorization.server";
import { inspectAssessmentAction } from "./assessment-integrity";
import type { AssessmentBlueprint } from "./professional-assessment";
const b: AssessmentBlueprint = {
  assessmentId: "a",
  version: 1,
  title: "A",
  description: "",
  assessmentType: "SCENARIO",
  difficulty: "ADVANCED",
  durationSeconds: 60,
  skills: [],
  prerequisites: [],
  objectives: [
    {
      objectiveId: "o",
      title: "O",
      description: "",
      required: true,
      evidenceRequirements: [],
      skillIds: [],
    },
  ],
  environment: {
    scenarioId: "s",
    labId: "l",
    runtimeIds: ["r"],
    learnerId: "u",
    bindingGeneration: 2,
  },
  scope: {
    allowedTargets: ["t"],
    allowedNetworks: [],
    allowedPorts: [],
    allowedTechniques: [],
    prohibitedTechniques: ["x"],
    allowedTools: [],
    prohibitedTools: ["y"],
    dataHandlingRules: [],
  },
  evidenceRequirements: [],
  scoringDimensions: ["Technical"],
  passRequirements: { minimumObjectiveRate: 1, minimumOverallScore: 50 },
  assistancePolicy: "NONE",
};
describe("V47 security boundaries", () => {
  it("rejects cross-learner and cross-runtime access", () => {
    expect(() =>
      assertAssessmentOwner({ authenticatedLearnerId: "x", assessmentLearnerId: "u" }),
    ).toThrow();
    expect(() =>
      assertRuntimeAllowed({ assessmentRuntimeIds: ["r"], requestedRuntimeId: "other" }),
    ).toThrow();
  });
  it("rejects cross-generation lab binding", () => {
    expect(() =>
      assertLabBinding({
        expected: { ...b.environment, assessmentId: "a" },
        actual: { ...b.environment, assessmentId: "a", bindingGeneration: 3 },
      }),
    ).toThrow();
  });
  it("detects prohibited technique and tool", () => {
    expect(inspectAssessmentAction({ scope: b.scope, technique: "x" }).status).toBe(
      "POLICY_VIOLATION",
    );
    expect(inspectAssessmentAction({ scope: b.scope, tool: "y" }).status).toBe("POLICY_VIOLATION");
  });
  it("authorizes matching assessment context", () => {
    expect(() =>
      authorizeAssessmentAction({
        authenticatedLearnerId: "u",
        assessmentLearnerId: "u",
        blueprint: b,
        requestedRuntimeId: "r",
      }),
    ).not.toThrow();
  });
});
