# P4-S1 — Implement the Server-Only Anthropic Provider Boundary

Status: APPROVED
Plan phase: P4

## Outcome

Create a minimal, testable server-side module that encapsulates all Anthropic API integration. The module validates required environment configuration at startup, normalizes Anthropic's request/response contract into a provider-neutral interface, handles expected errors (timeouts, auth failures, rate limits), and ensures that API keys and raw provider errors never enter logs, responses, or client bundles.

## In scope

- Create `src/lib/llm/provider.ts` with:
  - Type definitions for provider request and response contracts (distinct from chat API contracts)
  - Exported async function: `generateResponse(request: ProviderRequest): Promise<ProviderResponse>`
  - ProviderRequest includes: systemPrompt, userMessages (array of role/content pairs), maxTokens, temperature
  - ProviderResponse includes: text, stopReason, inputTokens, outputTokens, finishReason
  - ProviderResponse error variant with errorCode and userSafeMessage
- Create `src/lib/llm/config.ts` to:
  - Validate ANTHROPIC_API_KEY and ANTHROPIC_MODEL environment variables at module initialization
  - Throw a descriptive error if either is missing (will cause app startup to fail safely)
  - Export validated config object with model identifier and a validation timestamp
  - Never export API key (internal use only)
- Implement error handling for:
  - Anthropic API timeouts (>30s) → return ProviderResponse with errorCode "TIMEOUT" and generic user-safe message
  - Authentication failures (invalid key) → errorCode "AUTH_FAILED", user-safe message
  - Rate limits (429) → errorCode "RATE_LIMITED", user-safe message
  - Invalid request structure (400) → errorCode "BAD_REQUEST", user-safe message
  - Unexpected errors (500, network failures) → errorCode "PROVIDER_ERROR", user-safe message
- No automatic retry or fallback logic (orchestration layer will decide recovery)
- Log structured events server-side:
  - Model name, request duration, token counts, stop reason, error code (if applicable)
  - Never log API key, full prompts, system instructions, or user identity
  - Include a request ID for tracing (will be passed by orchestration layer)
- Create `src/lib/llm/provider.test.ts` with:
  - Mock Anthropic client and validate calls
  - Successful response normalizes to ProviderResponse
  - Timeout (AbortError after 30s) returns errorCode "TIMEOUT"
  - 401/403 returns errorCode "AUTH_FAILED"
  - 429 returns errorCode "RATE_LIMITED"
  - 400 returns errorCode "BAD_REQUEST"
  - Network error or 5xx returns errorCode "PROVIDER_ERROR"
  - Verify API key is never logged or returned
  - Verify stop_reason is normalized to finishReason (e.g., "end_turn" → "stop")
  - Verify token counts are captured correctly

## Out of scope

- System prompt or user context assembly (P4-S2)
- Output validation, URL checks, or safety filtering (P4-S3)
- Chat API route orchestration (P4-S4)
- Prompt caching or advanced Anthropic features
- LLM provider switching or multi-provider abstraction
- Automatic retry policies or fallback models
- Live evaluation or metrics dashboards

## Current-state evidence

- `src/lib/chat/contracts.ts` defines request/response types for chat API
- `src/app/api/chat/route.ts` accepts validated input but returns placeholder response
- `.env.example` declares `ANTHROPIC_MODEL=` and `ANTHROPIC_API_KEY=` (names only)
- P2-S3 (Chat API skeleton) completed; P3-S3 (Retrieval guardrails) implemented but status is DRAFT
- No LLM provider code exists yet (`src/lib/llm/` directory does not exist)

## Decisions and assumptions

1. **Model identifier (D5 — APPROVED)**: The selected model is **claude-3-5-haiku-20241022**, chosen for cost efficiency within a $5 USD budget constraint. Haiku is the most cost-effective Anthropic model and is suitable for structured Q&A and retrieval-grounded support chat. The model identifier will be set via `ANTHROPIC_MODEL` environment variable at deployment.
2. **Error handling philosophy**: Provider errors are normalized to a small, typed set. The orchestration layer (P4-S4) decides whether to escalate, retry, or return fallback. The provider does not implement retry logic.
3. **Logging constraints**: Structured logs include model name, duration, token usage, and error category, but never API key, full prompt text, or raw provider errors. This keeps logs safe for audit/debugging without leaking secrets.
4. **Timeout behavior**: A 30-second timeout on provider calls is assumed reasonable for this use case (no user input justifies a longer wait). The timeout is implemented at the provider level, not the HTTP layer.
5. **No mock/stub inference**: Tests mock the Anthropic client explicitly. No environment-based fallback to a local or fake model is added to avoid hiding provider integration issues.

## Executable tasks

1. Create directory `src/lib/llm/` if it does not exist.
2. Implement `src/lib/llm/config.ts`:
   - Export `getProviderConfig(): { model: string; apiKey: string; }`
   - Validate `process.env.ANTHROPIC_MODEL` is a non-empty string; throw error if missing
   - Validate `process.env.ANTHROPIC_API_KEY` is a non-empty string; throw error if missing
   - Export validated config (no re-validation on each call; use lazy singleton pattern or module-level initialization)
