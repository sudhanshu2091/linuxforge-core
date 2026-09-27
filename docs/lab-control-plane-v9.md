# LinuxForge v9 — worker dispatch boundary

The scheduler now has a provider-neutral worker execution boundary. A worker claims a typed lifecycle job, dispatches it through an injected executor, and records success/failure only when the same worker still owns the job lease.

The server-side `dispatchLabJob` adapter is the single mapping from lifecycle job kinds to authenticated lab operations. It does not accept shell commands or provider identifiers from the learner.
