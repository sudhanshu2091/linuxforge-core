
## V44 — Production Lab Control Plane (completed scope)

- deterministic lifecycle transition policy
- durable, learner-owned lifecycle operation records
- idempotency keys scoped to learner + lab instance
- operation lease/worker protocol and expired-lease recovery
- conservative runtime reconciliation rules
- idle expiration and bounded resource-policy validation
- runtime binding/health/reconciliation projection columns
- append-only database audit trigger for operation state changes
- authenticated operation lookup/list endpoints
- existing provider/runtime separation preserved

# LinuxForge implementation checkpoint

This checkpoint is intentionally based on the existing v4 foundation rather than replacing it.

## Implemented in this pass

- Live learner overview server boundary with authenticated/RLS-scoped reads.
- Dashboard now uses real profile, progression, challenge, skill, streak, lab and terminal data.
- Progress page now uses live mastery, accuracy, time-on-task and activity history.
- Profile now uses live progression and skill evidence instead of demo learner values.
- Achievements now derive unlock state from recorded evidence.
- Notifications now derive mentor nudges from live learner state.
- Pure learner-model module for mastery, rank, XP and streak calculations with unit tests.
- Challenge/attempt/skill/progression/narrative writes moved behind a server-only persistence boundary.
- Challenge events no longer store full terminal line dumps. Terminal transcript restoration reads persisted lab command events instead.
- Terminal input/output persistence is redacted before storage.
- AI observer context is redacted before it is sent to the AI provider.
- Real Linux lab instances are now persisted into `lab_instances` by the control plane instead of assuming the provider writes application metadata.
- Real provider lifecycle responses sync back into the control-plane lab row.
- Real Linux filesystem observations are projected into `lab_world_objects` with bounded/redacted file previews.
- Added control-plane indexes and protection against multiple active lab records for one learner/lab/provider.
- Added Phase 2 lab lease primitives with atomic claim/heartbeat/release RPCs.
- Added an explicit lab lifecycle state machine so scheduler/provider transitions cannot silently jump between incompatible states.
- Added authenticated lease endpoints for future worker scheduling and terminal-session heartbeats.
- Added durable `lab_jobs` queue schema with atomic PostgreSQL claim/heartbeat/complete/fail/recovery RPCs for internal workers.
- Added `SupabaseLabJobStore` and a coordinator boundary connecting durable jobs to the provider-neutral worker.
- Added coordinator tests for durable enqueue-before-execution and expired-job recovery.
- Removed Lovable-specific Vite configuration, editor telemetry, preview auth storage, project metadata and README/agent instructions.
- Replaced the Lovable Vite wrapper with the standard TanStack Start + Vite + React + Tailwind plugin configuration.
- Added `typecheck`, `test`, and `test:watch` scripts.
- Updated environment documentation for client/server Supabase configuration.

## Intentionally not implemented yet

- Production WebSocket/WebTransport terminal gateway.
- Production worker process/host pool and VM/microVM data plane.
- Firecracker/Cloud Hypervisor selection and production host pool.
- Real social/friend backend and squad persistence.
- Full knowledge ingestion/RAG platform.
- Multi-VM cyber ranges.
- Local real-machine companion.
- Production event bus/Redis/queue infrastructure.

These remain explicit architecture boundaries rather than being faked inside the current monolith.

## Validation

- Python sandbox runtime compiles with `python -m py_compile`.
- Changed TypeScript/TSX files pass TypeScript transpilation/parsing checks.
- Full `tsc`/Vitest execution requires a complete dependency installation in the target environment; the uploaded workspace's dependency tree is incomplete in this build environment, so a full typecheck/build result is not claimed here.

## v24 — Mission-to-Assessment Product Slice

- Mission attempt timing exposed from persisted attempt state.
- Completion handoff to next mission and adaptive mission generation.
- Generated executable missions participate in next-mission selection.
- Server-side prerequisite enforcement on mission launch.
- Functional challenge filters.
- Deterministic verifier remains assessment authority; AI observer remains advisory.

## v25 — Evidence-Based Mission Assessment

- Added a server-only deterministic mission assessment summary over persisted command/observation/verification evidence.
- Added authenticated `assessMission` server function and learner-facing "Assess run" action.
- Assessment reports objective coverage, command/mutation counts, failures, blocked actions, loop evidence, hint usage, elapsed time and observed mistake categories.
- Strengths and next actions are derived from persisted evidence; the verifier's grade/status remain authoritative.
- Assessment summaries are persisted as `learner_challenge_events` with kind `assessment`; no new security boundary or provider coupling was introduced.
- Added pure assessment tests for successful execution and mistake-pattern aggregation.

## V29 — Intelligent Teaching & Grounding Engine

- Expanded progressive hints from hint-count-only behavior into a situation-aware teaching engine using learner level, desired difficulty, mastery, focus skills, mistake history, execution failures, prior hint stages, mission objective and terminal evidence.
- Added deterministic teaching strategies: discovery, diagnosis, repair, explanation, transfer and verification.
- Added a bounded curated knowledge-card retrieval layer with source references. This is an explicit retrieval seam, not a claim of full external-corpus RAG ingestion.
- Integrated retrieval and teaching strategy into the mission-aware Forge Mentor context.
- Added previous-hint context and concept-gap information while preserving security redaction/bounding.
- Added V29 unit coverage for retrieval, teaching-strategy selection and adaptive hint behavior.
- Preserved the locked verifier/progression/lab/security responsibility boundaries.

### V29 validation

- `npm run typecheck`: passed before dependency repair attempts.
- `npm test`: blocked in the supplied archive environment by a missing optional Rolldown native binding (`rolldown-binding.wasi.cjs`). A clean dependency reinstall was attempted but the build environment timed out before completion. No test-pass claim is made for the archive environment.
- The source changes introduced in V29 are TypeScript-typechecked; test execution still needs to be rerun after a successful `npm install`/`npm ci` in the target environment.

- V49 completion pass: real QEMU guest identity verification, interactive streaming metadata, secure learner bootstrap, durable startup ERROR state, and raw-disk cloud-image conversion.


### V49-qemu-2 reliability correction
- QEMU process lifecycle is now supervised continuously.
- `RUNNING` requires successful SSH readiness.
- QEMU logs and exit codes are persisted per environment.
- Unexpected process death becomes durable `ERROR` instead of stale `RUNNING`.
- PID identity is checked against the environment's QEMU disk.
- Regression coverage: 11 runtime tests passing.
