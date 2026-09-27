# V41 — RAG / Grounded Teaching

V41 connects the existing V31 retrieval and V39 curriculum-content layers to the V40 production AI provider boundary.

## Flow

Learner question → bounded retrieval → curriculum teaching material → grounded context → V40 provider → response validation → learner-facing answer.

## Guarantees

- Retrieval is deterministic and bounded.
- Source provenance is preserved.
- Source text is treated as evidence, not instructions.
- Provider output is bounded and checked for internal-detail leakage.
- Provider failure has a deterministic knowledge/curriculum fallback.
- V36 mastery, V35 adaptive training, verifier authority, lab control, and security boundaries remain authoritative.
