# LinuxForge v20 — Durable Runtime Service Gateway

v20 closes the production-persistence gap left by the v19 HTTP gateway.

## Boundary

```text
Lab Control Plane
    -> signed Runtime Service HTTP request
    -> RuntimeServiceGateway
    -> durable PostgreSQL Runtime Service store / nonce store
    -> RuntimeServiceGatewayAdapter
    -> VM / microVM runtime implementation
```

The HTTP gateway remains hypervisor-neutral. Production operation and replay state now crosses the durable PostgreSQL service-role boundary instead of depending on process memory.

## Durable state

- Runtime operations use the existing `runtime_operations` table and v17 RPCs.
- Request nonces use the v18 `runtime_request_nonces` table and `claim_runtime_request_nonce` RPC.
- UNKNOWN -> SUCCEEDED reconciliation uses the new `reconcile_runtime_operation` RPC and is only called after the existing deterministic observation proof succeeds.
- In-memory stores remain deterministic test infrastructure.

## Gateway lifecycle

1. Authenticate the signed request.
2. Atomically claim the nonce.
3. Create or retrieve the durable idempotent operation.
4. Claim execution with a durable operation lease.
5. Execute only through the runtime adapter.
6. Finish the durable operation as SUCCEEDED/FAILED.
7. For UNKNOWN operations, require matching observed runtime proof before durable reconciliation.

## Safety properties

- No client-facing code receives service-role access.
- No direct hypervisor API is exposed through Core.
- Operation leases survive gateway process restarts.
- Replay protection survives gateway process restarts.
- Idempotency survives gateway process restarts.
- UNKNOWN operations cannot be marked successful without the existing observation proof.
- The gateway never treats AI output as a security boundary.
