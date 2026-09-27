import { describe, it, expect } from "vitest";
import { canTransitionScenario, scenarioTerminal, transitionScenario } from "./scenario-session";
describe("V48 scenario session", () => {
  it("allows lifecycle transitions", () =>
    expect(transitionScenario("READY", "ACTIVE")).toBe("ACTIVE"));
  it("rejects invalid transitions", () =>
    expect(() => transitionScenario("DRAFT", "ACTIVE")).toThrow());
  it("identifies terminal states", () => {
    expect(scenarioTerminal("COMPLETED")).toBe(true);
    expect(scenarioTerminal("ACTIVE")).toBe(false);
    expect(canTransitionScenario("PAUSED", "RESETTING")).toBe(true);
  });
});
