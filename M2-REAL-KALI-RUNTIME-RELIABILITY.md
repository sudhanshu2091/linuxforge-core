# M2 — Real Kali Runtime Reliability

LinuxForge M2 hardens the V49 QEMU/Kali runtime without changing the locked browser → server → terminal gateway → runtime architecture.

## Runtime lifecycle

The runtime now keeps an explicit durable lifecycle state in addition to the existing provider-compatible status:

`CREATING → BOOTING → READY → RUNNING → STOPPING → STOPPED`

Failure/security states:

- `FAILED` — QEMU boot/runtime failure with a persisted failure reason and exit code.
- `QUARANTINED` — the persisted process identity is no longer trustworthy; the runtime cannot be started again until reconciled or destroyed.
- `DESTROYED` — durable tombstone after runtime artifacts are removed.

`PAUSED` and `RESETTING` remain supported as lifecycle branches.

## Reliability guarantees

- QEMU PID is checked against the actual QEMU command and environment disk.
- Unexpected QEMU exit becomes durable `FAILED` state instead of stale `RUNNING` state.
- Lost/stale process identity becomes `QUARANTINED`.
- Runtime startup reconciles orphan QEMU processes whose disks live below the runtime data directory but have no known environment record.
- Boot readiness requires both a live expected QEMU process and successful SSH readiness.
- Graceful stop uses QMP first, then SIGTERM, then SIGKILL after timeout.
- Destroy removes VM credentials, disk, seed and other runtime artifacts while retaining a minimal `DESTROYED` state tombstone.
- Lifecycle generation increments on real state transitions.
- Boot attempts and failure counts are persisted for diagnosis.
- Lifecycle operations accept the existing control-plane operation/idempotency context and persist successful results so retries after a runtime-service restart converge on the same result.
- Existing provider-facing status values remain compatible with the V49 application contract; the precise M2 lifecycle state is exposed through redaction-safe runtime metadata.

## Validation

M2 runtime validation includes the original V49 runtime suite plus dedicated lifecycle, quarantine, persistent idempotency, destruction-tombstone and orphan-process tests.
