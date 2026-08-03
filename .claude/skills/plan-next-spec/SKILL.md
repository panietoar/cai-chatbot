---
name: plan-next-spec
description: Choose the next incomplete Cadre chatbot MVP slice and create a bounded spec with tasks, acceptance criteria, tests, verification, contradictions, and pending decisions. Use before implementation or when asked what to build next.
---

# Plan the next spec

Delegate this work to the `po-spec` subagent. Pass any user-supplied phase, priority, constraint, or requested output path unchanged.

Require the subagent to:

1. Ground its choice in the repository, `CLAUDE.md`, and `plan.md`.
2. Produce only one bounded story.
3. Use the spec format defined in `.claude/agents/po-spec.md`.
4. Leave the status as `DRAFT` until the user explicitly approves it.
5. Return contradictions and decisions separately from executable tasks.

Do not implement the draft. End by requesting approval or the smallest material decision needed to make it implementable.
