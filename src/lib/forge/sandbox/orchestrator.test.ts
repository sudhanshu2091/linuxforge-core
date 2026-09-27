import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, isTerminalStatus } from "./orchestrator.server";

describe("lab control-plane lifecycle", () => {
  it("allows normal create/start/pause/resume flow", () => {
    expect(canTransition("CREATING", "READY")).toBe(true);
    expect(canTransition("READY", "RUNNING")).toBe(true);
    expect(canTransition("RUNNING", "PAUSED")).toBe(true);
    expect(canTransition("PAUSED", "RUNNING")).toBe(true);
  });

  it("rejects unsafe lifecycle jumps", () => {
    expect(canTransition("CREATING", "RUNNING")).toBe(false);
    expect(canTransition("PAUSED", "RESETTING")).toBe(false);
    expect(() => assertTransition("CREATING", "RUNNING")).toThrow(
      "Invalid lab lifecycle transition",
    );
  });

  it("treats stopped and expired environments as terminal", () => {
    expect(isTerminalStatus("STOPPED")).toBe(true);
    expect(isTerminalStatus("EXPIRED")).toBe(true);
    expect(isTerminalStatus("RUNNING")).toBe(false);
  });
});
