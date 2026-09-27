# V43 — Dynamic Teaching Engine

## Purpose
V43 decides **how LinuxForge should teach** inside a V42 learning session. V35 decides what learning activity should come next; V36 owns mastery/progression; V41 owns grounded learner-facing teaching; V42 owns the persistent session lifecycle.

V43 adds a deterministic teaching-orchestration layer that adapts:
- teaching strategy
- pacing/depth
- hint policy
- content mix
- bounded teaching brief
- mistake focus

## Pipeline

```text
V35 Training Decision
        ↓
V36 Mastery / Progression
        ↓
V37 Learner Journey
        ↓
V42 Learning Session
        ↓
V43 Dynamic Teaching Decision
        ↓
V39 Curriculum Content + V41 Grounded Teaching
        ↓
Learner-facing instruction
```

## Strategies

- `ORIENT` — establish the session goal and context.
- `EXPLAIN` — build a clear conceptual foundation.
- `REMEDIATE` — repair a concept or repeated mistake before adding complexity.
- `DEMONSTRATE` — show a bounded example or demonstration before practice.
- `GUIDED_DISCOVERY` — keep the learner doing the reasoning while guidance is available.
- `TRANSFER_COACH` — preserve the target concept while changing the scenario.
- `ASSESSMENT_COACH` — explain evidence requirements without exposing the expected solution.
- `REFLECT` — consolidate learning and identify the next independent behavior.

## Adaptation inputs

V43 consumes only bounded learner/session evidence:
- V42 session phase and plan
- V35 learning mode
- readiness
- confidence
- independence
- hint dependency
- learner signals
- repeated/dominant mistake categories
- V39 content candidates

## Authority boundaries

V43 does **not**:
- assign grades
- change verifier results
- grant mastery
- advance curriculum progression
- modify learner records
- start/stop/control labs
- bypass security
- expose provider configuration or secrets
- reveal hidden challenge solutions

V43 is an orchestration layer, not an authority layer.
