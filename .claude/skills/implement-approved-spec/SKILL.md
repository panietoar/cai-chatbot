---
name: implement-approved-spec
description: Implement one approved Cadre chatbot spec, add deterministic tests, run lint, typecheck, tests, and build, and report deviations and real failures. Use only when the requested spec explicitly has Status APPROVED.
---

# Implement an approved spec

Resolve the requested spec path, then confirm it contains `Status: APPROVED`. If it does not, stop without delegating implementation.

Delegate the approved spec to the `developer` subagent. Include:

- The exact spec path.
- Any explicit user constraints.
- The current risk classification: `mechanical` or `high-capability`.

Classify Anthropic integration, APIs, guardrails, prompts, validation, security, complex typing, and difficult debugging as `high-capability`. The parent may override the developer model accordingly; never force a cheap model for these areas.

After the subagent returns, verify that its report covers every acceptance criterion and all four verification categories. Do not reinterpret failures as success.
