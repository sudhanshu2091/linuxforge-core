import type { ObservationCategory, SkillId } from "@/lib/forge/types";
import { QUESTION_SOURCES } from "./question-bank";
import { KNOWLEDGE_CORPUS, type KnowledgeChunk } from "./knowledge-corpus";
import { buildKnowledgeIndex, searchIndex, type IndexedKnowledgeChunk } from "./knowledge-index";

export type RetrievalQuery = {
  query: string;
  skills?: readonly SkillId[];
  mistake?: ObservationCategory | null;
  difficulty?: number;
  prerequisites?: readonly string[];
  limit?: number;
};

export type RetrievedChunk = KnowledgeChunk & {
  score: number;
  matchedTerms: string[];
  sourceRefs: { id: string; name: string; url: string }[];
};

export const KNOWLEDGE_INDEX = buildKnowledgeIndex(KNOWLEDGE_CORPUS, "v31-corpus-1");

const tokenize = (text: string) => [
  ...new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, " ")
      .split(/\s+/)
      .filter((x) => x.length > 1),
  ),
];
const aliases: Record<string, string[]> = {
  dir: ["directory"],
  folder: ["directory"],
  location: ["path"],
  pwd: ["cwd", "path"],
  chmod: ["permissions"],
  perm: ["permissions"],
  unsafe: ["authorized", "scope", "safety"],
  security: ["authorized", "scope", "safety"],
};

export function retrieveKnowledgeChunks(input: RetrievalQuery): RetrievedChunk[] {
  const rawTerms = tokenize(input.query);
  const queryTerms = [...new Set(rawTerms.flatMap((term) => [term, ...(aliases[term] ?? [])]))];
  const skills = new Set(input.skills ?? []);
  const prerequisites = new Set(input.prerequisites ?? []);
  const candidates = searchIndex(
    KNOWLEDGE_INDEX,
    queryTerms.join(" "),
    Math.max(input.limit ?? 5, 12),
  );

  const scored = (candidates.length ? candidates : KNOWLEDGE_INDEX.chunks).map((item) => {
    const matchedTerms = queryTerms.filter((term) => item.tokens.includes(term));
    let score = matchedTerms.length * 3;
    score += item.skills.reduce((sum, skill) => sum + (skills.has(skill) ? 8 : 0), 0);
    if (input.mistake && item.mistakeTypes.includes(input.mistake)) score += 25;
    if (input.difficulty != null)
      score += Math.max(0, 4 - Math.abs(item.difficulty - input.difficulty));
    if (item.prerequisites.some((p) => prerequisites.has(p))) score += 2;
    if (item.kind === "diagnostic" && input.mistake) score += 5;

    // Safety is a gating concern: when unsafe evidence exists, safety grounding
    // must outrank normal procedural advice.
    if (input.mistake === "UNSAFE_APPROACH") {
      if (item.kind === "safety") score += 60;
      if (item.kind === "procedure") score += 12;
    }
    if (input.mistake === "WRONG_PATH" && item.id === "fs-paths") score += 30;
    if (
      input.mistake === "WRONG_PATH" &&
      item.concepts.includes("relative") &&
      queryTerms.includes("relative")
    )
      score += 8;
    if (item.sourceTrust === "official" || item.sourceTrust === "primary") score += 2;

    const sourceRefs = item.sourceIds.flatMap((id) => {
      const source = QUESTION_SOURCES.find((s) => s.id === id);
      return source ? [{ id: source.id, name: source.name, url: source.url }] : [];
    });
    return { ...item, score, matchedTerms, sourceRefs };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, input.limit ?? 5)
    .map(({ tokens: _tokens, sourceTrust: _trust, sourceVersion: _version, ...item }) => item);
}
