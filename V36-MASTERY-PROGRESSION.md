# LinuxForge Core V36 — Mastery & Progression Engine

V36 turns the learner evidence accumulated in V30–V35 into a deterministic mastery gate and progression decision.

## Responsibilities

- classify each skill as `NOT_STARTED`, `LEARNING`, `DEVELOPING`, `FUNCTIONAL`, `FRAGILE`, or `MASTERED`;
- require multiple independent evidence dimensions before declaring mastery;
- detect fragile/decayed capability and route it to review;
- request a distinct mastery-confirmation activity for near-mastery learners;
- expose explicit prerequisite gates for controlled advancement;
- keep safety remediation ahead of progression;
- feed the V35 adaptive training engine without allowing AI to override the progression gate.

## Mastery gate

A skill reaches `MASTERED` only when the persisted evidence satisfies all of the following:

- mastery >= 80
- confidence >= 70
- retention >= 70
- independence >= 65
- success rate >= 75%
- recent score >= 80
- at least 3 evidence points
- no recent conceptual, unsafe, random-trial, or skill-bypass evidence

A typo or wrong-path mistake alone does not erase mastery.

## Progression actions

- `REMEDIATE` — safety evidence requires controlled repair.
- `REVIEW` — retention/review evidence is fragile or due.
- `CONFIRM_MASTERY` — learner is near mastery but needs a distinct confirmation task.
- `PRACTICE` — more evidence is required.
- `ADVANCE` — target skill passed the full mastery gate and prerequisite gates permit progression.

## Architecture

```text
Mission
  -> Verifier
  -> Assessment / Evidence
  -> Persisted Learner Model
  -> V36 Mastery Engine
  -> Progression Gate
  -> V35 Adaptive Training
  -> V34 Question Intelligence
  -> V33 Quality Gate
  -> Isolated Lab
```

The verifier remains the authority for task correctness. V36 does not change grades, XP, lab control, or security policy.
