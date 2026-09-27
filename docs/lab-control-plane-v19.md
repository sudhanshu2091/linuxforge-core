# LinuxForge v19 — Runtime Service HTTP Gateway

v19 turns the v18 authenticated runtime protocol into a concrete HTTP gateway.

## Boundary

```text
Lab Control Plane
    -> signed Runtime Service HTTP request
    -> RuntimeServiceGateway
    -> RuntimeServiceGatewayAdapter
    -> VM / microVM runtime implementation
```

The gateway is still hypervisor-neutral. It owns authentication, request-size limits, node binding, nonce replay protection, idempotency lookup, operation lifecycle routing and safe reconciliation. It does not execute hypervisor commands itself.

## HTTP surface

- `GET /v1/health`
- `POST /v1/operations`
- `GET /v1/operations/:operationId`
- `POST /v1/operations/:operationId`
- `POST /v1/operations/:operationId/reconcile`

Every request is authenticated with the v18 HMAC envelope and a single-use nonce. The exact HTTP path and body remain part of the signed message, so changing either invalidates the signature.

## Safety properties

- Runtime node identity is bound before dispatch.
- Request bodies are capped at 64 KiB.
- Idempotency keys are bound to operation identity.
- Replayed nonces are rejected.
- Runtime execution is behind an explicit adapter interface.
- UNKNOWN operations remain UNKNOWN unless fresh observed state proves the requested outcome.
- The gateway never treats AI output as a security boundary.

The in-memory store/nonce implementation is deterministic test infrastructure. Production persistence remains the PostgreSQL runtime-infrastructure service boundary established in v17/v18.
