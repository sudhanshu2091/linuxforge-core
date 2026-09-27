# LinuxForge Lab Control Plane v12

v12 hardens the durable job queue and makes cancellation semantics explicit.

- A lab instance can have at most one `QUEUED` or `RUNNING` lifecycle job.
- Learner cancellation is limited to queued jobs.
- Running jobs are not marked cancelled while a worker may still be executing a provider operation.
- The persistent cancellation RPC is service-role only.
- Worker execution, leases, and provider selection remain unchanged.

The partial unique index is the database-level concurrency guard; application checks are only a fast-path.
