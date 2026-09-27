# V49 — Real Kali VM Runtime

V49 makes the LinuxForge lab runtime physically real while preserving the locked V44 control-plane, V45 isolation, V46 lab ecosystem, V47 assessment, and V48 scenario boundaries.

## Runtime architecture

```text
Learner Browser
      |
      | authenticated short-lived PTY ticket
      v
LinuxForge application
      |
      v
Browser Terminal Gateway (WebSocket)
      |
      | runtime service credential (server/runtime plane only)
      v
Runtime Provider / Lab Control Plane
      |
      v
QEMU runtime node (development) / VM or microVM node (production)
      |
      v
Kali Linux VM
```

The learner never installs QEMU, Kali, Docker, SSH, or virtualization software. QEMU is a development/runtime-node implementation only. Production uses the existing provider-neutral runtime backend boundary and a cloud virtualization node.

## V49 delivered

- real QEMU VM provisioning with qcow2 overlays
- immutable base-image identity and SHA-256 verification
- ARM64 Apple Silicon development path and x86_64/KVM runtime path
- per-environment SSH identity kept on the runtime node
- cloud-init guest bootstrap
- restricted QEMU management networking
- no host filesystem mounts
- authenticated runtime HTTP service
- durable runtime state and lifecycle operations
- QMP snapshot/restore
- real filesystem/process/service/environment observation
- interactive PTY sessions backed by a real guest shell
- PTY input, output, resize, signals and close
- browser-facing WebSocket terminal gateway
- short-lived HMAC terminal tickets scoped to learner/lab/environment/session
- origin checking and output/input bounds at the gateway
- guest process/open-file limits for interactive sessions
- production/development runtime-provider separation through the existing RuntimeBackend boundary
- fixed HTTP backend stop lifecycle (STOP no longer destroys the environment)
- real Linux provider advertises streaming PTY capability

## Browser-only product requirement

Production learners interact only through the LinuxForge web application:

```text
Browser -> LinuxForge Cloud -> terminal gateway -> isolated runtime -> Kali VM
```

Runtime-node operators may use QEMU, KVM, or another virtualization implementation. Those are infrastructure dependencies, not learner dependencies.

## Configuration

Application/server:

- `FORGE_SANDBOX_PROVIDER=real-linux-isolated-v1`
- `FORGE_SANDBOX_RUNTIME_MODE=development` for the local QEMU path
- `FORGE_SANDBOX_RUNTIME_CLASS=vm`
- `FORGE_SANDBOX_ENDPOINT=http://127.0.0.1:18080` for local runtime service
- `FORGE_SANDBOX_CREDENTIAL` / `FORGE_RUNTIME_SERVICE_TOKEN` stay server-side
- `FORGE_SANDBOX_IMAGE` identifies the immutable image; production admission requires a digest
- `FORGE_TERMINAL_GATEWAY_URL` points to the browser-facing gateway
- `FORGE_TERMINAL_TICKET_SECRET` is shared only by the authenticated app and terminal gateway

Runtime node:

- `FORGE_RUNTIME_IMAGE_PATH`
- `FORGE_RUNTIME_IMAGE_REF`
- `FORGE_RUNTIME_DATA_DIR`
- `FORGE_RUNTIME_ARCH`
- `FORGE_QEMU_ACCEL`
- `FORGE_QEMU_UEFI_CODE` when firmware is not auto-discovered
- `FORGE_RUNTIME_SERVICE_TOKEN`

## Local development

On Apple Silicon the intended development path is:

```text
Mac -> QEMU + HVF -> Kali ARM64 VM
```

The setup helper obtains the official Kali cloud image, verifies its expected archive digest, extracts the guest disk, and creates a local disk digest used by the runtime's immutable-image check.

The runtime service and terminal gateway are intentionally separate from the TanStack application process.

## Production

The same provider-neutral application boundary can point at a production runtime service on dedicated cloud virtualization workers. The production endpoint must be HTTPS, the runtime class must be `vm` or `microvm`, and the image identity must be an immutable SHA-256 reference.

The production runtime node is responsible for actual virtualization and isolation. The browser does not connect directly to a VM or receive runtime credentials.

## Validation

The Python runtime and gateway are covered by the runtime test suite. Full application typecheck/test and real Kali boot require the project's npm dependency installation and a host with QEMU/Kali assets; those are environment-dependent validation steps and are not represented as successful inside a dependency-less build container.


## Fixed-8 boot correction
The macOS ARM64 QEMU provider now boots an independent per-environment clone of the official Kali ARM64 qcow2 image using the proven virtio root-disk + CD-ROM cloud-init attachment. This avoids the UEFI/GRUB module lookup failure observed with the previous backing-overlay/explicit virtio device path. Production providers remain free to use storage-native copy-on-write.
