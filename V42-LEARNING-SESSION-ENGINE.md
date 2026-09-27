# V42 — Learning Session Engine

V42 turns LinuxForge's existing learner intelligence into a persistent, explicit learning-session lifecycle.

## Responsibility

V42 is an orchestration layer. It does not become authoritative for:

- mastery or progression (V36)
- adaptive training choice (V35)
- objective grading (verifier / assessment)
- lab lifecycle or execution (Lab Control Plane)
- security policy
- AI/provider behavior (V40/V41)

## Session lifecycle

```text
ORIENT → TEACH → PRACTICE → VERIFY → REFLECT → COMPLETE
             ↑         │          │
             └─────────┴──────────┘
                  pause/resume
```

A session records the coordination state and event history. Verification data is copied as evidence only; the session engine never changes the verifier result or mastery state.

## Inputs

- V35 Training Decision
- V37 Learner Journey
- optional activity/challenge ID
- optional teaching/practice/verification goals

## Guarantees

- deterministic phase transitions
- invalid phase skips are ignored
- pause/resume preserves the current phase
- assessment score is bounded to 0–100 but its status remains verifier-provided
- completion requires reaching the REFLECT → COMPLETE lifecycle
- abandoned sessions cannot be resumed
- event history is append-only within the in-memory session model

## Production persistence

The V42 database migration adds user-owned `learning_sessions` and `learning_session_events` tables with RLS and an index for active-session lookup. Server functions expose start/get/pause/resume/complete/abandon operations. Session persistence stores orchestration state, not hidden verifier rules or provider secrets.