3. Implement `src/lib/llm/provider.ts`:
   - Define ProviderRequest interface with systemPrompt, userMessages, maxTokens, temperature
   - Define ProviderResponse with success variant (text, stopReason, inputTokens, outputTokens) and error variant (errorCode, userSafeMessage)
   - Define errorCode type union: "TIMEOUT" | "AUTH_FAILED" | "RATE_LIMITED" | "BAD_REQUEST" | "PROVIDER_ERROR"
   - Implement `generateResponse(request: ProviderRequest, requestId?: string): Promise<ProviderResponse>`
   - Use Anthropic SDK (install if needed) with model from config, 30-second timeout
   - Map Anthropic response fields: content[0].text → text, stop_reason → finishReason, usage.input_tokens → inputTokens
   - Catch and normalize errors according to type (timeout, auth, rate limit, bad request, generic)
   - Log structured event with model, duration, token counts, finishReason, requestId, errorCode (if applicable)
   - Return ProviderResponse (success or error, never throw)
4. Implement `src/lib/llm/provider.test.ts`:
   - Mock Anthropic client constructor and call method
   - Test: successful response returns ProviderResponse with text, stopReason, token counts
   - Test: AbortError (timeout after 30s) returns errorCode "TIMEOUT"
   - Test: HTTP 401/403 exception maps to errorCode "AUTH_FAILED"
   - Test: HTTP 429 exception maps to errorCode "RATE_LIMITED"
   - Test: HTTP 400 exception maps to errorCode "BAD_REQUEST"
   - Test: Unexpected error (network, 5xx) maps to errorCode "PROVIDER_ERROR"
   - Test: API key never appears in logs or return values
   - Test: Multiple calls with different requestIds are logged correctly
   - Test: User-safe message is present in error responses
5. Run `npm run lint`, `npm run typecheck`, `npm test` to verify.
6. Update `.env.example` to clarify the format (remains names-only).

## Acceptance criteria

1. Provider module compiles with no TypeScript errors (`npm run typecheck` passes).
2. All tests pass (`npm test` includes provider.test.ts passing).
3. ESLint passes on provider and config files (`npm run lint`).
4. `src/lib/llm/config.ts` throws during module initialization if `ANTHROPIC_MODEL` or `ANTHROPIC_API_KEY` is missing or empty.
5. `generateResponse()` returns a typed ProviderResponse (success or error) and never throws.
6. Successful response normalizes Anthropic's fields correctly (content → text, stop_reason → finishReason, usage → token counts).
7. All six error categories (TIMEOUT, AUTH_FAILED, RATE_LIMITED, BAD_REQUEST, PROVIDER_ERROR, and generic failures) are tested and map to correct error codes.
8. Structured logging captures model name, duration, token usage, and error code without logging API key or full prompts.
9. Timeout of 30 seconds is enforced (verified in tests via mock AbortError).
10. No live Anthropic API call is made during unit tests (mocked client only).
11. Provider is server-only: no provider code is reachable from client-side bundles.

## Tests

Located in `src/lib/llm/provider.test.ts`. Test runner: vitest (inherited from package.json).

### Test cases

- ✓ generateResponse returns success response with normalized fields (text, finishReason, token counts)
- ✓ generateResponse maps Anthropic stop_reason values to finishReason ("end_turn" → "stop", "max_tokens" → "max_tokens")
- ✓ generateResponse returns error code "TIMEOUT" when AbortError is thrown (simulating 30s timeout)
- ✓ generateResponse returns error code "AUTH_FAILED" for HTTP 401/403 errors
- ✓ generateResponse returns error code "RATE_LIMITED" for HTTP 429 errors
- ✓ generateResponse returns error code "BAD_REQUEST" for HTTP 400 errors
- ✓ generateResponse returns error code "PROVIDER_ERROR" for unexpected errors (network, 5xx, unknown)
- ✓ API key never appears in logs (captured and verified via mock logger)
- ✓ Config initialization throws if ANTHROPIC_API_KEY is missing
- ✓ Config initialization throws if ANTHROPIC_MODEL is missing
- ✓ Structured logs include model name, request duration, token counts, finishReason, requestId
- ✓ Error response includes user-safe message (no raw exception details)

## Verification commands

```bash
npm run typecheck
npm run lint
npm test -- src/lib/llm/provider.test.ts
npm test
npm run build
```

All must pass before acceptance.

## Risks and pending decisions

### Risks

- **Model capability limits**: Claude 3.5 Haiku is fast and cost-effective but may struggle with complex multi-turn reasoning. If golden questions reveal reasoning gaps in P6-S1, re-evaluation will be needed. Cost/quality trade-off is acceptable for MVP.
- **Secret exposure**: If logging is not carefully audited, API key could leak. Mitigation: no raw error details logged, only error codes. Logging layer is mocked and validated in tests.
- **Anthropic API changes**: SDK version or endpoint changes could break the module. Mitigation: pin Anthropic SDK version in package.json and test against a stable release.
- **Timeout too short**: If 30s is insufficient for typical Haiku queries, UX will degrade. Mitigation: add query-specific timeout tuning in P6-S2 (live evaluation) if needed.
- **Missing config at startup**: If ANTHROPIC_API_KEY or ANTHROPIC_MODEL is missing, the app will fail to start rather than return a safe 500 error at runtime. This is intentional (fail-fast). Ensure deployment documentation is clear about required environment variables.

## No blocking dependencies

D5 is resolved. Implementation can proceed immediately.

## Unblocking next stories

When this spec is implemented and verified:

- P4-S2 (System prompt and context assembly) depends on this module and can proceed.
- P4-S3 (Output validation) depends on understanding the provider response structure and can proceed.
- P4-S4 (End-to-end orchestration) will integrate this module into the chat API route.
