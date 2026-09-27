# LinuxForge Lab Control Plane v14

## Runtime supervision

v14 adds a provider-neutral runtime supervisor. A supervisor tick:

1. recovers expired worker leases;
2. asks PostgreSQL for stale/expired lab instances that have no active job;
3. queues `EXPIRE` for expired instances;
4. queues low-priority `RECONCILE` work for stale but unexpired instances.

The supervisor never invokes a provider directly. Workers continue to own queue leases and dispatch typed lifecycle jobs through the existing orchestrator/dispatcher boundary.

PostgreSQL remains the concurrency authority through the existing one-active-job-per-instance unique index and the new atomic supervision/enqueue RPCs.

## v15 handoff

v15 adds an explicit runtime launch/admission contract and runtime health boundary. Production configurations must use HTTPS, a VM/microVM runtime class, and an immutable image digest. The existing Docker+PRoot runtime is explicitly development-only and refuses production mode.
