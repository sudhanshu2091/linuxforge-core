# V46 — Advanced Cybersecurity Lab Ecosystem

V46 extends the V44 production Lab Control Plane and V45 multi-tenant isolation boundary with a deterministic cyber-lab ecosystem model.

## Included
- Scenario kinds: Kali workstation, web security, network enumeration, system security, privilege escalation, Active Directory, CTF, and multi-machine pentesting.
- Explicit lab topology containing networks and isolated nodes.
- Attacker/target/server/domain-controller/client roles and OS/image metadata.
- Bounded exposed services/ports and learner capabilities.
- Network-aware node connectivity checks.
- Lab ownership checks before node access.
- Scenario lifecycle gating: only READY/ACTIVE scenarios accept learner activity; QUARANTINED/DESTROYED scenarios do not.
- Deterministic topology validation and safe defaults.

## Authority boundaries
V44 remains authoritative for lab lifecycle operations. V45 remains authoritative for tenant isolation, runtime identity, terminal binding, network policy and quarantine. V46 describes the cybersecurity workload topology and capabilities; it does not bypass either security boundary and does not execute commands itself.

## Runtime integration
The scenario model is provider-neutral. A future production runtime adapter can materialize the declared topology into isolated VM/microVM/container infrastructure without changing learner, verifier, mastery, progression, or teaching contracts.
