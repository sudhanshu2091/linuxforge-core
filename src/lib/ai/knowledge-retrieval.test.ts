import { describe, expect, it } from "vitest";
import { retrieveKnowledgeChunks } from "./knowledge-retrieval";

describe("V30 knowledge retrieval", () => {
  it("prioritizes mistake-specific diagnostic knowledge", () => {
    const result = retrieveKnowledgeChunks({
      query: "chmod permissions",
      skills: ["permissions"],
      mistake: "WRONG_ARGUMENT",
      difficulty: 2,
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.skills).toContain("permissions");
    expect(result.some((item) => item.mistakeTypes.includes("WRONG_ARGUMENT"))).toBe(true);
  });

  it("prioritizes safety grounding for unsafe approaches", () => {
    const result = retrieveKnowledgeChunks({
      query: "security lab",
      skills: ["networking"],
      mistake: "UNSAFE_APPROACH",
    });
    expect(result[0]?.kind).toBe("safety");
  });
});
