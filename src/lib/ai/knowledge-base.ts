import type { ObservationCategory, SkillId } from "@/lib/forge/types";
import { retrieveKnowledgeChunks, type RetrievedChunk } from "./knowledge-retrieval";
import { KNOWLEDGE_CORPUS, type KnowledgeChunk } from "./knowledge-corpus";

export type KnowledgeCard = {
  id: string;
  title: string;
  concepts: string[];
  skills: SkillId[];
  summary: string;
  diagnostic: string;
  practicePrompt: string;
  sourceIds: string[];
};

export type RetrievedKnowledge = KnowledgeCard & {
  score: number;
  sourceRefs: { id: string; name: string; url: string }[];
  matchedTerms?: string[];
};

const toCard = (item: RetrievedChunk): RetrievedKnowledge => ({
  id: item.id,
  title: item.title,
  concepts: item.concepts,
  skills: item.skills,
  summary: item.text,
  diagnostic:
    item.kind === "diagnostic" || item.kind === "safety"
      ? item.text
      : `Use this concept to reason about ${item.title.toLowerCase()} before acting.`,
  practicePrompt:
    item.kind === "procedure"
      ? item.text
      : `Explain ${item.title.toLowerCase()} in your own words, then apply it to the current objective.`,
  sourceIds: item.sourceIds,
  score: item.score,
  sourceRefs: item.sourceRefs,
  matchedTerms: item.matchedTerms,
});

export function retrieveKnowledge(input: {
  query: string;
  skills?: readonly SkillId[];
  mistake?: ObservationCategory | null;
  difficulty?: number;
  prerequisites?: readonly string[];
  limit?: number;
}): RetrievedKnowledge[] {
  return retrieveKnowledgeChunks(input).map(toCard);
}

export function knowledgeCards(): readonly KnowledgeCard[] {
  return KNOWLEDGE_CORPUS.map((item: KnowledgeChunk) => ({
    id: item.id,
    title: item.title,
    concepts: item.concepts,
    skills: item.skills,
    summary: item.text,
    diagnostic: item.text,
    practicePrompt: `Apply ${item.title.toLowerCase()} to a new example.`,
    sourceIds: item.sourceIds,
  }));
}
