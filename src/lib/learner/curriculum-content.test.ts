import { describe, expect, it } from "vitest";
import { buildCurriculumContent, validateCurriculumContent } from "./curriculum-content";

describe("V39 curriculum content engine", () => {
  it("maps content to the V38 curriculum graph and includes prerequisite context", () => {
    const bundle = buildCurriculumContent({ skillId: "permissions", difficulty: 2 });
    expect(bundle.version).toBe("v39");
    expect(bundle.conceptIds).toEqual(expect.arrayContaining(["concept:ownership", "concept:rwx"]));
    expect(bundle.prerequisiteSkills).toEqual(["filesystem"]);
    expect(bundle.items.some((item) => item.kind === "PREREQUISITE")).toBe(true);
  });

  it("produces multiple teaching representations instead of one static question", () => {
    const bundle = buildCurriculumContent({
      skillId: "filesystem",
      kinds: ["EXPLANATION", "EXAMPLE", "DEMONSTRATION", "EXERCISE", "REVIEW"],
    });
    expect(bundle.items.map((item) => item.kind)).toEqual([
      "EXPLANATION",
      "EXAMPLE",
      "DEMONSTRATION",
      "EXERCISE",
      "REVIEW",
    ]);
    expect(new Set(bundle.items.map((item) => item.body)).size).toBe(5);
  });

  it("targets observed mistakes without changing verifier authority", () => {
    const bundle = buildCurriculumContent({
      skillId: "permissions",
      mistake: "WRONG_ARGUMENT",
      kinds: ["HINT", "REMEDIATION"],
    });
    expect(bundle.items.every((item) => item.mistakeTargets.length > 0)).toBe(true);
    expect(bundle.items.every((item) => item.mistakeTargets.includes("WRONG_ARGUMENT"))).toBe(true);
  });

  it("records provenance when content is grounded in the existing corpus", () => {
    const bundle = buildCurriculumContent({ skillId: "filesystem" });
    expect(bundle.groundingChunkIds.length).toBeGreaterThan(0);
    expect(bundle.items.every((item) => item.provenance.origin === "source_grounded")).toBe(true);
    expect(bundle.items.every((item) => item.provenance.sourceIds.length > 0)).toBe(true);
  });

  it("can incorporate V34 question patterns as research provenance", () => {
    const bundle = buildCurriculumContent({
      skillId: "networking",
      questionPatterns: [
        {
          id: "pattern:test-network",
          sourceId: "nmap-book",
          sourceQuestionId: "nmap-book:1",
          concept: "Network discovery",
          skills: ["networking"],
          prerequisites: ["filesystem"],
          difficulty: 2,
          pattern: "Observe a bounded network and verify evidence.",
          evidenceSignals: ["observation", "verification"],
          commonMistakes: ["CONCEPT_CONFUSION"],
          provenance: {
            sourceId: "nmap-book",
            url: "https://nmap.org/book/",
            title: "Network discovery",
          },
        },
      ],
    });
    expect(bundle.items[0]?.provenance.patternRefs).toContain("pattern:test-network");
    expect(bundle.items[0]?.provenance.sourceIds).toContain("nmap-book");
  });

  it("validates content deterministically", () => {
    const bundle = buildCurriculumContent({ skillId: "hardening", difficulty: 3, limit: 8 });
    expect(validateCurriculumContent(bundle)).toEqual([]);
  });
});
