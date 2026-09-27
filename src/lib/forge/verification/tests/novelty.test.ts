import { describe, expect, it } from "vitest";
import { buildSemanticFingerprint } from "../verification.server";

describe("M5 semantic identity", () => {
  it("normalizes literal paths so renamed objects remain semantically comparable", () => {
    const a = buildSemanticFingerprint({
      exerciseId: "a",
      version: 1,
      objective: "x",
      concepts: ["permissions"],
      requirements: [{ id: "p", kind: "permissions", path: "/tmp/a", permissions: "640" }],
    });
    const b = buildSemanticFingerprint({
      exerciseId: "b",
      version: 1,
      objective: "y",
      concepts: ["permissions"],
      requirements: [{ id: "p", kind: "permissions", path: "/tmp/b", permissions: "640" }],
    });
    expect(a).toBe(b);
  });
});
