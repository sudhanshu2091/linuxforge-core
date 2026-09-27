# LinuxForge Core V33 — Advanced Evidence-Based Assessment

V33 strengthens the learning loop without changing the authority boundaries.

## 1. Generated-exercise quality gate

AI-generated exercises are proposals. Before persistence or launch, the server validates:

- title, scenario and objective bounds
- supported skill IDs
- approved source references
- executable vs conceptual exercise shape
- safe relative objective paths
- supported command kinds for the current lab
- permission format and mutation limits
- blueprint skill/difficulty alignment
- basic novelty against recent topics

Invalid provider output falls back to the deterministic safe generator.

## 2. Persistent generated learning content

Questions and mock exams are now persisted as learner-owned generated content even when they are not executable. Task/mission content additionally receives a server-only executable contract.

## 3. Evidence-quality assessment

The verifier remains the final authority for grade and status. V33 adds separate deterministic signals for:

- method evidence
- recovery from failed commands
- independence signal
- clean execution

These signals describe evidence quality and never modify the verifier score.

## 4. End-to-end boundary

Learner evidence → learner intelligence → V32 mission blueprint → AI proposal → V33 quality gate → persisted content / executable contract → deterministic verifier → evidence-quality assessment → adaptive plan.
