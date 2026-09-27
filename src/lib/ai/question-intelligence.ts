import type { ObservationCategory, SkillId } from "@/lib/forge/types";

export type SourceCategory =
  "official_training" | "challenge_bank" | "learning_source" | "documentation";
export type SourceTrust = "official" | "primary" | "curated" | "community";
export type SourceUse = "research" | "pattern-analysis" | "skill-mapping" | "grounding";

export type TrustedQuestionSource = {
  id: string;
  name: string;
  url: string;
  category: SourceCategory;
  trustLevel: SourceTrust;
  topics: string[];
  allowedUses: SourceUse[];
  directQuestionReuse: false;
  provenanceRequired: true;
  seedUrls: string[];
  license?: string;
  attributionUrl?: string;
};

export type ExternalQuestion = {
  id: string;
  sourceId: string;
  title: string;
  prompt: string;
  url: string;
  kind: "question" | "challenge" | "exercise" | "lesson";
  sourceVersion: string;
};

export type QuestionPattern = {
  id: string;
  sourceId: string;
  sourceQuestionId: string;
  concept: string;
  skills: SkillId[];
  prerequisites: SkillId[];
  difficulty: number;
  pattern: string;
  evidenceSignals: string[];
  commonMistakes: ObservationCategory[];
  provenance: { sourceId: string; url: string; title: string };
};

export const TRUSTED_QUESTION_SOURCES: readonly TrustedQuestionSource[] = [
  {
    id: "kali-training",
    name: "Kali Training",
    url: "https://kali.training/",
    category: "official_training",
    trustLevel: "official",
    topics: ["kali", "linux", "security", "administration"],
    allowedUses: ["research", "pattern-analysis", "skill-mapping", "grounding"],
    directQuestionReuse: false,
    provenanceRequired: true,
    seedUrls: ["https://kali.training/"],
  },
  {
    id: "overthewire",
    name: "OverTheWire",
    url: "https://overthewire.org/wargames/bandit/",
    category: "challenge_bank",
    trustLevel: "primary",
    topics: ["linux", "unix", "security", "ctf", "command-line"],
    allowedUses: ["research", "pattern-analysis", "skill-mapping"],
    directQuestionReuse: false,
    provenanceRequired: true,
    seedUrls: ["https://overthewire.org/wargames/bandit/"],
  },
  {
    id: "linuxjourney",
    name: "Linux Journey",
    url: "https://labex.io/linuxjourney",
    category: "learning_source",
    trustLevel: "primary",
    topics: ["linux", "filesystem", "shell", "administration", "networking"],
    allowedUses: ["research", "pattern-analysis", "skill-mapping", "grounding"],
    directQuestionReuse: false,
    provenanceRequired: true,
    seedUrls: ["https://labex.io/linuxjourney"],
    license: "CC BY-SA 4.0",
    attributionUrl: "https://labex.io/linuxjourney",
  },
  {
    id: "picoctf",
    name: "picoCTF",
    url: "https://picoctf.org/",
    category: "challenge_bank",
    trustLevel: "curated",
    topics: ["security", "ctf", "web", "crypto", "forensics", "linux"],
    allowedUses: ["research", "pattern-analysis", "skill-mapping"],
    directQuestionReuse: false,
    provenanceRequired: true,
    seedUrls: ["https://picoctf.org/"],
  },
  {
    id: "portswigger",
    name: "PortSwigger Web Security Academy",
    url: "https://portswigger.net/web-security",
    category: "learning_source",
    trustLevel: "primary",
    topics: ["web", "http", "access-control", "injection", "sessions"],
    allowedUses: ["research", "pattern-analysis", "skill-mapping", "grounding"],
    directQuestionReuse: false,
    provenanceRequired: true,
    seedUrls: ["https://portswigger.net/web-security"],
  },
  {
    id: "mitre-attack",
    name: "MITRE ATT&CK",
    url: "https://attack.mitre.org/",
    category: "documentation",
    trustLevel: "primary",
    topics: ["security", "attack-techniques", "defense", "threat-modeling"],
    allowedUses: ["research", "skill-mapping", "grounding"],
    directQuestionReuse: false,
    provenanceRequired: true,
    seedUrls: ["https://attack.mitre.org/"],
  },
  {
    id: "nmap-book",
    name: "Nmap Reference Guide",
    url: "https://nmap.org/book/",
    category: "documentation",
    trustLevel: "primary",
    topics: ["networking", "nmap", "discovery", "security"],
    allowedUses: ["research", "skill-mapping", "grounding"],
    directQuestionReuse: false,
    provenanceRequired: true,
    seedUrls: ["https://nmap.org/book/"],
  },
] as const;

