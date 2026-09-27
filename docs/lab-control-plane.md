# LinuxForge Lab Control Plane

v7 makes lifecycle mutation a coordinated control-plane operation.

## Request path

```text
authenticated client
        |
        v
lab server function
        |
        v
Lab lifecycle wrapper
        |
        +--> acquire short control lease
        |
        v
SandboxProvider
        |
        v
isolated runtime / modelled provider
        |
        v
persist provider descriptor
        |
        v
release control lease
```

## Concurrency

Lifecycle mutations acquire a short-lived lease on the learner's own
`lab_instances` row. The lease is stored as a SHA-256 hash and expires
automatically. If a request crashes, the expired lease becomes reclaimable.

Lifecycle persistence also uses an optimistic `status = from` condition.
A stale request therefore cannot overwrite a newer state.

## Reconciliation

`reconcileLabInstance()` asks the provider for its authoritative state and
compares it with the durable control-plane projection. Only transitions
allowed by the lifecycle state machine are persisted.

An unexpected provider transition is returned as an error instead of being
silently accepted.

## Deliberate boundary

This is still not the production VM scheduler. The provider remains an
adapter behind `SandboxProvider`; the next production stages can replace the
modelled provider with a VM/microVM runtime without changing the learning
engine or client contract.

### Runtime reconciliation and worker heartbeats

Long-running provider lifecycle jobs renew their queue lease periodically while
execution is in progress. A lost heartbeat is treated as lost job ownership;
the worker does not report the operation as successfully completed.

Schedulers may enqueue a low-priority `RECONCILE` job for an existing lab
instance. The durable queue rejects duplicate active work for the same
instance, so reconciliation cannot race a lifecycle mutation through the job
queue. The provider remains the runtime source of truth; reconciliation only
projects an observed provider state into the durable control plane.
