---
name: security-review
description: Review Cadre chatbot code for OWASP risks, prompt injection, secret exposure, unsafe links, and AI pipeline data safety.
---

# Security Review Skill

## Trigger

Invoke this skill with `/security-review` or when asked to review a file or PR for security issues.

## Purpose

Perform a targeted security review of the Cadre AI chatbot codebase, focused on the OWASP Top 10, prompt injection risks, secret exposure, and data safety in AI pipelines.

## Instructions

When invoked, load `checklist.md` from this directory, then execute the following procedure:

### Step 1 — Scope the review

Ask (or infer) what is being reviewed:
- A single file
- A module (e.g., guardrails, retrieval, API route)
- A full diff / PR
- The entire `src/` directory

### Step 2 — Read all relevant files

For each file in scope, read its full contents before drawing any conclusions. Do not rely on summaries.

Also read:
- `src/app/api/chat/route.ts` (main attack surface)
- `src/lib/guardrails/` (all files)
- `src/lib/prompts/` (system prompt construction)
- `src/lib/knowledge/` (data loading and retrieval)
- `.env.example` (check for accidental secret values)

### Step 3 — Apply the checklist

Work through every item in `checklist.md`. For each item:
- Mark it PASS, FAIL, or N/A.
- For FAILs: quote the exact vulnerable line, explain the risk, and propose a concrete fix.

### Step 4 — Prioritize findings

Group findings by severity:
- **Critical** — exploitable in production, must block deployment.
- **High** — significant risk, fix before launch.
- **Medium** — meaningful exposure, fix in current phase.
- **Low** — hardening opportunities.
- **Info** — observations with no direct risk.

### Step 5 — Report

Produce a structured report:

```
## Security Review: [scope]
Date: [today]

### Critical
[findings or "None"]

### High
[findings or "None"]

### Medium
[findings or "None"]

### Low / Info
[findings or "None"]

### Summary
[1-3 sentence summary. State the overall posture.]
```

## Constraints

- Do not suggest adding authentication, CRM, or vector DB infrastructure.
- Do not suggest architectural changes outside the current plan phase.
- Only flag real risks — do not pad the report with theoretical non-issues.
- If no issues are found, state "No issues found" clearly. Do not invent findings.
