# LinuxForge V49 — Completion Pass

This pass completes the V49 local-real-runtime validation boundary.

## Included
- Real QEMU-backed Kali VM remains a development/test provider only.
- Per-environment qcow2 overlay, cloud-init SSH identity, and localhost management endpoint.
- Interactive PTY transport through the terminal gateway; runtime descriptor advertises streaming.
- Cloud-init no longer grants `sudo` membership or `NOPASSWD:ALL` to the learner account.
- VM creation records a durable `ERROR` state when QEMU/bootstrap startup fails instead of leaving `CREATING` indefinitely.
- Guest identity endpoint: `GET /v1/environments/{id}/identity`, reporting the actual guest `/etc/os-release` version and kernel.
- Official archive release is recorded separately from actual guest identity; a mismatch is surfaced rather than inferred away.
- Setup script handles Kali cloud archives that contain `disk.raw` by converting it to qcow2.

## Production boundary
Learners use only the browser. QEMU, SSH, and virtualization tooling are infrastructure-side development/runtime components and are not client requirements. Production should bind the existing provider boundary to isolated cloud VM infrastructure rather than requiring local QEMU.


## Runtime reliability correction — V49-qemu-2

The completion pass also corrects a stale-runtime-state failure discovered during physical validation. An environment could previously retain `status: RUNNING` after its QEMU process had exited, while QEMU output was discarded. This is now corrected by:

1. QEMU stdout/stderr capture to a per-environment `qemu.log`.
2. Durable QEMU exit-code and diagnostic metadata.
3. A background QEMU watchdog/reconciliation loop.
4. Environment-aware PID/process identity verification.
5. SSH readiness gating before an environment is reported `RUNNING`.
6. Boot failure propagation with useful log-tail diagnostics.
7. Safe pause/resume behavior when the underlying process is missing.
8. Automated regression tests for stale `RUNNING` state, unexpected QEMU exit, log capture, and PID identity.

Runtime test result for this correction: **11/11 tests passing**.
