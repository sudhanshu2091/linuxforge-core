# V38 — Curriculum Knowledge Graph

## Purpose

V38 introduces a deterministic structural knowledge graph for LinuxForge's curriculum. It describes the relationship between the Linux domain, curriculum phases, existing learner skills, prerequisites, and teachable concepts.

## Authority boundaries

- **V38 graph:** curriculum structure and relationships.
- **V36 Mastery Engine:** mastery state and progression gates remain authoritative.
- **V37 Journey:** long-term learner journey orchestration.
- **V35 Adaptive Training:** immediate training activity selection.
- **AI:** can use the graph as context, but cannot mutate its authority or grant progression.

The graph derives prerequisite edges from the existing V36 `PREREQUISITES` map. This intentionally avoids creating a second prerequisite policy.

## Graph layers

```text
Linux domain
  ↓
Curriculum phase
  ↓
Skill
  ↓
Concept
```

Skill-to-skill prerequisite edges connect the learning sequence. Skill-to-concept edges describe what a learner should understand within a skill.

## Current structural coverage

- Linux Foundations → filesystem, permissions
- Shell Operator → iteration, shell-scripting
- System Operator → processes
- Network Operator → networking
- Security Operator → hardening

The concept layer currently covers paths, files/directories, ownership, rwx permissions, loops, shell scripts, process model, networking basics, and service hardening.

## Design rule

V38 is intentionally a **structural graph**, not a content dump. V39 will build the richer curriculum content layer on top of this structure.
