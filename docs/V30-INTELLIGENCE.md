# LinuxForge Core V30 — Knowledge + Learner Intelligence

V30 deepens the V29 teaching foundation without changing the locked responsibility boundaries.

## What changed

### 1. Local knowledge corpus
`src/lib/ai/knowledge-corpus.ts` provides an auditable instructional corpus of original Linux/security concept, diagnostic, procedure, and safety chunks. Each chunk carries skills, difficulty, mistake types, prerequisites, and source IDs.

### 2. Retrieval engine
`src/lib/ai/knowledge-retrieval.ts` adds deterministic hybrid-style retrieval signals: lexical term overlap, skill relevance, mistake relevance, difficulty proximity, diagnostic/safety boosts, and prerequisite matches.

The existing `knowledge-base.ts` API remains compatible and now adapts retrieved chunks into the tutor-facing knowledge-card shape.

### 3. Learner intelligence
`src/lib/ai/learner-intelligence.ts` derives teaching signals from evidence already represented by the learner model:
- focus skills
- fragile skills
- mastered skills
- dominant/repeated mistakes
- mastery/confidence
- hint dependency
- independence
- readiness
- conservative difficulty adjustment

It does not change grades, XP, progression, labs, or security.

### 4. Teaching integration
Forge Mentor and the teaching engine now use the learner-intelligence layer when selecting focus and teaching strategy. Knowledge retrieval is difficulty-aware and mistake-aware.

### 5. Context enrichment
The bounded mission tutor context now exposes learner teaching signals (readiness, confidence, independence, hint dependency, signals, and difficulty adjustment) while retaining transcript redaction and context bounds.

## Responsibility boundaries

- Verifier: authoritative correctness.
- Learner model: learner-state evidence.
- Adaptive engine: next-activity planning.
- Teaching engine: teaching strategy.
- Knowledge retrieval: grounding candidates.
- AI provider: language generation only.
- Lab control plane: environment lifecycle.
- Security plane: authorization/isolation/secrets.

No V30 component may silently cross these boundaries.

## Validation note

The source archive in this environment did not contain a complete installable dependency tree. A clean `npm install --ignore-scripts` attempt timed out, so the full TypeScript/test suite could not be truthfully marked as passing here. The source changes should be validated locally with:

```bash
npm install
npm run typecheck
npm test
```
