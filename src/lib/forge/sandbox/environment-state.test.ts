import { describe, expect, it } from "vitest";
import {
  assertEnvironmentCanStart,
  assertPersistenceTransition,
  canTransitionPersistence,
  nextArtifactVersion,
  nextEnvironmentGeneration,
} from "./environment-state";

describe("M4 persistent environment state", () => {
  it("keeps stopped environments restartable", () => {
    expect(canTransitionPersistence("STOPPED", "ACTIVE")).toBe(true);
    expect(() => assertEnvironmentCanStart("STOPPED")).not.toThrow();
  });
  it("does not allow destroyed environments to resurrect", () => {
    expect(() => assertEnvironmentCanStart("DESTROYED")).toThrow(/destroyed/i);
    expect(canTransitionPersistence("DESTROYED", "ACTIVE")).toBe(false);
  });
  it("quarantines instead of silently activating failed persistence", () => {
    expect(canTransitionPersistence("ACTIVE", "QUARANTINED")).toBe(true);
    expect(canTransitionPersistence("QUARANTINED", "ACTIVE")).toBe(false);
  });
  it("increments durable generations monotonically", () => {
    expect(nextEnvironmentGeneration(1)).toBe(2);
    expect(nextEnvironmentGeneration(9)).toBe(10);
    expect(nextArtifactVersion(0)).toBe(1);
    expect(nextArtifactVersion(4)).toBe(5);
  });
  it("rejects impossible lifecycle jumps", () => {
    expect(() => assertPersistenceTransition("PROVISIONING", "DESTROYED")).toThrow();
    expect(() => assertPersistenceTransition("ACTIVE", "DESTROYED")).toThrow();
  });
});
