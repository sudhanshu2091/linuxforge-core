# V44 — Production Lab Control Plane

V44 completes the application-level production control-plane contract without moving provider execution into the browser or Core process.

## Responsibilities

- authenticated learner ownership at the server boundary
- explicit lifecycle state machine
- idempotent lifecycle operation identity
- operation leases and worker ownership
- operation recovery to `UNKNOWN` after lease loss
- conservative runtime reconciliation
- idle-expiration policy
- resource-policy fingerprinting for drift detection
- append-only control-operation audit events in PostgreSQL
- runtime binding metadata (`runtime_node_id` / binding generation)
- terminal-operation protection
- failure/retry bookkeeping

## Separation

`Lab Control Plane → SandboxProvider → RuntimeBackend → VM/microVM`

The control plane decides **what lifecycle intent exists and who owns it**. The provider/runtime decides **how to execute it**. V44 never executes shell commands itself, never grants mastery/XP, and never exposes a runtime endpoint to the browser.

## Recovery rule

A worker lease expiry changes an operation to `UNKNOWN`; the control plane does not guess success. A reconciliation worker must observe the runtime and can confirm only when the observed state proves the requested outcome. Destructive operations may be confirmed by absence of the runtime.
