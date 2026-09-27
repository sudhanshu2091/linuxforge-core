# LinuxForge Core V34 — Internet-Connected Question Intelligence

V34 adds the missing external question/challenge research layer on top of the locked V33 architecture.

## Flow

Trusted sources → approved HTTPS fetch → normalization/extraction → question analysis → reusable patterns → learner model + V32 mission planner → original exercise generation → V33 quality gate → verifier.

## Important boundaries

- External questions are **research material**, not learner-facing templates.
- LinuxForge stores provenance for analyzed source material.
- Direct source-question reuse is disabled in the source registry.
- Source content is reduced to bounded metadata/patterns before it is given to the generator.
- One unavailable source never blocks generation; research failures degrade to the existing V33 generator/fallback.
- Only approved HTTPS hosts are fetchable through a registered source.
- V33 verifier/quality gate remains authoritative.

## Environment

`FORGE_ENABLE_QUESTION_RESEARCH=false` disables live external research while retaining the V34 registry and analysis layer. It defaults to enabled when an AI provider is configured.

## Initial trusted registry

- Kali Training
- OverTheWire
- Linux Journey (currently maintained at LabEx; CC BY-SA 4.0)
- picoCTF
- PortSwigger Web Security Academy
- MITRE ATT&CK
- Nmap Reference Guide

The registry records trust level, allowed use, provenance requirements, attribution/license metadata where known, and approved seed URLs.
