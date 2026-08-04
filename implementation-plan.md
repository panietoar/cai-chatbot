# Cadre AI Support Chatbot — Incremental Implementation Plan

Status: ACTIVE ROADMAP
Derived from: `plan.md`
Last reviewed: 2026-08-03

## 1. Purpose and authority

This file translates the product and architecture decisions in `plan.md` into small, ordered implementation increments that the PO / Spec Agent can turn into one bounded spec at a time.

Source hierarchy:

1. `plan.md` defines product scope, architecture, trade-offs, and release requirements.
2. `CLAUDE.md` defines repository-wide engineering and Claude Code behavior.
3. `implementation-plan.md` defines delivery order, dependencies, phase gates, and candidate stories.
4. An approved file in `specs/` defines the exact implementation contract for one story.

If this roadmap conflicts with `plan.md`, follow `plan.md` and surface the conflict. Do not silently update either document. Completing a story does not automatically approve the next one.

## 2. Current repository baseline

Observed on 2026-08-03:

- Phase 0 planning artifacts exist: `plan.md`, `CLAUDE.md`, `.gitignore`, and `.env.example`.
- Claude Code includes PO / Spec, Developer, and Code Reviewer agents plus `/spec`, `/develop`, and `/review` commands.
- Deterministic hooks protect secret-bearing files and block selected destructive or out-of-scope commands.
- No application scaffold, `package.json`, source code, automated tests, README, or deployment configuration exists.
- No approved Cadre knowledge corpus or exact approved action URLs exist in the repository.
- No local verification command can be assumed until `package.json` is created.
- No public deployment has been verified.

Therefore, the next implementation work starts with repository decisions and a deployable skeleton, not chat behavior.

## 3. How the PO should use this roadmap

For each `/spec` run:

1. Re-read the current repository rather than trusting the baseline above.
2. Select the earliest incomplete candidate story whose dependencies and decision gates are satisfied.
3. Prefer one story ID per spec. Combine adjacent stories only when neither produces a coherent, independently verifiable result alone.
4. Translate the story into exact files, observable acceptance criteria, tests, and commands based on the repository as it exists then.
5. Keep the spec `DRAFT` until explicitly approved by the user.
6. Record completion evidence in the spec or delivery report; do not mark this roadmap complete based on intent.

The PO may split a candidate story further. It must not expand one into unrelated future-phase work.

## 4. Cross-cutting implementation rules

Every story must preserve these invariants:

- One public, bounded support assistant; no application-level multi-agent orchestration.
- Cadre-specific claims come only from approved local knowledge.
- Unknown or unsupported questions produce a transparent safe fallback.
- Only exact, verified allowlisted URLs may reach users.
- User input, retrieved content, provider output, and configuration are treated as untrusted at their boundaries.
- Secrets, stack traces, internal prompt text, model details, and internal source names never reach the client.
- Provider code remains server-only and behind a dedicated interface.
- No authentication, CRM, live calendar, real portal access, vector database, unrestricted web search, or long-term memory.
- Each implementation story includes proportionate tests and ends with real verification results.

Default full verification after the scaffold defines scripts:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Use the actual package manager and scripts committed by the scaffold story. Do not fabricate missing commands.

## 5. Decision gates

These decisions are intentionally unresolved until supported by evidence or explicit user input.

| Gate | Needed before | Required decision or evidence |
|---|---|---|
| D1 — Package baseline | P1-S1 | Next.js version, package manager, Node version, test runner, and formatting approach selected and recorded by the scaffold spec. Prefer current stable defaults and minimal dependencies. |
| D2 — Deployment ownership | P1-S3 | Vercel project/account access and deployment method are available. Never invent a deployment URL. |
| D3 — Approved knowledge | P3-S1 | Cadre-specific content has a verifiable source or explicit approval. Unsupported details remain absent. |
| D4 — Approved URLs | P3-S1, P4-S3 | Exact strategy-call, contact, and portal destinations are verified. Pattern examples in rules are not approval. |
| D5 — Anthropic model | P4-S1 | A model identifier is selected through configuration based on current availability, latency, cost, and structured-output needs. Do not hardcode a speculative model ID. |
| D6 — Live evaluation access | P6-S2 | A test API key and acceptable spend are explicitly available. Default automated tests must remain deterministic without network access. |

If a gate is unresolved, the PO should select other unblocked work or produce a decision-only spec when the decision itself requires repository evidence.

## 6. Incremental phases and candidate stories

### Phase P0 — Repository readiness

Goal: make the planning repository internally consistent and ready for application work.