export function getTrustedQuestionSource(id: string): TrustedQuestionSource | undefined {
  return TRUSTED_QUESTION_SOURCES.find((source) => source.id === id);
}

export type FetchPolicy = {
  timeoutMs?: number;
  maxBytes?: number;
  userAgent?: string;
};

export type FetchedSource = {
  sourceId: string;
  url: string;
  status: number;
  contentType: string;
  content: string;
  fetchedAt: string;
};

const DEFAULT_POLICY: Required<FetchPolicy> = {
  timeoutMs: 8_000,
  maxBytes: 500_000,
  userAgent: "LinuxForge-QuestionResearch/34 (+trusted-source-analysis)",
};

function assertAllowedUrl(source: TrustedQuestionSource, url: string): void {
  const target = new URL(url);
  const root = new URL(source.url);
  if (target.protocol !== "https:")
    throw new Error("Question research only permits HTTPS sources.");
  if (target.hostname !== root.hostname && !target.hostname.endsWith(`.${root.hostname}`))
    throw new Error(`URL is outside the approved source host: ${target.hostname}`);
}

export async function fetchTrustedSource(
  sourceId: string,
  url: string,
  policy: FetchPolicy = {},
): Promise<FetchedSource> {
  const source = getTrustedQuestionSource(sourceId);
  if (!source) throw new Error(`Unknown trusted question source: ${sourceId}`);
  if (!source.allowedUses.includes("research"))
    throw new Error(`Source ${sourceId} is not approved for research.`);
  assertAllowedUrl(source, url);

  const config = { ...DEFAULT_POLICY, ...policy };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html, text/plain, application/xhtml+xml",
        "user-agent": config.userAgent,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Source ${sourceId} returned HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > config.maxBytes)
      throw new Error(`Source response exceeded ${config.maxBytes} bytes.`);
    const content = new TextDecoder().decode(buffer);
    return {
      sourceId,
      url,
      status: response.status,
      contentType,
      content,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromText(text: string): string {
  return text.split(/[.!?]/)[0]?.trim().slice(0, 160) || "External learning item";
}

export function extractExternalQuestions(
  source: TrustedQuestionSource,
  fetched: FetchedSource,
): ExternalQuestion[] {
  const text = fetched.contentType.includes("html")
    ? htmlToText(fetched.content)
    : fetched.content.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const chunks = text
    .split(/(?=(?:level|challenge|exercise|question|task|lesson|module)\s*\d+\b)/i)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 40);
  const candidates = (chunks.length ? chunks : [text]).slice(0, 24);
  return candidates.map((prompt, index) => ({
    id: `${source.id}:${index + 1}`,
    sourceId: source.id,
    title: titleFromText(prompt),
    prompt: prompt.slice(0, 1800),
    url: fetched.url,
    kind: /level|wargame|challenge/i.test(prompt)
      ? "challenge"
      : /exercise|task/i.test(prompt)
        ? "exercise"
        : "lesson",
    sourceVersion: fetched.fetchedAt.slice(0, 10),
  }));
}

const skillRules: Array<{ skill: SkillId; terms: RegExp }> = [
  { skill: "filesystem", terms: /file|directory|folder|path|find|ls|cat|cp|mv|archive/i },
  { skill: "permissions", terms: /permission|chmod|chown|owner|group|mode|acl/i },
  { skill: "iteration", terms: /loop|for each|repeat|iteration/i },
  { skill: "shell-scripting", terms: /bash|shell|script|variable|pipe|redirect|grep|awk|sed/i },
  { skill: "processes", terms: /process|signal|service|systemd|job|pid|daemon/i },
  { skill: "networking", terms: /network|port|socket|dns|http|tcp|udp|ssh|nmap/i },
  {
    skill: "hardening",
    terms: /security|hardening|least privilege|authentication|authorization|secure/i,
  },
];

