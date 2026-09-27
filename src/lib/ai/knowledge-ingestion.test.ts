import { describe, expect, it } from "vitest";
import { ingestKnowledgeDocuments } from "./knowledge-ingestion";

const source = {
  id: "demo-source",
  name: "Demo source",
  url: "https://example.com/docs",
  version: "2026.09",
  trust: "primary" as const,
  defaultSkills: ["filesystem" as const],
  content: `# Paths\nAbsolute paths begin at /. Relative paths begin at the current working directory.\n\n## Diagnose errors\nInspect pwd and ls before changing the command.`,
};

describe("V31 knowledge ingestion", () => {
  it("normalizes sections with stable provenance and metadata", () => {
    const first = ingestKnowledgeDocuments([source]);
    const second = ingestKnowledgeDocuments([source]);
    expect(first.map((x) => x.id)).toEqual(second.map((x) => x.id));
    expect(first).toHaveLength(2);
    expect(first[0]?.sourceVersion).toBe("2026.09");
    expect(first[0]?.sourceTrust).toBe("primary");
    expect(first[0]?.skills).toContain("filesystem");
  });

  it("deduplicates identical source sections", () => {
    const result = ingestKnowledgeDocuments([source, source]);
    expect(result).toHaveLength(2);
  });
});
