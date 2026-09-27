# LinuxForge Core — V27 AI Tutor Context Layer

V27 adds a bounded mission-aware tutor boundary on top of the locked V26 adaptive learning loop.

## Flow

`MissionState -> learner-safe tutor context -> AI tutor -> learner response`

The tutor receives only mission-relevant learner context. Terminal evidence is redacted before it crosses the AI provider boundary. Internal challenge contracts, hidden verification rules, provider configuration and raw database rows are not included.

The deterministic verifier, assessment engine, learner model and lab security boundaries remain authoritative. AI coaching cannot change grades, XP, unlock state or lab policy.
