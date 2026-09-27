# LinuxForge Core — M3 Terminal & Lab Control Plane

M3 sits above the locked M1 identity/isolation layer and M2 real-Kali runtime reliability layer.

## Responsibilities

- Runtime allocation with concurrent-request convergence.
- Explicit lab start, stop and restart controls.
- Persistent learner-owned terminal sessions.
- Short-lived signed terminal tickets.
- Binding-generation and runtime-lifecycle-generation scoping.
- Terminal reconnect/reissue without inventing a second runtime.
- Ownership enforcement across learner → lab → runtime → session.
- Session invalidation on stop/restart/destroy.
- Durable control-operation idempotency and concurrency handling.
- Terminal session audit events.
- Runtime PTY rejection of stale lifecycle-generation tickets.

## Boundaries

- M1 remains authoritative for runtime identity, ownership, isolation and binding generation.
- M2 remains authoritative for QEMU lifecycle, health, process supervision, recovery and runtime lifecycle generation.
- M3 is authoritative for learner-facing lab control and terminal session authorization.
- Browser code never receives runtime credentials and never talks directly to QEMU.

## Terminal ticket

A terminal ticket contains:

- learner ID
- lab ID
- environment ID
- terminal session ID
- shell
- cwd
- M1 binding generation
- M2 runtime lifecycle generation
- expiry
- nonce

The gateway validates the ticket and passes the M2 lifecycle generation to the runtime. The real-Kali runtime rejects a PTY open request whose lifecycle generation no longer matches the current runtime generation. This invalidates stale tickets after stop/restart/failure lifecycle transitions.

## Concurrency

Lab creation is protected by the existing `(user_id, lab_key)` uniqueness constraint. Concurrent runtime allocation attempts use the existing lab/provider uniqueness boundary; a losing real-runtime allocation is explicitly destroyed before the canonical persisted instance is reread.

Control-operation creation also handles a concurrent unique-key race by rereading the canonical operation after a duplicate-key conflict.

## Persistence

M3 adds:

- `lab_terminal_sessions`
- `lab_terminal_session_events`

Both are learner-scoped through RLS. Session creation is idempotent per `(user_id, session_id)` and is rejected if the session has been rebound to another lab/runtime or generation.

## Lifecycle controls

The authenticated lab control endpoint now supports:

- get
- start/resume
- stop
- restart
- reset
- pause
- snapshot
- restore
- destroy

Stopping, restarting and destroying a lab invalidate active terminal sessions.

## Validation target

M3 is not locked until the user-side validation gate passes:

- `npm test`
- `npm run typecheck`
- `npm run lint` with zero errors
- `npm run build`
- `npm run runtime:test`
- real-Kali end-to-end lab start → terminal connect → command → reconnect → stop → stale-ticket rejection → restart → new terminal → destroy validation.
