# LinuxForge V29 — Intelligent Teaching & Grounding Engine

V29 deepens the existing V27/V28 architecture without changing responsibility boundaries.

## What V29 adds

### 1. Situation-aware teaching
The hint engine now consumes more than hint count:
- learner level
- desired difficulty
- skill mastery
- weak/focus skills
- recent mistake categories
- latest observation
- failed-command evidence
- attempt count
- previous hint stages
- mission objective
- recent terminal evidence

It selects a teaching strategy: `DISCOVER`, `DIAGNOSE`, `REPAIR`, `EXPLAIN`, `TRANSFER`, or `VERIFY`.

### 2. Curated retrieval layer
`src/lib/ai/knowledge-base.ts` provides original, auditable concept cards linked to the existing public source catalogue. Retrieval ranks cards using objective/evidence/skill/mistake signals.

This is a real retrieval boundary, but it is deliberately not described as a full external-corpus RAG system yet. V30+ can add ingestion, chunking, embeddings and indexed external content behind the same retrieval contract.

### 3. Progressive hints
Existing hint levels remain the learner-facing progression. V29 changes the content selected at each level so a hint can diagnose a path error, explain a concept gap, redirect an unsafe approach, or reinforce independent reasoning instead of merely selecting a static string.

### 4. Grounded Forge Mentor context
Mission tutor context now includes:
- previous hint stages
- teaching strategy
- next diagnostic action
- concept gap
- retrieved knowledge summaries
- source references

All terminal evidence remains redacted and bounded. Hidden contracts, verifier internals, provider configuration and secrets are not included.

## Responsibility boundaries remain locked

- AI observes, retrieves, explains and coaches.
- Deterministic verifier decides objective correctness.
- Learner model stores learner state.
- Adaptive engine chooses learning direction.
- Progression controls advancement and rewards.
- Lab Control Plane controls environments.
- Security Plane controls isolation and authorization.

V29 does not allow the tutor to modify grades, XP, progression, lab state or security policy.

## Future extension seam

The knowledge-card retrieval contract is intentionally independent from storage. A future ingestion/indexing worker can add versioned documents, chunk metadata, embeddings, source freshness and citation policy without changing the mission or tutor interfaces.
