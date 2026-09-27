import type { KnowledgeChunk } from "./knowledge-corpus";
import {
  ingestKnowledgeDocuments,
  type KnowledgeSourceDocument,
  type IngestedKnowledgeChunk,
} from "./knowledge-ingestion";

export type IndexedKnowledgeChunk = KnowledgeChunk & {
  tokens: readonly string[];
  sourceTrust: "official" | "primary" | "curated" | "community";
  sourceVersion: string;
};

export type KnowledgeIndex = {
  version: string;
  chunks: readonly IndexedKnowledgeChunk[];
  inverted: ReadonlyMap<string, readonly number[]>;
};

const tokenize = (text: string) => [
  ...new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, " ")
      .split(/\s+/)
      .filter((x) => x.length > 1),
  ),
];

export function buildKnowledgeIndex(
  chunks: readonly (KnowledgeChunk | IngestedKnowledgeChunk)[],
  version = "v31",
): KnowledgeIndex {
  const indexed = chunks.map((chunk) => ({
    ...chunk,
    tokens: tokenize(`${chunk.title} ${chunk.text} ${chunk.concepts.join(" ")}`),
    sourceTrust: "sourceTrust" in chunk ? chunk.sourceTrust : "curated",
    sourceVersion: "sourceVersion" in chunk ? chunk.sourceVersion : version,
  }));
  const inverted = new Map<string, number[]>();
  indexed.forEach((chunk, index) => {
    for (const token of chunk.tokens) {
      const bucket = inverted.get(token) ?? [];
      bucket.push(index);
      inverted.set(token, bucket);
    }
  });
  return { version, chunks: indexed, inverted };
}

export function buildIndexFromDocuments(
  documents: readonly KnowledgeSourceDocument[],
  version = "v31",
): KnowledgeIndex {
  return buildKnowledgeIndex(ingestKnowledgeDocuments(documents), version);
}

export function searchIndex(
  index: KnowledgeIndex,
  query: string,
  limit = 20,
): IndexedKnowledgeChunk[] {
  const candidates = new Set<number>();
  for (const token of tokenize(query)) {
    for (const position of index.inverted.get(token) ?? []) candidates.add(position);
  }
  return [...candidates]
    .map((position) => index.chunks[position])
    .filter((x): x is IndexedKnowledgeChunk => Boolean(x))
    .slice(0, limit);
}
