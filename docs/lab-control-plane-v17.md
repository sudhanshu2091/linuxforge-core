# LinuxForge Lab Control Plane v17

## Runtime infrastructure service boundary

v17 turns the v16 runtime boundary into an explicit crash-safe protocol.

```text
Lab Control Plane
      |
      +-- runtime node registry
      |      +-- registration generation
      |      +-- heartbeat / offline detection
      |      +-- capacity lease
      |
      +-- runtime operation store
      |      +-- idempotency key
      |      +-- operation lease
      |      +-- UNKNOWN after lease expiry
      |
      +--------------------+
                           |
                    RuntimeBackend
                           |
                    HTTP Runtime API
                           |
                    VM / microVM service
```

### Node lifecycle

A runtime node has a registration generation. Re-registration increments the
 generation so delayed heartbeats from an old process cannot revive a newer
registration. Heartbeats move a node to `ACTIVE`; stale nodes become `OFFLINE`.
Capacity is reserved with a short lease rather than an unbounded counter lock.

### Operation lifecycle

Lifecycle intents use an idempotency key. Repeating the same request returns the
original operation. Reusing a key for a different operation is rejected.

```text
QUEUED -> RUNNING -> SUCCEEDED
                 \-> FAILED
                 \-> UNKNOWN  (lease expired)
```

`UNKNOWN` is intentional. The control plane never guesses that an infrastructure
operation succeeded merely because its worker crashed. Reconciliation must query
the runtime service and then settle the operation.

### Security

Runtime credentials are represented by SHA-256 hashes in the control-plane
model. Learner-facing roles have no write access to infrastructure tables or
RPCs. Runtime classes remain restricted to `vm` and `microvm` for production.

### Hypervisor neutrality

The protocol does not choose Firecracker, Cloud Hypervisor, Kata, or another
runtime. That remains a deployment/benchmark decision below this boundary.
