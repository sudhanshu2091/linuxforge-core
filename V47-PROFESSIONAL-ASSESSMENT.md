# V47 — Professional Assessment Engine

V47 adds an evidence-first professional assessment layer on top of V44 lab control, V45 isolation, and V46 cybersecurity lab scenarios.

## Core flow
Assessment blueprint → authorized V46 environment → assessment session → append-only evidence ledger → deterministic objective evaluation → professional dimensions → integrity result → assessment report → learner evidence.

## Authority boundaries
- V44 remains authoritative for lab lifecycle.
- V45 remains authoritative for tenant isolation, runtime identity, terminal binding, network policy and quarantine.
- V46 remains authoritative for cybersecurity scenario topology/capabilities.
- Existing verifier remains authoritative for individual executable mission correctness.
- V47 evaluates assessment-level evidence; it does not grant mastery, XP or progression.
- AI may assist with report/findings interpretation later, but cannot override deterministic results.

## Assessment modes
KNOWLEDGE, PRACTICAL, SCENARIO, DEFENSIVE, PROFESSIONAL_SIMULATION.

## Integrity
Scope, prohibited technique/tool, runtime, learner, lab and binding-generation checks are explicit. Findings are evidence, not an automatic accusation beyond the declared policy result.

## Persistence
The V47 migration creates assessment metadata, objectives, sessions, append-only events, results, dimensions, findings and reports with learner ownership RLS. Runtime execution remains behind V44/V45 server boundaries.
