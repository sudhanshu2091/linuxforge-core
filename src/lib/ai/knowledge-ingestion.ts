import type { ObservationCategory, SkillId } from "@/lib/forge/types";
import type { KnowledgeChunk } from "./knowledge-corpus";

export type KnowledgeSourceDocument = {
  id: string;
  name: string;
  url: string;
  version: string;
  trust: "official" | "primary" | "curated" | "community";
  content: string;
  defaultSkills?: readonly SkillId[];
  defaultMistakes?: readonly ObservationCategory[];
};

export type IngestedKnowledgeChunk = KnowledgeChunk & {
  sourceVersion: string;
  sourceTrust: KnowledgeSourceDocument["trust"];
  chunkIndex: number;
};

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

/**
 * Build-time ingestion for curated source material. The learner-facing app
 * receives only normalized chunks; source URL/version/provenance stay attached
 * so retrieval can explain where grounding came from.
 */
export function ingestKnowledgeDocuments(
  documents: readonly KnowledgeSourceDocument[],
): IngestedKnowledgeChunk[] {
  const output: IngestedKnowledgeChunk[] = [];
  const seen = new Set<string>();

  for (const document of documents) {
    const sections = splitSections(document.content);
    sections.forEach((section, index) => {
      const text = section.text.trim();
      if (!text) return;
      const fingerprint = `${document.id}:${document.version}:${slug(section.title)}:${text}`;
      if (seen.has(fingerprint)) return;
      seen.add(fingerprint);
      const id = `${document.id}-${slug(section.title) || `chunk-${index + 1}`}`;
      output.push({
        id,
        documentId: document.id,
        title: section.title || document.name,
        kind: inferKind(section.title, text),
        text,
        concepts: conceptsFrom(section.title, text),
        skills: [...(document.defaultSkills ?? [])],
        difficulty: inferDifficulty(text),
        mistakeTypes: [...(document.defaultMistakes ?? [])],
        prerequisites: [],
        sourceIds: [document.id],
        sourceVersion: document.version,
        sourceTrust: document.trust,
        chunkIndex: index,
      });
    });
  }
  return output;
}

function splitSections(content: string): { title: string; text: string }[] {
  const lines = content.replace(/\r/g, "").split("\n");
  const sections: { title: string; text: string }[] = [];
  let title = "";
  let body: string[] = [];
  const flush = () => {
    if (body.join(" ").trim())
      sections.push({ title, text: body.join(" ").replace(/\s+/g, " ").trim() });
    body = [];
  };
  for (const line of lines) {
    const heading = /^(?:#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      flush();
      title = heading[1] ?? "";
    } else if (!/^```/.test(line.trim())) {
      body.push(line.trim());
    }
  }
  flush();
  return sections.length ? sections : [{ title: "Source material", text: content.trim() }];
}

function inferKind(title: string, text: string): KnowledgeChunk["kind"] {
  const value = `${title} ${text}`.toLowerCase();
  if (/safe|authori[sz]|scope|least privilege|boundary/.test(value)) return "safety";
  if (/diagnos|troubleshoot|error|debug|inspect|verify/.test(value)) return "diagnostic";
  if (/step|workflow|procedure|method|process|use /.test(value)) return "procedure";
  return "concept";
}

function inferDifficulty(text: string): number {
  const value = text.toLowerCase();
  if (/advanced|privilege escalation|active directory|exploit|forensic|cryptograph/.test(value))
    return 4;
  if (/network|http|security|process|permission|shell/.test(value)) return 2;
  return 1;
}

function conceptsFrom(title: string, text: string): string[] {
  const terms = `${title} ${text}`.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) ?? [];
  return [...new Set(terms)].slice(0, 16);
}