#### P0-S1 — Validate and close repository context

Outcome:

- Confirm Claude Code configuration, planning hierarchy, secret exclusions, and working-tree baseline.
- Add a `specs/` location only when the first approved spec is ready to be stored.
- Identify any missing Phase 0 deliverable without creating application code.

Acceptance evidence:

- Shared Claude configuration is discoverable and personal settings remain ignored.
- `plan.md`, `CLAUDE.md`, and this roadmap have no unresolved contradictions.
- Secret scan and configuration syntax checks pass where tooling is available.
- Limitations such as unavailable `claude doctor` are reported honestly.

Dependencies: none.

### Phase P1 — Deployable skeleton

Goal: create the smallest typed Next.js application that can be built and deployed before chat complexity is introduced.

#### P1-S1 — Scaffold the application and quality baseline

Outcome:

- Initialize Next.js with TypeScript, App Router, strict type checking, ESLint, and one selected test runner.
- Define `lint`, `typecheck`, `test`, and `build` scripts.
- Pin the supported Node/package-manager baseline and keep dependencies minimal.

Acceptance evidence:

- A minimal page builds locally.
- All four verification commands exist and pass.
- `.env.example` still contains names only.
- No sample boilerplate, telemetry content, or unused assets remain.

Dependencies: D1.

#### P1-S2 — Add the public shell and health signal

Outcome:

- Replace scaffold content with a minimal Cadre support landing shell.
- Add a lightweight health route only if it materially helps deployment verification.
- Establish global responsive and accessible layout primitives without building the chat interaction.

Acceptance evidence:

- The page identifies the assistant’s purpose and limitation.
- Keyboard focus, semantic landmarks, and mobile layout are manually checked.
- A health route, if added, exposes no configuration or provider details.
- Automated checks pass.

Dependencies: P1-S1.

#### P1-S3 — Establish the first Vercel deployment

Outcome:

- Connect the repository to Vercel and deploy the skeleton.
- Document only the configuration actually required.

Acceptance evidence:

- A real public URL loads the reviewed commit.
- Production build succeeds with no secret committed.
- The URL is verified in a private browser session.
- Any missing runtime configuration fails safely.

Dependencies: P1-S2, D2.

### Phase P2 — Deterministic chat contract

Goal: define and test the application boundary before connecting retrieval or a model.

#### P2-S1 — Define shared chat types and runtime validation

Outcome:

- Define request, success, and error contracts.
- Validate message shape, empty input, 2,000-character maximum, unknown fields, and at most 10 history turns.
- Keep shared types provider-neutral.

Acceptance evidence:

- Boundary tests cover valid, empty, oversized, malformed, extra-field, and history-limit cases.
- Validation failures use structured, user-safe 422 responses.
- No `any` appears at module boundaries.

Dependencies: P1-S1.

#### P2-S2 — Implement deterministic input guardrails

Outcome:

- Classify clear system-prompt requests, secret requests, confidential-client requests, prompt-injection signals, and clearly out-of-scope requests.
- Return typed decisions that the API can orchestrate.

Acceptance evidence:

- Safe, unsafe, and boundary cases are tested explicitly.
- Guardrails do not claim broad semantic security; ambiguous input can proceed to later grounded handling.
- Rejections contain no internal rule details.

Dependencies: P2-S1.

#### P2-S3 — Add a provider-free chat API skeleton

Outcome:

- Add `POST /api/chat` orchestration for validation and input guardrails.
- Return a controlled temporary response for the not-yet-connected knowledge/provider stages.

Acceptance evidence:

- Route tests prove 422 validation, 400 unsafe input, safe error structure, and no raw exception leakage.
- Unsupported HTTP methods are not implemented.
- No provider dependency or fake Cadre answer is introduced.

Dependencies: P2-S1, P2-S2.

### Phase P3 — Approved knowledge and deterministic retrieval

Goal: create an inspectable source of truth and safe fallback behavior before model generation.

#### P3-S1 — Define approved knowledge and link schemas

Outcome:

- Define versioned knowledge entries with stable ID, topic, approved content, keywords, approval/source note, optional action, and optional exact URL.
- Define the link allowlist in one auditable server-side location.
- Populate only verified content.

Acceptance evidence:

- Schema tests reject unapproved, malformed, stale, or non-allowlisted entries as specified.
- Pricing, case studies, client identities, and unverified security guarantees are absent.
- Missing URLs result in text-only escalation rather than placeholders.

Dependencies: P2-S1, D3; URL-bearing entries also require D4.

#### P3-S2 — Implement deterministic retrieval

