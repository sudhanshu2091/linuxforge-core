import { describe, expect, it } from "vitest";
import { buildIndexFromDocuments, searchIndex } from "./knowledge-index";

describe("V31 knowledge index", () => {
  it("indexes ingested material for deterministic lookup", () => {
    const index = buildIndexFromDocuments([
      {
        id: "linux-doc",
        name: "Linux guide",
        url: "https://example.com/linux",
        version: "1",
        trust: "official",
        content: "# Paths\nUse pwd to identify the current working directory.",
        defaultSkills: ["filesystem"],
      },
    ]);
    expect(index.version).toBe("v31");
    expect(searchIndex(index, "pwd current working directory")[0]?.title).toBe("Paths");
  });
});
