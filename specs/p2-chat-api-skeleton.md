# P2-S3 — Provider-Free Chat API Skeleton

Status: APPROVED
Plan phase: P2

## Outcome

Implement `POST /api/chat` orchestration that integrates validated input and input guardrails, returning deterministic responses before knowledge retrieval or provider integration. Prove that the API boundary enforces all P2 validation and safety rules with no raw exception leakage.

## In scope

- Implement `POST /api/chat` route handler.
- Integrate chat-request validation from P2-S1.
- Integrate input guardrails from P2-S2.
- Map validation failures to HTTP 422 with structured error responses.
- Map unsafe input to HTTP 400 with safe, user-facing error messages.
- Return a controlled temporary success response for valid, safe input that clearly indicates the full pipeline is not yet connected.
- Add integration tests proving the validation → guardrails → response orchestration.
- Ensure unsupported HTTP methods (GET, PUT, DELETE, etc.) are not implemented.
- Ensure no raw exceptions, stack traces, or internal details reach the client.
- Keep all route logic server-side only.

## Out of scope

- Knowledge retrieval implementation (P3).
- Provider/LLM integration (P4).
- Context assembly or system prompts (P4).
- Output guardrails (P4).
- Real Cadre-specific answers or grounded responses.
- Request IDs, logging infrastructure, or observability detail beyond console error logging.
- UI integration beyond the existing shell from P1-S2.
- Authentication, rate limiting, or CORS configuration.

## Current-state evidence

- P2-S1 validation is implemented and tested in [src/lib/validation/chat-request.ts](../src/lib/validation/chat-request.ts) with 8 passing tests.
- P2-S2 input guardrails are implemented and tested in [src/lib/guardrails/input-guardrails.ts](../src/lib/guardrails/input-guardrails.ts) with 30 passing tests.
- The only existing API route is [src/app/api/health/route.ts](../src/app/api/health/route.ts).
- No `src/app/api/chat/` directory or route exists yet.
- Current test suite has 42 passing tests across 5 files.
- Verification commands are defined in [package.json](../package.json): `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Decisions and assumptions

**Decision:** Return a clearly temporary placeholder response for valid safe input rather than implementing fake Cadre knowledge or answers.

**Decision:** Use HTTP 422 for validation failures (malformed requests) and HTTP 400 for unsafe input (security/policy violations), consistent with REST conventions.

**Decision:** Treat any unexpected runtime error as a controlled HTTP 500 with no stack trace exposure.

**Decision:** Reject all HTTP methods except POST explicitly.

**Decision:** Keep route implementation focused on orchestration; reuse existing validation and guardrail modules without duplicating logic.

**Assumption:** The temporary response will be replaced in P4-S4 when the full pipeline is connected.

**Assumption:** Logging will be enhanced in later phases; for P2-S3, console.error is sufficient for server-side error visibility during development.

**Assumption:** The route will use Next.js App Router conventions with `route.ts` in `src/app/api/chat/`.

## Executable tasks

1. Create `src/app/api/chat/route.ts` with a POST handler.
2. Parse and validate the request body using `validateChatRequest` from P2-S1.
3. On validation failure, return HTTP 422 with the structured `ChatErrorResponse` containing `INVALID_REQUEST` code and validation details.
4. On validation success, check the validated request with `checkInputGuardrails` from P2-S2.
5. On guardrail violation, return HTTP 400 with `ChatErrorResponse` containing `UNSAFE_INPUT` code and a user-safe message with no internal violation details.
6. On safe input, return HTTP 200 with a `ChatSuccessResponse` containing a clearly temporary message indicating the pipeline is incomplete.
7. Add global error handling that catches unexpected exceptions and returns HTTP 500 with `INTERNAL_ERROR` code and no stack trace.
8. Verify unsupported HTTP methods return HTTP 405 or are not handled.
9. Add integration tests covering:
   - Valid safe input → 200 with placeholder response.
   - Validation failures → 422 with structured details.
   - Unsafe input (prompt injection, secret requests, etc.) → 400 with safe error.
   - Malformed JSON → 422 or 400 with safe error.
   - Unexpected errors → 500 with safe error.
   - GET, PUT, DELETE methods → 405 or not found.
10. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and verify all pass.

## Acceptance criteria

- `POST /api/chat` is accessible and processes requests through validation and guardrails.
- Validation failures return HTTP 422 with:
  - `error.code: "INVALID_REQUEST"`
  - `error.message` that is user-safe
  - `error.details[]` containing validation issues with path, code, and message
- Unsafe input returns HTTP 400 with:
  - `error.code: "UNSAFE_INPUT"`
  - `error.message` that is user-safe and does not reveal violation category or patterns
  - No `error.details` array (guardrail violations do not expose internal detection logic)
- Valid safe input returns HTTP 200 with:
  - `message` field containing a clearly temporary placeholder
  - Response structure matching `ChatSuccessResponse` from P2-S1
- Unexpected errors return HTTP 500 with:
  - `error.code: "INTERNAL_ERROR"`
  - `error.message` that is user-safe
  - No stack traces, exception details, or internal paths
- GET, PUT, DELETE, and other non-POST methods are not handled or return HTTP 405.
- All responses use the typed contracts from `src/lib/chat/contracts.ts`.
- No `any` types appear in route code.
- Integration tests prove all acceptance criteria.
- All verification commands pass:
  - `npm run lint` — no warnings or errors
  - `npm run typecheck` — no type errors
  - `npm test` — all tests pass
  - `npm run build` — production build succeeds

## Tests

**Unit/Integration tests** (`src/app/api/chat/route.test.ts` or similar):

1. Valid safe request returns 200 with placeholder response.
2. Empty message returns 422 with validation error.
3. Message exceeding 2,000 characters returns 422.
4. More than 10 history turns returns 422.
5. Unknown fields in request returns 422.
6. Malformed history array returns 422.
7. Prompt-injection attempt returns 400 with safe error.
8. System-prompt extraction attempt returns 400 with safe error.
9. Secret request returns 400 with safe error.
10. Out-of-scope request returns 400 with safe error.
11. Malformed JSON body returns 422 or 400 with safe error.
12. Simulated unexpected error returns 500 with safe error.
13. GET request to `/api/chat` returns 405 or is not handled.
14. All error responses match `ChatErrorResponse` schema.
15. All success responses match `ChatSuccessResponse` schema.

Tests remain deterministic and offline; no external API calls are made.

## Verification commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All commands must pass with no errors or warnings.

## Risks and pending decisions

**Risk:** Over-designing the orchestration before retrieval and provider requirements are clear may create unnecessary abstraction.

**Mitigation:** Keep the route handler minimal and focused on the immediate P2 contract; refactor in P4 when the full pipeline is integrated.

**Risk:** The placeholder response may be mistaken for real chat behavior during manual testing.

**Mitigation:** Make the placeholder message explicitly clear that it is temporary, e.g., "This is a placeholder response. The full chat pipeline is not yet connected."

**Risk:** Error-handling paths may not be fully covered without forced-failure scenarios.

**Mitigation:** Include integration tests that deliberately trigger validation failures, guardrail violations, and simulated internal errors.

**No pending decisions:** All requirements for P2-S3 are specified and unblocked by existing P2-S1 and P2-S2 implementations.
