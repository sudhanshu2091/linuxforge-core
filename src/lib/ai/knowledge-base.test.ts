import { describe, expect, it } from "vitest";
import { retrieveKnowledge } from "./knowledge-base";

describe("V29 knowledge retrieval", () => {
  it("retrieves path knowledge from objective and mistake evidence", () => {
    const results = retrieveKnowledge({
      query: "create a file inside the child directory relative path",
      skills: ["filesystem"],
      mistake: "WRONG_PATH",
    });
    expect(results[0]?.id).toBe("fs-paths");
    expect(results[0]?.sourceRefs.length).toBeGreaterThan(0);
  });

  it("prioritizes safe methodology after an unsafe approach", () => {
    const results = retrieveKnowledge({
      query: "authorized security lab enumeration",
      skills: ["hardening"],
      mistake: "UNSAFE_APPROACH",
    });
    expect(results[0]?.id).toBe("security-method");
  });
});
