# V45 — Secure Multi-Tenant Lab Isolation

V45 establishes the security boundary around every learner lab. V44 owns lifecycle intent; V45 owns tenant/runtime identity, authorization, isolation verification, terminal binding, network/filesystem policy enforcement, quarantine, and cleanup invariants.

## Security invariant

For any authenticated learner A and unauthorized lab B, A must not be able to read, modify, operate, attach to, access the runtime, terminal, filesystem, network, or secrets belonging to B, even when B's identifiers are known.

## Boundary

Browser → authenticated server → lab authorization → isolation policy → authenticated runtime → isolated filesystem/process/network/terminal.

The browser never receives runtime credentials and never connects directly to a runtime.

## Runtime identity

Runtime identity is distinct from learner, lab, operation, and terminal identifiers. Every binding carries a monotonically scoped binding generation. Recreated runtimes receive a new generation so stale credentials/sessions cannot be reused.

## Isolation

- filesystem isolation is a runtime boundary; path validation is defense in depth
- processes are scoped to the runtime; host/other-lab processes are denied
- inter-lab, control-plane, and host networking are denied by default
- egress requires an explicit allowlist
- host filesystem, host processes, device passthrough, nested virtualization, metadata access, and privilege escalation are denied
- resource limits remain V44 policy and are bound to the lab/runtime
- terminal sessions are bound to learner + lab + runtime + binding generation

## Verification and quarantine

Every isolation component must be PASS. FAIL and UNKNOWN both prevent active use; a non-PASS runtime is quarantined until a later authoritative verification proves the boundary safe.

## Cleanup

Destroy/revoke flows must invalidate runtime identity, credentials, terminal binding, network attachment, filesystem binding, and resource allocation. A destroyed lab cannot remain usable through a stale runtime or session.

## Database

`lab_runtime_identities`, `lab_runtime_credentials`, `lab_isolation_verifications`, and `lab_network_policies` are service-role controlled except for a learner's own non-secret verification/policy projections.

## Authority preservation

V35 next activity, V36 mastery/progression, V41 teaching, verifier correctness, and V44 lifecycle control remain authoritative for their responsibilities. V45 does not execute commands or grant learning outcomes.
