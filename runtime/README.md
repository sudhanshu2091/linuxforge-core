# LinuxForge V49 runtime services

These processes run in the infrastructure/runtime plane, not inside the learner browser and not as part of the TanStack application process.

## QEMU runtime

```bash
FORGE_RUNTIME_SERVICE_TOKEN='...' \
FORGE_RUNTIME_IMAGE_PATH='/path/to/kali.qcow2' \
FORGE_RUNTIME_IMAGE_REF='kali-2026.2-arm64' \
python3 runtime/qemu-runtime.py
```

Default listener: `127.0.0.1:18080`.

## Browser terminal gateway

```bash
FORGE_RUNTIME_SERVICE_TOKEN='...' \
FORGE_TERMINAL_TICKET_SECRET='at-least-32-random-bytes' \
FORGE_RUNTIME_HTTP_ENDPOINT='http://127.0.0.1:18080' \
FORGE_TERMINAL_ALLOWED_ORIGIN='http://localhost:3000' \
python3 runtime/terminal-gateway.py
```

Default listener: `127.0.0.1:18081`.

The application server mints a short-lived HMAC ticket after Supabase authentication and V45 runtime-isolation authorization. The browser receives only that ticket and the gateway URL; the runtime service token and SSH key never leave the infrastructure plane.

In production, place the gateway behind the LinuxForge HTTPS edge and set `FORGE_TERMINAL_ALLOWED_ORIGIN` to the exact application origin. The gateway may then proxy to a production VM/microVM runtime service using the same provider-neutral contract.


## QEMU process supervision and diagnostics

V49-qemu-2 does not treat a persisted `RUNNING` flag as proof that a VM is alive. The runtime:

- waits for the guest SSH service to become usable before returning `RUNNING`;
- captures QEMU stdout/stderr in `<environment>/qemu.log`;
- records `qemuExitCode` and the log path in `state.json`;
- continuously reconciles exited QEMU processes with a watchdog;
- changes unexpected QEMU exits to durable `ERROR` state instead of leaving stale `RUNNING`;
- verifies the recorded PID is actually a QEMU process for that environment's disk, reducing PID-reuse mistakes;
- refuses to pause a VM whose QEMU process is not alive.

A healthy environment therefore has both a live QEMU process and a successful SSH readiness check. If QEMU exits during boot, the create/start operation fails with the QEMU log tail instead of returning a false `RUNNING` environment.
