# LinuxForge v24 — Mission-to-Assessment Product Slice

v24 builds the learner-facing mission loop on top of the locked v23 control-plane boundaries.

## Delivered

- Mission attempts expose their persisted `started_at` timestamp to the learner UI.
- Mission workspace shows live elapsed time for an active attempt.
- Completion UI now makes the progression handoff explicit: verified result, learner-model update, next mission, adaptive mission generation, and free-practice terminal.
- Generated executable missions participate in the server-side next-mission selection instead of being invisible after completion.
- Server-side mission launch now re-checks prerequisites. UI locking is not treated as a security boundary.
- Challenge filters are functional for the existing filesystem/process/networking/log/hardening catalogue instead of decorative controls.
- Existing deterministic verifier remains the final assessment authority.
- Existing AI observer remains advisory/coaching-only.
- Existing lab/runtime/terminal security boundaries are unchanged.

## Flow

`Learning Path → Mission → Lab → Terminal → Verifier + Observer → Persisted Attempt → Learner Model → Next Mission`

Adaptive executable missions follow the same flow once persisted as `generated_exercises`.

## Security boundary

The client may request a mission, but the server validates that the mission exists and that every prerequisite is complete before creating/resuming the attempt. The terminal still executes only through the authenticated lab/provider boundary.
