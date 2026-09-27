import { describe, it, expect } from "vitest";
import { assertScenarioAuthorization } from "./scenario-authorization.server";
import { assertScenarioEvidenceBinding } from "./scenario-evidence";
describe("V48 security", () => {
  it("accepts matching binding", () =>
    expect(() =>
      assertScenarioAuthorization({
        authorizedLearnerId: "u",
        requestedLearnerId: "u",
        authorizedScenarioId: "s",
        requestedScenarioId: "s",
        authorizedLabId: "l",
        requestedLabId: "l",
        authorizedRuntimeId: "r",
        requestedRuntimeId: "r",
      }),
    ).not.toThrow());
  it("denies cross learner", () =>
    expect(() =>
      assertScenarioAuthorization({
        authorizedLearnerId: "u",
        requestedLearnerId: "x",
        authorizedScenarioId: "s",
        requestedScenarioId: "s",
        authorizedLabId: "l",
        requestedLabId: "l",
        authorizedRuntimeId: "r",
        requestedRuntimeId: "r",
      }),
    ).toThrow());
  it("denies cross runtime evidence", () =>
    expect(() =>
      assertScenarioEvidenceBinding({
        authorizedLearnerId: "u",
        authorizedScenarioId: "s",
        authorizedRuntimeId: "r",
        event: {
          eventId: "e",
          scenarioId: "s",
          sessionId: "x",
          learnerId: "u",
          runtimeId: "other",
          type: "SCENARIO_EVENT",
          timestamp: "now",
          data: {},
        },
      }),
    ).toThrow());
});
