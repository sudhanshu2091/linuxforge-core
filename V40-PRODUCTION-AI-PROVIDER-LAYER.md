# V40 — Production AI Provider Layer

## Purpose

V40 establishes the production boundary between LinuxForge's deterministic application logic and external AI model providers.

The application no longer owns HTTP transport, retry behavior, timeouts, provider response parsing, or provider-specific configuration inside individual AI features.

## Provider boundary

```text
LinuxForge AI feature
        ↓
Provider Gateway
        ↓
Provider abstraction
        ↓
OpenAI-compatible provider
        ↓
External model API
```

The provider abstraction is intentionally vendor-neutral at the application boundary. The first transport is an OpenAI-compatible chat-completions provider, configured through server-only environment variables.

## Configuration

Required:

- `FORGE_AI_API_KEY`
- `FORGE_AI_MODEL`

Optional:

- `FORGE_AI_PROVIDER` — currently `openai-compatible`
- `FORGE_AI_BASE_URL` — defaults to `https://api.openai.com/v1`
- `FORGE_AI_TIMEOUT_MS` — defaults to 20 seconds, bounded to 120 seconds
- `FORGE_AI_MAX_RETRIES` — defaults to 2, bounded to 5
- `FORGE_AI_TEMPERATURE` — defaults to 0.2, bounded to 0–2

Non-local provider endpoints must use HTTPS. HTTP is accepted only for localhost development endpoints.

## Reliability

The gateway provides:

- request timeouts
- bounded retries
- exponential retry delay
- retry handling for transient HTTP failures (`408`, `409`, `425`, `429`, `5xx`)
- no retry for ordinary `4xx` errors
- empty-response validation
- normalized usage metadata
- provider request ID capture
- latency and attempt metadata

Provider failures remain failures; deterministic callers may decide whether a local fallback is appropriate. The gateway itself never fabricates an AI response.

## Security

API keys remain server-side and are sent only as authorization headers. They are not included in request bodies or normalized response objects.

The provider layer does not expose:

- infrastructure secrets
- hidden verifier rules
- internal contracts
- provider configuration to learners

AI context boundaries remain enforced by the existing tutor-context and application layers.

## Architectural authority

V40 does not change any authoritative subsystem:

- Verifier remains authoritative for correctness.
- V36 remains authoritative for mastery/progression.
- V35 remains authoritative for adaptive training decisions.
- Lab Control Plane remains authoritative for lab lifecycle.
- Security Plane remains authoritative for authorization/isolation.

The provider can generate explanations, evaluations, and proposals, but cannot grant progress, change grades, unlock content, control labs, or override security.

## Existing integrations

`provider.server.ts` keeps the existing `tutorReply`, `evaluateAttempt`, and `generateAdaptiveExercise` APIs while routing model calls through the V40 gateway. This preserves V27–V39 feature contracts while replacing the direct HTTP implementation underneath them.
