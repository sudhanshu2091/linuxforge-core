# LinuxForge Terminal Session Layer v27

v22 is the accelerated product-facing Lab Workspace slice built on the locked v21 terminal-session protocol.

## Added

- Lab environment status dock in the learner terminal.
- Authenticated lab lifecycle controls: start/resume, pause, reset, snapshot, destroy, refresh.
- Persisted observed filesystem panel sourced through the existing authenticated lab lifecycle boundary.
- Snapshot visibility in the terminal workspace.
- Clear distinction between modelled training runtime and a verified isolated Linux runtime.
- Existing v20/v21 control-plane, security, terminal-session, and provider boundaries remain intact.

## Validation

Run on the authoritative development machine:

```bash
npm install
npm run typecheck
npm test
```


## V26 — Adaptive learning loop
V26 connects evidence-backed assessment to a deterministic adaptive plan. The learner model now drives remediation, spaced review, and difficulty progression without allowing AI to change verification authority. Mission feedback exposes the next learning step and focus skills.


## V27 — AI tutor context layer
V27 adds bounded mission-aware Forge Mentor coaching. Mission tutor requests use learner-safe context derived from the current mission state, redact terminal evidence before provider access, and explicitly keep AI advisory-only.

## V28 — Intelligent Hint & Teaching Engine

V28 adds a deterministic, evidence-aware progressive hint layer. Hints remain server-authoritative and preserve the existing contract ladder, while coaching is adapted to the latest observed mistake and learner state. Hint stages are concept, direction, command, near-solution, and solution; the final solution stage is only exposed at the final configured hint level. The verifier remains the source of truth and the AI tutor remains advisory.

## V32 — Intelligent Mission Generation
V32 adds a deterministic mission-planning layer between learner intelligence/retrieval and AI exercise generation. It selects a mission archetype, primary/supporting skills, difficulty, prerequisites, story continuity guidance, evidence focus, and grounded knowledge IDs. The AI may express the mission, but the planner and existing server-only generated contract remain authoritative for learning intent and executable verification.

## V45 — Secure Multi-Tenant Lab Isolation

V45 adds the runtime security boundary for multi-tenant labs: lab-bound runtime identities, binding generations, deny-by-default isolation policy, explicit isolation verification, terminal binding checks, filesystem/network boundary guards, quarantine rules, cleanup invariants, and service-role-only runtime credential storage. V44 remains authoritative for lab lifecycle control.
