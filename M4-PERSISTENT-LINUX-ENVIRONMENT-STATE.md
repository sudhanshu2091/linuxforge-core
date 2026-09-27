# LinuxForge Core — M4 Persistent Linux Environment State

M4 establishes durable learner-environment state above the M1 identity/isolation and M2 runtime lifecycle layers, while M3 remains responsible for learner-facing lab and terminal control.

## Core invariant

`environment_id` is the canonical persistent learner-environment identity. `runtime_id` is an ephemeral runtime identity. STOP/START and runtime replacement preserve the environment; DESTROY creates a tombstone and cannot be followed by resurrection of the same environment identity.

## Persistent state

The real Kali provider's qcow2 disk is the durable learner artifact. Files, directories, permissions, ownership, installed packages and learner configuration survive a normal STOP → START and RESTART cycle. QEMU process identity, PID, PTY, terminal ticket and active process state remain ephemeral.

## Lifecycle

`PROVISIONING → READY → ACTIVE → STOPPING → STOPPED` with explicit `FAILED`, `QUARANTINED`, `DESTROYING`, and terminal `DESTROYED` states.

A destroyed environment is a tombstone. The control plane must allocate a new `environment_id` rather than recreating a destroyed environment.

## Integrity

The QEMU provider exposes a persistence inspection endpoint. It performs a cheap structural fingerprint using `qemu-img info` and disk metadata rather than hashing multi-gigabyte learner disks on every lifecycle request. A future deep verifier can perform expensive content validation explicitly.

## Database

`lab_environment_state` stores durable lifecycle, generation, artifact and integrity state. `lab_environment_events` stores learner-scoped lifecycle events. Existing `lab_instances.environment_id` remains the canonical environment identifier for backward compatibility with M1–M3.

## Scope

M4 does not implement semantic exercise verification, mission branching, learner mastery, AI tutoring or production fleet scaling. Those remain M5–M12 responsibilities.