function inferSkills(text: string): SkillId[] {
  return skillRules
    .filter((rule) => rule.terms.test(text))
    .map((rule) => rule.skill)
    .slice(0, 4);
}

function inferDifficulty(text: string): number {
  const value = text.toLowerCase();
  let score = 1;
  if (/multiple steps|combine|troubleshoot|analy[sz]e|enumerate/.test(value)) score += 1;
  if (/privilege escalation|active directory|exploit|forensic|advanced/.test(value)) score += 2;
  if (/multi-stage|chain|incident response|complex/.test(value)) score += 1;
  return Math.min(5, score);
}

function inferMistakes(text: string): ObservationCategory[] {
  const value = text.toLowerCase();
  const result: ObservationCategory[] = [];
  if (/wrong path|path|directory/.test(value)) result.push("WRONG_PATH");
  if (/permission|chmod|owner/.test(value)) result.push("CONCEPT_CONFUSION");
  if (/syntax|argument|option|flag/.test(value)) result.push("WRONG_ARGUMENT");
  if (/unsafe|security|authorized|scope/.test(value)) result.push("UNSAFE_APPROACH");
  return result.slice(0, 3);
}

export function analyzeExternalQuestion(question: ExternalQuestion): QuestionPattern {
  const text = `${question.title} ${question.prompt}`;
  const skills = inferSkills(text);
  const primary = skills[0] ?? "filesystem";
  const pattern = /level|challenge|exercise|task/i.test(text)
    ? "Solve a practical problem by selecting an appropriate command/tool, inspecting evidence, and verifying the resulting state."
    : "Understand a concept, connect it to a Linux/security skill, and explain or apply it in context.";
  const prerequisites: SkillId[] = [];
  if (skills.includes("permissions") && skills.includes("filesystem"))
    prerequisites.push("filesystem");

  return {
    id: `pattern:${question.id}`,
    sourceId: question.sourceId,
    sourceQuestionId: question.id,
    concept: question.title,
    skills,
    prerequisites,
    difficulty: inferDifficulty(text),
    pattern,
    evidenceSignals: ["task intent", "observed method", "result verification"],
    commonMistakes: inferMistakes(text),
    provenance: { sourceId: question.sourceId, url: question.url, title: question.title },
  };
}

export function deduplicateQuestionPatterns(
  patterns: readonly QuestionPattern[],
): QuestionPattern[] {
  const seen = new Set<string>();
  return patterns.filter((pattern) => {
    const key = `${pattern.skills.join(",")}|${pattern.difficulty}|${pattern.pattern.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function researchQuestionPatterns(input: {
  sourceIds: readonly string[];
  topic?: string;
  maxSources?: number;
  policy?: FetchPolicy;
}): Promise<QuestionPattern[]> {
  const sources = input.sourceIds
    .map(getTrustedQuestionSource)
    .filter((source): source is TrustedQuestionSource => Boolean(source))
    .slice(0, input.maxSources ?? 3);
  const patterns: QuestionPattern[] = [];
  for (const source of sources) {
    for (const url of source.seedUrls) {
      try {
        const fetched = await fetchTrustedSource(source.id, url, input.policy);
        const questions = extractExternalQuestions(source, fetched);
        const selected = input.topic
          ? questions.filter(
              (question) =>
                new RegExp(input.topic!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(
                  question.prompt,
                ) || inferSkills(question.prompt).length > 0,
            )
          : questions;
        patterns.push(...selected.map(analyzeExternalQuestion));
      } catch {
        // Source failure is isolated. One unavailable provider must never block generation.
      }
    }
  }
  return deduplicateQuestionPatterns(patterns).slice(0, 24);
}

export function buildResearchContext(patterns: readonly QuestionPattern[]): string {
  return patterns
    .slice(0, 8)
    .map((pattern) =>
      JSON.stringify({
        concept: pattern.concept,
        skills: pattern.skills,
        prerequisites: pattern.prerequisites,
        difficulty: pattern.difficulty,
        pattern: pattern.pattern,
        evidenceSignals: pattern.evidenceSignals,
        commonMistakes: pattern.commonMistakes,
        provenance: pattern.provenance,
      }),
    )
    .join("\n");
}
