# LinuxForge Core V35 — Adaptive Training Engine

V35 connects the learner intelligence, evidence, external question intelligence and mission planner through a deterministic training decision layer.

## Decision flow

Learner evidence → learner intelligence → V35 Training Decision → V32 Mission Blueprint → V34 Question Intelligence → exercise generation → V33 quality gate → lab → verifier/assessment → learner update.

The V35 decision engine selects a learning mode, target skill, supporting skills, difficulty and source-pattern strategy. AI generation remains downstream and cannot alter verifier authority, XP, progression or lab/security controls.

## Learning modes

- REMEDIATION — repair weak, misunderstood or unsafe execution.
- GUIDED_PRACTICE — focused practice when evidence is limited or dependence is high.
- SPACED_REVIEW — retrieve skills whose review window is due.
- TRANSFER — apply an established skill in a new context.
- PROGRESSION — controlled complexity increase after strong independent evidence.
- ASSESSMENT — gather clean evidence when the learner state is not sufficiently observed.

## Safety and boundaries

V35 does not grant progression, alter verifier grades, control labs, or bypass the V33 quality gate. It produces a deterministic training decision that becomes planning input. External sources remain research material and are not copied into learner exercises.
