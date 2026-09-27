# V39 — Curriculum Content Engine

## Purpose

V38 defines the structural curriculum graph. V39 supplies the educational representations attached to that graph.

V39 is deterministic and reusable. It does **not** grant mastery, change grades, unlock progression, control labs, or override security boundaries.

## Content representations

A curriculum skill can produce:

- explanation
- example
- demonstration
- exercise
- challenge
- hint
- remediation
- review
- variation
- prerequisite explanation
- assessment material
- lab guidance

The same skill can therefore be taught, practiced, reviewed, diagnosed, and transferred without turning the curriculum into a static question list.

## Grounding and provenance

V39 uses the existing V31 knowledge corpus and can incorporate V34 question-pattern research. External question text is not copied into the content engine. Source identity and research-pattern references are retained as provenance.

Content has one of two origins:

- `original` — LinuxForge-authored instructional representation with no retrieved grounding.
- `source_grounded` — original LinuxForge instructional representation informed by trusted source material/patterns.

This keeps source-derived research distinguishable from generated instructional copy.

## Architecture

```text
V38 Curriculum Knowledge Graph
            +
V31 Knowledge Corpus / Retrieval
            +
V34 Question Intelligence Patterns
            ↓
     V39 Content Engine
            ↓
Explanation / Example / Demo
Exercise / Challenge / Hint
Remediation / Review / Variation
Prerequisite / Assessment / Lab
            ↓
V35 Adaptive Training / V37 Journey
```

V39 is a content provider. V35 remains responsible for deciding the next training mode, and V36 remains authoritative for mastery/progression.

## Safety

Security-oriented content is framed around authorized isolated training environments. V39 does not grant permission to act on real targets and does not control the lab runtime.
