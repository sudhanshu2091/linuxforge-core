# LinuxForge Lab Control Plane v11

v11 moves the lab job queue from an application-only abstraction toward a durable control-plane boundary.

## Durable queue

`public.lab_jobs` is the persistent source of truth for lifecycle jobs. PostgreSQL RPCs perform claim, heartbeat, completion, failure/retry, and expired-lease recovery atomically. `FOR UPDATE SKIP LOCKED` allows multiple workers to claim different jobs without blocking one another.

The queue-management RPCs are internal worker operations and are granted to `service_role` only. Learner-facing authenticated clients must never be allowed to claim or complete arbitrary jobs across users.

## Worker composition

`createLabJobCoordinator()` composes:

1. durable `LabJobStore`
2. `LabWorker`
3. an injected lifecycle executor

The executor remains responsible for calling the existing typed Lab Orchestrator dispatcher. The worker never accepts shell text and never selects a provider.

## Production migration path

The next infrastructure step is a real worker process that periodically:

- recovers expired jobs;
- claims work;
- heartbeats long-running operations;
- dispatches through the Lab Orchestrator;
- completes or retries the job;
- exits cleanly on shutdown.

The current in-memory store remains useful for deterministic tests; the Supabase store is the durable queue adapter.
