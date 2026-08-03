---
name: review-spec-change
description: Review the current Cadre chatbot diff against an approved spec, classify functional, security, scope, dependency, maintainability, and testing findings by severity, and propose concrete fixes without editing code. Use after implementation or before merge.
---

# Review a spec change

Delegate the review to the `code-reviewer` subagent with the exact approved spec path and diff scope. If the spec is unavailable, require the reviewer to say that scope compliance is only partially verifiable.

Require evidence-based findings covering:

- Functional correctness and acceptance criteria.
- Security, secret exposure, input and output validation.
- Scope deviations and architectural contradictions.
- Redundant logic, unnecessary dependencies, dead code, coupling, and maintainability.
- Missing or inadequate tests and unverified behavior.

Each finding must include severity, file and line, impact, and a concrete correction. The reviewer must not edit code unless the user explicitly authorizes a follow-up implementation task.
