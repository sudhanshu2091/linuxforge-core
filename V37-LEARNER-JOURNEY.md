# LinuxForge Core V37 — Learner Journey / Curriculum Orchestrator

V37 turns the deterministic evidence engines from V30–V36 into one rebuildable long-term learner journey.

## Responsibility boundary

- **V30 Learner Intelligence** observes learner capability and patterns.
- **V31 Knowledge** supplies grounded knowledge and persistent evidence.
- **V32 Mission Planner** chooses the kind of mission to generate.
- **V33 Quality Gate + Verifier** protect executable correctness.
- **V34 Question Intelligence** supplies external question/challenge patterns.
- **V35 Adaptive Training** chooses the immediate learning activity.
- **V36 Mastery + Progression** decides whether a skill has actually crossed its deterministic gates.
- **V37 Journey Orchestrator** connects those decisions into a coherent curriculum path.

V37 does not become a second progression authority. It rebuilds journey state from persisted learner skill evidence and V36 gates.

## Journey state

The orchestrator derives:

- current curriculum phase;
- phase progress;
- mastered skills;
- fragile/review skills;
- prerequisite-blocked skills;
- prerequisite-eligible skills;
- next skills exposed after V36 advancement;
- curriculum milestones;
- current recommended action/mode;
- the immediate V35 target when one exists.

## Current curriculum graph

```text
Linux Foundations
  filesystem
  permissions
       |
       +--> Shell Operator
              iteration
              shell-scripting
                    |
                    +--> System Operator
                           processes

filesystem --> Network Operator
                networking

filesystem + permissions + networking --> Security Operator
                                           hardening
```

This is the current deterministic graph, not the final cybersecurity curriculum. The architecture is intentionally extensible for later Kali, web security, enumeration, exploitation, privilege escalation, AD, CTF and professional assessment skills.

## Key rule

A skill is not "unlocked" merely because V37 lists it. It becomes journey-eligible only when every V36 prerequisite is mastered. V37 never grants mastery, XP, mission completion, lab access, or security permissions.

## Rebuildability

No duplicate learner-state source of truth is introduced. The journey can be reconstructed from the persistent learner skill memory plus the deterministic V36 mastery/progression rules. This keeps recovery and future schema changes safer.
