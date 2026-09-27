# LinuxForge v21 — Terminal Session Protocol

v21 accelerates the product-facing terminal path without changing the locked
runtime architecture. It introduces a provider-neutral terminal-session
protocol that can be used by the current server-function terminal and by the
future authenticated WebSocket/PTY gateway.

## Boundary

```text
Learner Terminal UI
      -> authenticated terminal session boundary
      -> Terminal Session Protocol
      -> Runtime/PTY Gateway (future)
      -> Runtime Service Gateway
      -> VM / microVM
```

## Session contract

- Session identity is explicit and separate from environment identity.
- Sessions are `CREATED -> ATTACHED -> CLOSED` and cannot emit input/events after closure.
- Every terminal event carries a session id and monotonically increasing sequence.
- Event payloads are bounded before persistence or transport.
- Event logs are bounded so a runaway terminal cannot create unbounded memory use.
- Shell identity remains constrained to the canonical LinuxForge shell contract.
- The protocol contains no host paths, credentials, provider-specific APIs, or hypervisor details.

## Why this is v21

The current terminal already works through the authenticated lab execution
boundary. v21 gives that terminal a stable session/event contract now, so the
UI does not need to be redesigned when the production PTY gateway is introduced.
The production implementation can replace the in-memory/session transport
adapter with durable storage and authenticated WebSocket/WebTransport without
changing the learner-facing learning, assessment, observer, or progression
layers.
