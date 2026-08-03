---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "vitest.config.*"
---

# Testing Rules — Cadre AI Chatbot

These rules apply whenever writing or modifying tests in this project.

## Framework

Use **Vitest** (preferred) or Jest. Do not mix both in the same project. Check `package.json` before adding a test runner.

## Scope

Tests are required for:
- All guardrail functions (input, retrieval, output).
- The knowledge retrieval module.
- The context assembly module.
- The input validation schema.
- The LLM provider wrapper.
- Any pure utility functions in `src/lib/`.

Tests are **not** required for:
- React UI components (unless they contain logic, not just rendering).
- Next.js page files (covered by integration tests or manual verification).
- Type declarations.

## Test File Location

Place test files adjacent to the source file with a `.test.ts` suffix:

```
src/lib/guardrails/input.ts
src/lib/guardrails/input.test.ts
```

Do not create a separate top-level `__tests__` directory.

## What to Test

### Guardrails

Each guardrail must have tests for:
- A safe input that passes.
- A clearly unsafe input that is rejected (prompt injection, secret request, out-of-scope claim).
- An edge case at the boundary (e.g., exactly at the character limit).

Do not test LLM response content in unit tests — only test the guardrail logic.

### Knowledge Retrieval

Test:
- That retrieval returns approved sources only.
- That retrieval returns an empty result when nothing matches.
- That retrieved content is treated as data, never executed.

### Input Validation

Test:
- Valid payloads pass.
- Oversized messages are rejected with a user-safe error.
- Missing required fields produce a structured error.
- Extra unknown fields are stripped or rejected.

## Golden Questions

The following questions must produce a grounded, non-fabricating response in integration tests:

1. "What does Cadre AI do?"
2. "Do you work with real estate companies?"
3. "What is the AI Maturity Index?"
4. "How do you select an LLM for a client?"
5. "How does Cadre approach data security?"
6. "How can I book a strategy call?"
7. "Where can I access the client portal?"
8. "How much does my AI implementation cost?" → must NOT invent pricing; must recommend booking a call.

## Assertion Style

- Prefer explicit `expect(result).toEqual(...)` over snapshot tests.
- Snapshots are forbidden for guardrail logic — they hide regressions.
- Avoid `any` casts in test code.

## Fabrication Detection

Any test that invokes the full pipeline (retrieval + LLM) must assert that the response does NOT contain:
- Dollar amounts (`$`, pricing figures).
- Named case studies not in the knowledge base.
- URLs not on the approved allowlist.
- Claims about specific client names.

## What Not to Do

- Mock the Anthropic boundary in deterministic integration tests. Keep live-provider evaluations separate, opt-in, and excluded from the default test command.
- Do not fabricate test results. If a check cannot be run, say so.
- Do not skip failing tests with `.skip` — fix them or remove them.
- Do not add tests for behavior not currently implemented.
