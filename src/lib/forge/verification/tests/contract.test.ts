import { describe, expect, it } from "vitest";
import { assertExerciseContract } from "../contract";

describe("M5 exercise contracts", () => {
  it("rejects duplicate requirement ids", () => {
    expect(() =>
      assertExerciseContract({
        exerciseId: "x",
        version: 1,
        objective: "x",
        concepts: ["filesystem"],
        requirements: [
          { id: "same", kind: "filesystem", path: "/tmp/a", exists: true },
          { id: "same", kind: "filesystem", path: "/tmp/b", exists: true },
        ],
      }),
    ).toThrow(/unique/i);
  });
  it("rejects malformed permissions", () => {
    expect(() =>
      assertExerciseContract({
        exerciseId: "x",
        version: 1,
        objective: "x",
        concepts: ["permissions"],
        requirements: [{ id: "p", kind: "permissions", path: "/tmp/a", permissions: "999" }],
      }),
    ).toThrow(/permissions/i);
  });
});
