# LinuxForge v18 — Runtime Infrastructure Service

v18 establishes the authenticated request and reconciliation protocol immediately above a VM/microVM runtime service.

## Request security

Every infrastructure lifecycle request is bound to:

- HTTP method and path
- timestamp
- single-use nonce
- operation ID
- environment ID
- runtime node ID
- idempotency key
- exact request body

The service signs this canonical envelope with HMAC-SHA256. Nonces are persisted by the infrastructure service so replay protection survives process restarts.

## Operation reconciliation

A worker that loses an operation lease must not infer success or failure. The operation becomes `UNKNOWN`. v18 only marks it `SUCCEEDED` when a fresh runtime observation proves the requested state.

The destroy exception is intentional: an absent environment is positive evidence that the destroy request's desired state has been reached.

## Boundary

```text
Lab Control Plane
    -> authenticated Runtime Service API
    -> runtime-node operation execution
    -> VM / microVM
```

The protocol remains hypervisor-neutral. Firecracker, Cloud Hypervisor, Kata, or another runtime can implement the lower service without changing Core.