Outcome:

- Normalize and score questions against topics and keywords.
- Return a small ordered set of approved entries plus retrieval metadata.
- Return no match below an explicit threshold.

Acceptance evidence:

- Tests cover supported topics, paraphrase/keyword overlap, ranking, ties, empty matches, and approved-source filtering.
- Retrieval has no network access and no vector dependency.
- Scoring and thresholds are understandable and deterministic.

Dependencies: P3-S1.

#### P3-S3 — Add retrieval guardrails and safe fallback

Outcome:

- Validate approval state, version/freshness metadata, and links after retrieval.
- Produce a canonical safe fallback for unavailable or invalid knowledge.

Acceptance evidence:

- Invalid retrieval can never reach prompt assembly.
- Unsupported questions return a transparent fallback without invoking the model where practical.
- Tests cover invalid sources, links, metadata, and empty retrieval.

Dependencies: P3-S2.

### Phase P4 — Grounded Anthropic response pipeline

Goal: add model generation behind explicit contracts without weakening deterministic controls.

#### P4-S1 — Implement the server-only Anthropic provider boundary

Outcome:

- Add a minimal provider interface and Anthropic implementation.
- Validate required server configuration and normalize provider success, usage, timeout, and failure results.

Acceptance evidence:

- Unit tests mock the provider boundary deterministically.
- API keys and raw provider errors never enter logs, responses, or client bundles.
- Model selection comes from validated server configuration.
- No automatic multi-provider fallback is added.

Dependencies: P2-S3, D5.

#### P4-S2 — Version the system prompt and context assembly

Outcome:

- Store a reviewable versioned system prompt separately from route and UI code.
- Assemble trusted instructions, delimited knowledge data, limited history, and current user input in distinct roles/sections.

Acceptance evidence:

- User input is never concatenated into the system instruction string.
- Only selected knowledge is included.
- Secrets, unrelated entries, and excessive history are excluded.
- Tests assert prompt version and message structure without snapshotting opaque prompt blobs.

Dependencies: P3-S3, P4-S1.

#### P4-S3 — Implement output validation and approved actions

Outcome:

- Validate provider output for expected shape, disallowed URLs, pricing figures, sensitive content, and unsupported Cadre claims detectable from the response contract.
- Replace invalid output with the canonical safe fallback.

Acceptance evidence:

- Every model response passes output guardrails before the API returns it.
- Non-approved URLs, invented pricing, and malformed output are blocked in tests.
- Approved actions use only exact allowlisted destinations.

Dependencies: P3-S1, P4-S2; links require D4.

#### P4-S4 — Complete end-to-end API orchestration

Outcome:

- Connect validation → input guardrails → retrieval → retrieval guardrails → context → provider → output guardrails.
- Add request IDs, duration, retrieval IDs, prompt version, model name, outcome, error category, and token usage when available.

Acceptance evidence:

- Every expected failure maps to a user-safe response and sanitized log event.
- Request bodies, full prompts, secrets, and unnecessary personal information are not logged.
- Integration tests cover success, unsupported knowledge, unsafe input, invalid output, and provider failure.

Dependencies: P2-S3, P3-S3, P4-S3.

### Phase P5 — Chat user experience

Goal: expose the verified backend through a small accessible interface.

#### P5-S1 — Build the basic chat interaction

Outcome:

- Add message input, submission, visible user/assistant turns, loading state, recoverable error state, and limited in-page history.
- Prevent empty and duplicate in-flight submissions.

Acceptance evidence:

- The UI uses only the documented API contract.
- Keyboard submission and focus behavior work.
- Provider/internal details never appear   in errors.
- Desktop and mobile layouts are usable.

Dependencies: P4-S4.

#### P5-S3 — Render approved actions safely

Outcome:

- Render server-approved actions using safe link components and accessible labels.
- Keep arbitrary model text from becoming executable links or HTML.

Acceptance evidence:

- Only structured, allowlisted actions are clickable.
- Markdown/HTML injection does not produce unsafe content.
- Missing action URLs degrade to safe text guidance.

Dependencies: P5-S1, P4-S3, D4.

### Phase P6 — Evaluation and hardening

Goal: demonstrate that core supported and adversarial scenarios behave reliably.

#### P6-S1 — Add deterministic golden-question evaluations

Outcome:

- Encode the golden questions from `plan.md` against deterministic pipeline boundaries.
- Assert grounded topic coverage, fallback behavior, refusal boundaries, pricing protection, and link safety.

Acceptance evidence:

