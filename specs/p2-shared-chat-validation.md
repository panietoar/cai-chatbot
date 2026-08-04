# P2-S1 — Shared Chat Contracts and Runtime Validation

Status: APPROVED
Plan phase: P2

## Outcome
Define a deterministic, provider-neutral chat boundary for request and response contracts, with runtime validation rules that are fully testable before guardrails, retrieval, or model integration.

## In scope
- Define shared TypeScript contracts for chat request, success response, and error response shapes.
- Define runtime validation requirements for:
  - Required user message presence.
  - Empty or whitespace-only input rejection.
  - Maximum message length of 2,000 characters.
  - Maximum history length of 10 turns.
  - Unknown field rejection at the API boundary.
- Define structured, user-safe validation failure behavior using HTTP 422.
- Define tests that prove deterministic boundary behavior without provider calls.
- Keep contracts provider-neutral and scoped to MVP needs only.

## Out of scope
- Prompt-injection and intent classification rules.
- API orchestration implementation for POST /api/chat.
- Knowledge retrieval, context assembly, provider calls, or output guardrails.
- UI chat interaction details beyond existing shell behavior.
- New infrastructure or dependencies beyond existing toolchain.

## Current-state evidence
- P1 skeleton and quality baseline are implemented in [specs/p1-scaffold.md](specs/p1-scaffold.md).
- P1 shell and health signal are implemented and documented in [specs/p1-shell-health.md](specs/p1-shell-health.md).
- There is currently no chat boundary module or API contract layer under [src](src).
- Current tests cover smoke and health behavior only in [src/app/smoke.test.ts](src/app/smoke.test.ts) and [src/app/health.test.tsx](src/app/health.test.tsx).
- P2-S1 is defined as depending only on P1-S1 in [implementation-plan.md](implementation-plan.md#L161).
- P1-S3 depends on D2 (deployment ownership/access), which is not evidenced in the repository, so selecting P2-S1 avoids external-access blocking for code progress.

## Decisions and assumptions
- Decision: Select P2-S1 as the next bounded story because it is the earliest incomplete unblocked slice with deterministic acceptance checks.
- Decision: Keep the spec strictly contract-and-validation focused, with no API provider behavior or retrieval semantics.
- Decision: Reject unknown fields strictly across the full request payload shape (top-level and nested objects/arrays).
- Decision: Reject whitespace-only user input and do not process it further.
- Assumption: Existing scripts in [package.json](package.json) remain the verification baseline for this story.
- Assumption: Validation behavior will be implemented with explicit runtime parsing and typed error envelopes consistent with MVP safety requirements.

## Executable tasks
1. Create provider-neutral shared chat contract types for request, success response, and error response.
2. Define runtime validation schema/rules for message, history count, max lengths, and strict unknown-field rejection across the payload.
3. Implement a validation result contract that distinguishes valid payloads from structured validation failures.
4. Add deterministic unit tests for valid payloads and required rejection cases (empty, whitespace-only, oversized, malformed, extra fields at all levels, history-limit exceeded).
5. Add API-boundary tests or fixtures proving 422 mapping with safe error payload structure.
6. Ensure no module boundary introduces any type in place of strict explicit typing.
7. Run lint, typecheck, tests, and build to verify repository-wide integrity.

## Acceptance criteria
- Shared chat contracts are present, provider-neutral, and importable by API and future orchestration layers.
- Runtime validation enforces:
  - Non-empty user message.
  - Whitespace-only message rejection without further processing.
  - Maximum 2,000 characters per message.
  - Maximum 10 history turns.
  - Strict rejection of unknown fields anywhere in the payload shape.
- Validation failures map to structured, user-safe 422 responses with no stack traces or internal details.
- Deterministic tests cover valid and all listed invalid boundary cases.
- Repository verification commands pass:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build

## Tests
- Validation unit tests for:
  - Valid request payload.
  - Empty/whitespace-only message.
  - Message > 2,000 chars.
  - Malformed history payload.
  - >10 history turns.
  - Unknown/extra fields at top-level and nested payload levels.
- API-shape tests for:
  - 422 status mapping on validation failure.
  - Safe, structured error response body.
- Tests remain deterministic and offline.

## Verification commands
- npm run lint
- npm run typecheck
- npm test
- npm run build

## Risks and pending decisions
- Contradiction: Current implementation-plan sequencing presents P1-S3 before P2 stories, but P1-S3 requires external deployment ownership (D2) not evidenced in-repo; progressing P2-S1 first is a controlled sequencing deviation to maintain engineering momentum without violating MVP scope.
- Risk: Over-designing contracts could create unnecessary abstractions before real API orchestration constraints are known.
- Mitigation: Keep types minimal, provider-neutral, and directly mapped to P2-S1 acceptance evidence.
- Pending decisions resolved for this draft:
  - Unknown-field policy: strict-fail for unknown fields across the entire payload.
  - Whitespace policy: whitespace-only input is rejected and ignored.
