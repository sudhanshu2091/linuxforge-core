# LinuxForge Core V31 — Knowledge + Retrieval + Persistent Intelligence

V31 deepens the V30 intelligence foundation without changing the locked responsibility boundaries.

## 1. Knowledge ingestion

`src/lib/ai/knowledge-ingestion.ts` accepts versioned, provenance-bearing source documents and normalizes them into auditable knowledge chunks. It performs section splitting, deterministic IDs, basic kind classification, difficulty metadata and source provenance.

## 2. Indexed retrieval

`src/lib/ai/knowledge-index.ts` builds an inverted token index. `knowledge-retrieval.ts` now searches the index first, expands a small controlled alias vocabulary, scores learner skills/mistakes/difficulty/prerequisites, and keeps source provenance attached.

Unsafe evidence is treated as a safety-gating signal: safety grounding is deliberately ranked above ordinary procedural advice.

## 3. Learner intelligence materialization

`learner-intelligence-snapshot.ts` converts persisted skill evidence into a versioned materialized intelligence view containing skill evidence and a mistake heatmap. `learner-intelligence.persistence.server.ts` records the snapshot through the existing narrative-event persistence boundary. The skill-memory rows remain authoritative and snapshots are rebuildable.

## 4. Security boundary

No provider secrets, verifier contracts, hidden challenge solutions, raw database rows or infrastructure credentials are added to retrieval output. Retrieval remains bounded, deterministic and provenance-aware before tutor context crosses the provider boundary.

## 5. V31 validation goals

- ingestion produces stable, deduplicated chunks
- index returns relevant candidates
- mistake-specific evidence changes ranking
- unsafe evidence prioritizes safety grounding
- provenance survives retrieval
- learner snapshots are deterministic and rebuildable
- all previous V30 tests remain green
