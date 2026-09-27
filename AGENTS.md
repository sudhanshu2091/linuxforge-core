# LinuxForge Core — development rules

LinuxForge is an AI-powered Linux/Kali cybersecurity learning platform. The architecture is intentionally layered:

- Client platform: web/desktop/mobile UI and terminal client.
- Core platform: learner model, curriculum, challenge engine, AI tutor/observer, progression and social systems.
- Lab platform: lab API, orchestrator, provider abstraction, isolated Linux/Kali runtimes and terminal gateway.
- Data platform: PostgreSQL, queues/cache and object storage.
- Security plane: auth, authorization, isolation, policy, audit, secrets and resource limits.
- Optional real-machine platform: a separately installed local companion for controlled host access.

## Non-negotiable boundaries

1. AI is advisory. It is never the security boundary or final deterministic verifier.
2. Learner code executes only inside an explicitly selected sandbox provider.
3. Guest root is acceptable inside an isolated lab; host compromise is never acceptable.
4. RLS and explicit server-side authorization remain enabled. Do not use service-role credentials as a shortcut around learner ownership.
5. Never expose host filesystem, Docker sockets, hypervisor APIs, cloud metadata or infrastructure secrets to a learner lab.
6. Lab Internet egress is deny-by-default and must be enforced outside the guest.
7. Terminal streams are ephemeral transport data. Persist compact command/assessment events, not unbounded terminal transcripts.
8. Generated executable exercises are untrusted AI proposals. Validate them into server-only contracts before persistence/execution.
9. XP is gamification; mastery is competence.
10. Preserve the `SandboxProvider` abstraction so Docker/PRoot prototype code can migrate to VM/microVM infrastructure without rewriting the learning engine.

## Implementation rules

- Prefer small, testable modules over a giant server file.
- Keep database mutations behind server-only persistence functions.
- Add deterministic tests for learner-model calculations, contracts and verification.
- Keep user-facing copy friendly and mentor-like; Hinglish is a supported tutor language.
- Do not add Lovable-specific tooling, telemetry or deployment assumptions.
- Do not add unrestricted offensive automation. Cybersecurity exercises must stay inside explicitly authorized labs/ranges.
