# LinuxForge Lab Control Plane v16

## Production runtime boundary

v16 adds the provider-neutral infrastructure runtime boundary below `SandboxProvider`.

```text
Learning/Core
    -> Lab Control Plane
    -> SandboxProvider
    -> RuntimeBackend
    -> RuntimeNode
    -> VM / microVM implementation
```

### RuntimeBackend

`RuntimeBackend` owns infrastructure lifecycle semantics:

- launch
- start
- stop
- reset
- pause/resume
- snapshot/restore
- destroy
- runtime health

It intentionally does not expose a hypervisor-specific API. A production implementation can target Firecracker, Cloud Hypervisor, Kata, or another isolated runtime without changing the learning engine or terminal layer.

### RuntimeNode registry

`InMemoryRuntimeRegistry` provides the control-plane placement contract for registered runtime nodes. It validates runtime class/capabilities, rejects disabled or saturated nodes, tracks reservations, and prevents unregistering nodes with active environments.

A durable registry can replace this implementation later without changing the contract.

### Admission

Production launches are admitted again at the infrastructure boundary. Required properties remain:

- VM/microVM runtime class
- immutable image digest
- no host filesystem
- no privilege escalation
- no device passthrough
- no metadata access
- explicit network policy

The runtime backend therefore cannot accidentally become a weaker path around `runtime-admission.ts`.

## What v16 does not claim

v16 does **not** ship a hypervisor implementation. Firecracker/Cloud Hypervisor/Kata selection remains an infrastructure deployment decision and should be benchmarked before being locked.
