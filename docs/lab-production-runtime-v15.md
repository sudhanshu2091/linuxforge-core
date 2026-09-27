# LinuxForge production runtime boundary v15

v15 closes an important control-plane gap without pretending the current Docker+PRoot runtime is production-grade.

## Boundary

```text
Client
  -> authenticated LinuxForge server
  -> Lab Control Plane / durable jobs
  -> Lab Worker
  -> SandboxProvider
  -> Runtime HTTP contract
  -> dedicated VM or microVM (production)
```

The worker still owns job leases and typed lifecycle dispatch. The provider remains the only adapter selected for runtime execution. The learner-facing application never receives a runtime credential or connects directly to the runtime.

## Runtime launch contract

The provider now sends an explicit `runtime` object with:

- `runtimeClass`: `vm` or `microvm` for production;
- immutable `imageRef`: `image@sha256:<64 hex characters>`;
- learner/lab ownership identifiers;
- the existing CPU, memory, storage, process, file and output quotas;
- security profile declaring host filesystem access, privilege escalation, device passthrough, nested virtualization and metadata access disabled.

Production admission fails closed when any of these requirements is missing.

## Runtime health contract

Providers expose `getRuntimeHealth()` through `/v1/health`. Health is provider-reported and includes:

- runtime class/version;
- healthy/ready state;
- network isolation status;
- host-filesystem isolation status;
- privilege-escalation blocking;
- metadata-access blocking;
- active-environment capacity.

AI assessment is never used as evidence that these security properties exist.

## Current development runtime

`sandbox-runtime/` remains a development adapter using Kali + Docker + PRoot. It identifies itself as `container-dev` and refuses `SANDBOX_RUNTIME_MODE=production`.

That is intentional. The next runtime implementation must be a dedicated VM/microVM per learner environment (or an equivalently strong isolation boundary), with network/resource policy enforced outside the guest. Do not deploy the Docker+PRoot service as the multi-tenant production runtime.

## Production handoff requirements

A production runtime service must implement the same provider contract while additionally enforcing:

1. one isolated guest boundary per environment;
2. no host filesystem mounts;
3. no Docker socket or hypervisor control socket in the guest;
4. no cloud metadata access;
5. bounded CPU/RAM/disk/process/file/output resources;
6. default network egress DENY, with explicit allowlists when a lab needs network access;
7. encrypted, access-controlled snapshots;
8. versioned, scanned and signed base images;
9. authenticated runtime-to-control-plane communication;
10. runtime-side teardown that remains safe if the learner obtains guest root.

Firecracker, Cloud Hypervisor, Kata Containers, or another suitable isolation technology can implement this boundary; v15 deliberately does not lock the architecture to one hypervisor.