- Tests cover every golden question category without requiring network access.
- Assertions check behavior and safety properties, not fragile prose snapshots.
- Failures identify the responsible pipeline layer.

Dependencies: P4-S4; UI-specific checks may also depend on P5-S3.

#### P6-S2 — Add optional live-provider evaluation

Outcome:

- Add an opt-in evaluation command for a small fixed question set when credentials and budget are available.
- Keep results separate from default unit/integration verification.

Acceptance evidence:

- Default `npm test` remains deterministic and offline.
- Live evaluation clearly reports model, prompt version, retrieval IDs, and pass/fail criteria without logging secrets or full prompts.
- Absence of credentials skips by explicit operator choice, not as a false pass.

Dependencies: P6-S1, D6.

#### P6-S3 — Perform security and failure-mode hardening

Outcome:

- Run the project security-review skill and address confirmed Critical/High findings.
- Exercise prompt injection, oversized input, malformed payload, provider timeout/failure, invalid knowledge, and non-approved output URLs.

Acceptance evidence:

- Security checklist has evidence-backed PASS/FAIL/N/A results.
- No unresolved Critical or High finding remains for release.
- Error responses and logs remain sanitized under forced failure.

Dependencies: P4-S4, P5-S3, P6-S1.

### Phase P7 — Release readiness

Goal: make the reviewed application reproducible, understandable, and publicly verifiable.

#### P7-S1 — Write operator and architecture documentation

Outcome:

- Add README setup, environment, commands, architecture, knowledge-update process, deployment, trade-offs, and known limitations.
- Reconcile documentation with implemented behavior.

Acceptance evidence:

- A new developer can install, configure, test, build, and understand the system from committed documentation.
- Documentation contains no secrets, fabricated URLs, or claims about checks that were not run.
- `CLAUDE.md`, `plan.md`, and this roadmap remain consistent with the code.

Dependencies: stable implementation through P6-S3.

#### P7-S2 — Complete accessibility and responsive review

Outcome:

- Manually review keyboard navigation, focus, labels, status announcements, contrast, reduced-motion behavior where relevant, and common viewport sizes.
- Fix confirmed blockers within MVP scope.

Acceptance evidence:

- Manual checklist and tested viewports are recorded.
- Core chat flow works without a mouse.
- Loading, errors, and new responses are perceivable.

Dependencies: P5-S3.

#### P7-S3 — Verify production release

Outcome:

- Run full local verification, deploy the reviewed revision, and verify production independently.
- Confirm environment configuration, safe failures, supported questions, fallbacks, and approved actions.

Acceptance evidence:

- Lint, typecheck, tests, and production build pass on the release revision.
- Public URL works in a private browser session.
- Manual golden questions and failure cases are recorded.
- Deployed revision matches the reviewed repository revision.
- Known limitations and any non-blocking findings are explicit.

Dependencies: P1-S3, P6-S3, P7-S1, P7-S2.

## 7. Dependency summary

Primary delivery path:

```text
P0-S1
  → P1-S1 → P1-S2 → P1-S3
  → P2-S1 → P2-S2 → P2-S3
  → P3-S1 → P3-S2 → P3-S3
  → P4-S1 → P4-S2 → P4-S3 → P4-S4
  → P5-S1 → P5-S2 → P5-S3
  → P6-S1 → P6-S3
  → P7-S1 + P7-S2 → P7-S3
```

`P6-S2` is optional and depends on explicit live-evaluation access. Deployment should happen at P1-S3 and be updated incrementally; P7-S3 is release verification, not the first deployment.

## 8. Suggested review checkpoints

Require a Code Reviewer pass at minimum after:

- P1-S1: toolchain and dependency baseline.
- P2-S3: public API boundary.
- P3-S3: knowledge and retrieval trust boundary.
- P4-S4: complete AI pipeline and logging.
- P5-S3: browser rendering and link safety.
- P6-S3: security hardening.
- P7-S3: final release revision.

Smaller stories may be reviewed together only when they share one approved spec and one coherent diff.

## 9. Definition of roadmap completion

This roadmap is complete only when:

- Every required story has implementation evidence or an explicitly approved replacement decision.
- All gates required by shipped behavior are resolved with real evidence.
- The production URL serves the reviewed revision.
- Supported questions are grounded in approved knowledge.
- Unsupported, unsafe, or unverifiable requests fail safely.
- No unresolved Critical or High review finding remains.
- Automated and manual release verification is recorded honestly.
- Documentation describes the actual system and known limitations.

Optional stories and enhancements are not required for MVP completion unless explicitly promoted into scope in `plan.md`.
