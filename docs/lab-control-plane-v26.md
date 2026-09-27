# LinuxForge V26 — Adaptive Learning Loop

V26 is a product-facing learner-model slice built on V25.

## Flow

`Mission execution → verifier → evidence assessment → adaptive plan → next challenge`

## Adaptive rules

- Weak/incomplete runs prefer remediation at a lower or equal difficulty.
- Safety-blocked runs keep the learner at the current difficulty and focus on safe workflow.
- Due reviews are selected for spaced retrieval before unnecessary difficulty increases.
- Strong verified runs (85+) can advance one difficulty level.
- Progressing runs use mixed reinforcement rather than blindly increasing difficulty.

The plan is deterministic and based on persisted learner evidence. AI can provide coaching, but cannot override verification, unlock prerequisites, or grant rewards.

## Security boundary

No new host execution path, provider coupling, hypervisor access, or client-side authority was introduced. Assessment and adaptive selection remain behind authenticated server functions and existing persistence boundaries.
