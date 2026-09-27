# M5 — Semantic Exercise Verification

M5 adds the authoritative evidence and verification layer between the real Kali environment and future learner/question intelligence.

## Guarantees

- Environment state, not expected terminal text, is authoritative.
- Alternate valid command sequences can pass when they produce the required state.
- Verification is requirement-based and produces PASS/PARTIAL/FAIL/BLOCKED/INVALID-compatible evidence.
- Filesystem, permissions, ownership, content, process, service, and network requirements have deterministic verifiers.
- Evidence is bound to the persistent environment generation from M4.
- Old evidence is rejected after an environment reset/generation change.
- Verification records are immutable/history-preserving through append-only service-role writes.
- Direct completion with zero assistance is marked consumed for future novelty intelligence.
- Assisted completion is retained as learning evidence without permanently consuming the question.
- Semantic fingerprints normalize literal paths so trivial renaming does not create fake novelty.
- AI has only an advisory semantic-analysis seam and cannot override authoritative facts.

## Runtime boundary

M5 inspection uses the existing server-side provider boundary. The browser never receives runtime credentials and never directly inspects the VM. The real provider's controlled `/inspect` endpoint collects only explicitly requested paths plus process/service/network evidence.

## Future intelligence contract

Each exercise carries concepts, prerequisites, reasoning pattern, scenario type, and difficulty. M7/M9 can use the resulting history to implement mastery, revival, and concept composition without changing the M5 evidence model.
