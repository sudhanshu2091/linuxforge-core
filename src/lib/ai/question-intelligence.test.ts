import { describe, expect, it } from "vitest";
import {
  TRUSTED_QUESTION_SOURCES,
  analyzeExternalQuestion,
  buildResearchContext,
  deduplicateQuestionPatterns,
  extractExternalQuestions,
} from "./question-intelligence";

describe("V34 question intelligence", () => {
  it("ships a curated trusted source registry with provenance rules", () => {
    expect(TRUSTED_QUESTION_SOURCES.map((s) => s.id)).toEqual([
      "kali-training",
      "overthewire",
      "linuxjourney",
      "picoctf",
      "portswigger",
      "mitre-attack",
      "nmap-book",
    ]);
    expect(
      TRUSTED_QUESTION_SOURCES.every(
        (s) => s.directQuestionReuse === false && s.provenanceRequired,
      ),
    ).toBe(true);
  });

  it("extracts challenge-like source material without preserving a source question as LinuxForge content", () => {
    const source = TRUSTED_QUESTION_SOURCES.find((s) => s.id === "overthewire")!;
    const fetched = {
      sourceId: source.id,
      url: source.seedUrls[0]!,
      status: 200,
      contentType: "text/html",
      fetchedAt: "2026-09-17T00:00:00Z",
      content:
        "<h1>Bandit</h1><p>Level 0</p><p>Use the terminal to learn basic Unix commands and inspect the supplied file.</p><p>Level 1</p><p>Find the next credential using filesystem tools.</p>",
    };
    const questions = extractExternalQuestions(source, fetched);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0]?.sourceId).toBe("overthewire");
    expect(questions[0]?.url).toBe(source.seedUrls[0]);
  });

  it("maps external material into reusable skill patterns", () => {
    const pattern = analyzeExternalQuestion({
      id: "x",
      sourceId: "overthewire",
      title: "Permission challenge",
      prompt:
        "Inspect a directory, understand file permissions, and use chmod to correct the mode.",
      url: "https://overthewire.org/wargames/bandit/",
      kind: "challenge",
      sourceVersion: "2026-09-17",
    });
    expect(pattern.skills).toContain("filesystem");
    expect(pattern.skills).toContain("permissions");
    expect(pattern.prerequisites).toContain("filesystem");
    expect(pattern.provenance.sourceId).toBe("overthewire");
  });

  it("deduplicates equivalent patterns and keeps provenance", () => {
    const pattern = analyzeExternalQuestion({
      id: "x",
      sourceId: "overthewire",
      title: "Filesystem task",
      prompt: "Find a file using filesystem tools.",
      url: "https://overthewire.org/wargames/bandit/",
      kind: "challenge",
      sourceVersion: "v1",
    });
    expect(deduplicateQuestionPatterns([pattern, { ...pattern, id: "other" }])).toHaveLength(1);
    expect(buildResearchContext([pattern])).toContain("overthewire");
  });
});
