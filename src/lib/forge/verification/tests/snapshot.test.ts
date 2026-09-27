import { describe, expect, it } from "vitest";
import { assertEvidenceCurrent } from "../snapshot";

describe("M5 evidence snapshots", () => {
  it("rejects evidence from an older environment generation", () => {
    expect(() =>
      assertEvidenceCurrent({
        environmentGeneration: 2,
        evidence: {
          filesystem: [],
          processes: [],
          services: [],
          network: [],
          capturedAt: new Date().toISOString(),
          environmentId: "env",
          environmentGeneration: 1,
          runtimeId: null,
          runtimeLifecycleGeneration: 2,
        },
      }),
    ).toThrow(/stale/i);
  });
});
