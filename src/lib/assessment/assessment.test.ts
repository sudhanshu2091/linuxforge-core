import { describe, expect, it } from "vitest";
import {
  validateBlueprint,
  transitionAssessment,
  type AssessmentBlueprint,
} from "./professional-assessment";
import {
  startAssessmentSession,
  activateSession,
  submitSession,
  expireIfDue,
} from "./assessment-session";
import { appendEvidence, countEvent } from "./assessment-evidence";
import { evaluateAssessment } from "./assessment-evaluator";
import { inspectAssessmentAction } from "./assessment-integrity";
import { buildAssessmentReport } from "./assessment-report";

const blueprint: AssessmentBlueprint = {
  assessmentId: "a1",
  version: 1,
  title: "Web Assessment",
  description: "",
  assessmentType: "PRACTICAL",
  difficulty: "PROFESSIONAL",
  durationSeconds: 600,
  skills: ["web-testing"],
  prerequisites: [],
  objectives: [
    {
      objectiveId: "o1",
      title: "Find issue",
      description: "",
      required: true,
      evidenceRequirements: ["proof"],
      skillIds: ["web-testing"],
    },
  ],
  environment: {
    scenarioId: "s1",
    labId: "l1",
    runtimeIds: ["r1"],
    learnerId: "u1",
    bindingGeneration: 1,
  },
  scope: {
    allowedTargets: ["target"],
    allowedNetworks: ["net"],
    allowedPorts: [80],
    allowedTechniques: ["enumeration"],
    prohibitedTechniques: ["out-of-scope"],
    allowedTools: ["curl"],
    prohibitedTools: ["danger-tool"],
    dataHandlingRules: ["training-only"],
  },
  evidenceRequirements: ["proof"],
  scoringDimensions: ["Technical correctness", "Evidence quality"],
  passRequirements: { minimumObjectiveRate: 1, minimumOverallScore: 80 },
  assistancePolicy: "NONE",
};
const event = {
  eventId: "e1",
  assessmentId: "a1",
  learnerId: "u1",
  timestamp: "2026-09-17T00:00:00.000Z",
  eventType: "OBJECTIVE_COMPLETED" as const,
  objectiveId: "o1",
  runtimeId: "r1",
  terminalSessionId: "t1",
  evidence: { result: true },
};

describe("V47 professional assessment", () => {
  it("validates blueprints and lifecycle", () => {
    validateBlueprint(blueprint);
    expect(transitionAssessment("READY", "PROVISIONING")).toBe("PROVISIONING");
    expect(() => transitionAssessment("DRAFT", "ACTIVE")).toThrow();
  });
  it("creates, activates and submits a timed session", () => {
    const s = activateSession(
      startAssessmentSession({
        sessionId: "x",
        learnerId: "u1",
        blueprint,
        now: new Date("2026-09-17T00:00:00Z"),
      }),
      new Date("2026-09-17T00:00:01Z"),
    );
    expect(s.state).toBe("ACTIVE");
    expect(submitSession(s, new Date("2026-09-17T00:01:00Z")).state).toBe("SUBMITTED");
  });
  it("expires active sessions at deadline", () => {
    const s = activateSession(
      startAssessmentSession({
        sessionId: "x",
        learnerId: "u1",
        blueprint,
        now: new Date("2026-09-17T00:00:00Z"),
      }),
      new Date("2026-09-17T00:00:01Z"),
    );
    expect(expireIfDue(s, new Date("2026-09-17T00:10:02Z")).state).toBe("EXPIRED");
  });
  it("keeps evidence append-only and rejects duplicates", () => {
    const ledger = appendEvidence([], event);
    expect(countEvent(ledger, "OBJECTIVE_COMPLETED")).toBe(1);
    expect(() => appendEvidence(ledger, event)).toThrow();
  });
  it("evaluates completed objective evidence deterministically", () => {
    const result = evaluateAssessment({
      blueprint,
      evidence: [event],
      dimensionScores: { "Technical correctness": 90, "Evidence quality": 90 },
    });
    expect(result.outcome).toBe("PASS");
    expect(result.overallScore).toBe(90);
    expect(result.objectiveRate).toBe(1);
  });
  it("returns incomplete without evidence", () => {
    expect(evaluateAssessment({ blueprint, evidence: [] }).outcome).toBe("INCOMPLETE");
  });
  it("flags out-of-scope actions", () => {
    expect(inspectAssessmentAction({ scope: blueprint.scope, target: "other" }).status).toBe(
      "POLICY_VIOLATION",
    );
    expect(
      inspectAssessmentAction({ scope: blueprint.scope, target: "target", port: 80, tool: "curl" })
        .status,
    ).toBe("CLEAN");
  });
  it("builds a report from the authoritative result", () => {
    const result = evaluateAssessment({
      blueprint,
      evidence: [event],
      dimensionScores: { "Technical correctness": 90, "Evidence quality": 90 },
    });
    const report = buildAssessmentReport(blueprint, result);
    expect(report.outcome).toBe("PASS");
    expect(report.assessmentId).toBe("a1");
  });
});
