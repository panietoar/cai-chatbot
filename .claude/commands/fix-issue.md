# Command: fix-issue

Fix a GitHub issue or a reported bug in the Cadre AI chatbot.

## Usage

```
/fix-issue #<issue-number>
/fix-issue "<description of the bug>"
```

## Procedure

### 1. Understand the issue

If given an issue number, read the GitHub issue (title, body, comments).
If given a description, treat it as the full problem statement.

Ask yourself:
- What behavior is broken or missing?
- What layer is affected: UI, API route, validation, guardrails, retrieval, LLM provider, output?
- Is this a regression (previously working) or a gap (never implemented)?

### 2. Reproduce before fixing

Locate the test or code path that demonstrates the bug:
- Read the relevant source files in full.
- Find or write a minimal failing test that captures the broken behavior.
- Confirm the test fails before making any code change.

### 3. Identify the root cause

Do not guess. Trace the actual execution path:
- Read the guardrail that should have caught it (if applicable).
- Check the validation schema for the relevant boundary.
- Check the retrieval logic for the relevant knowledge topic.

### 4. Fix — minimal scope only

Apply the smallest coherent change that resolves the reported behavior:
- Do not refactor unrelated code.
- Do not add features not mentioned in the issue.
- Do not change tests unless the fix requires it.
- Do not change the system prompt unless the bug is specifically about prompt behavior.

### 5. Verify

Run in order:
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All checks must pass. Do not skip or silence failures.

### 6. Report

Summarize:
- Root cause (one sentence).
- Files changed (list with line ranges).
- Test added or updated (if any).
- Verification result (all checks pass / specific failures with status).

Suggest a commit message:
```
fix: <concise description of what was broken and how it was fixed>
```

## Constraints

- Do not add authentication, CRM, or vector DB infrastructure.
- Do not change `plan.md` scope.
- Do not push to remote — the developer reviews and commits manually.
