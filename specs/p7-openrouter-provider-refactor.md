# P7 — Refactor Provider Integration from Anthropic SDK to OpenRouter API

Status: APPROVED
Plan phase: P7 (Technical Refactoring)

## Outcome

Replace the direct Anthropic SDK integration with OpenRouter API to enable unified LLM provider access while maintaining the same provider interface, error handling, security boundaries, and test coverage. The refactoring preserves all existing behavior guarantees and does not change the chat orchestration, guardrails, or knowledge retrieval layers.

## In scope

- Remove `@anthropic-ai/sdk` dependency from `package.json`
- Replace Anthropic SDK calls with OpenRouter HTTP API using native `fetch`
- Update environment variables:
  - Replace `ANTHROPIC_API_KEY` with `OPENROUTER_API_KEY`
  - Update `ANTHROPIC_MODEL` to use OpenRouter model identifier format (e.g., `anthropic/claude-3.5-haiku`)
- Modify `src/lib/llm/config.ts`:
  - Validate `OPENROUTER_API_KEY` instead of `ANTHROPIC_API_KEY`
  - Validate `OPENROUTER_MODEL` instead of `ANTHROPIC_MODEL`
  - Add optional `OPENROUTER_SITE_URL` and `OPENROUTER_APP_NAME` configuration
- Modify `src/lib/llm/provider.ts`:
  - Replace Anthropic SDK client initialization with OpenRouter endpoint configuration
  - Implement HTTP POST to `https://openrouter.ai/api/v1/chat/completions`
  - Add required OpenRouter headers: `Authorization`, `HTTP-Referer`, `X-Title`
  - Map provider request to OpenRouter's OpenAI-compatible request format
  - Normalize OpenRouter response format to existing `ProviderResponse` interface
  - Preserve existing error mapping (timeout, auth, rate limit, bad request, generic)
  - Maintain 30-second timeout behavior
  - Keep structured logging unchanged (exclude API keys and full prompts)
- Update all tests in `src/lib/llm/config.test.ts` and `src/lib/llm/provider.test.ts`:
  - Mock `fetch` instead of Anthropic SDK
  - Test OpenRouter-specific error responses
  - Verify OpenRouter headers are included
  - Maintain all existing test coverage for success, timeout, auth, rate limit, and error cases
- Update `.env.example` with new variable names
- Update documentation references:
  - `CLAUDE.md` environment variables section
  - All spec files that reference `ANTHROPIC_API_KEY` or `ANTHROPIC_MODEL`
  - Security review checklists and agent memory files
  - `.claude/skills/security-review/checklist.md`

## Out of scope

- Changing the `ProviderRequest` or `ProviderResponse` interfaces (orchestration layer remains unchanged)
- Adding multi-provider switching or fallback logic
- Modifying chat API routes, guardrails, retrieval, or knowledge base
- Adding new provider-specific features beyond basic completion
- Implementing streaming responses
- Adding provider cost comparison or optimization
- Changing system prompt assembly or context engineering
- Modifying UI components or chat interface
- Adding provider-specific caching or advanced features
- Updating Vercel deployment configuration (will be handled separately if needed)

## Current-state evidence

Inspected on 2026-08-04:

- `package.json` includes `"@anthropic-ai/sdk": "^0.115.0"` as a dependency
- `src/lib/llm/config.ts` validates `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` environment variables
- `src/lib/llm/provider.ts` uses `import Anthropic from "@anthropic-ai/sdk"` and instantiates an Anthropic client
- Provider module exports `generateResponse()` with well-defined error handling and response normalization
- `.env.example` declares `ANTHROPIC_API_KEY=` and `ANTHROPIC_MODEL=`
- `src/lib/llm/config.test.ts` and `src/lib/llm/provider.test.ts` mock the Anthropic SDK
- Security documentation and agent memory files reference `ANTHROPIC_API_KEY` in multiple locations
- OpenRouter is mentioned in `src/lib/knowledge/corpus.ts` as part of Cadre's technology ecosystem but not used for API integration
- The provider interface is already provider-neutral with typed request/response contracts
- All Phase P4 provider work (P4-S1) is marked as completed with approved status

## Decisions and assumptions

1. **OpenRouter model selection**: Use `anthropic/claude-3.5-haiku` as the OpenRouter model identifier, which maps to the current Anthropic Haiku model. This maintains cost efficiency and matches the original D5 decision rationale (cost-effective, suitable for structured Q&A). The model will be configurable via `OPENROUTER_MODEL` environment variable.

2. **HTTP client choice**: Use native `fetch` API (available in Node.js 18+) instead of adding a new HTTP client dependency. This keeps dependencies minimal and aligns with the project's preference for standard APIs. The existing Node version requirement is `>=20`, which supports fetch natively.

3. **OpenRouter headers**: Include required headers per OpenRouter API documentation:
   - `Authorization: Bearer ${OPENROUTER_API_KEY}` (required)
   - `HTTP-Referer: ${OPENROUTER_SITE_URL}` (optional but recommended, defaults to empty string if not provided)
   - `X-Title: ${OPENROUTER_APP_NAME}` (optional, defaults to "Cadre AI Support Chatbot" if not provided)
   - `Content-Type: application/json` (required)

4. **Error mapping**: OpenRouter uses HTTP status codes similar to OpenAI API. Map OpenRouter errors to existing `ErrorCode` types:
   - 401/403 → `AUTH_FAILED`
   - 429 → `RATE_LIMITED`
   - 400 → `BAD_REQUEST`
   - 500/502/503 → `PROVIDER_ERROR`
   - Timeout (AbortSignal) → `TIMEOUT`
   - Network errors → `PROVIDER_ERROR`

5. **Request/response format**: OpenRouter uses OpenAI-compatible chat completions format, which differs from Anthropic's native format:
   - System prompt goes in a `system` message role instead of separate `system` parameter
   - Messages array includes `{ role: "system" | "user" | "assistant", content: string }`
   - Response structure: `response.choices[0].message.content` instead of `response.content[0].text`
   - Token usage: `response.usage.prompt_tokens` and `response.usage.completion_tokens`
   - Finish reason: `response.choices[0].finish_reason` (values: "stop", "length", null)

6. **Backward compatibility**: The refactoring maintains the exact same external interface. No changes to orchestration, tests outside the provider module, or deployment configuration are required unless environment variables need updating in production.

7. **Security invariants**: API keys remain server-side only, never logged, and accessed only through `src/lib/llm/config.ts`. No secrets appear in logs, client bundles, or responses. These invariants are unchanged.

## Executable tasks

1. **Update dependencies**:
   - Remove `"@anthropic-ai/sdk"` from `package.json` dependencies
   - Run `npm install` to update `package-lock.json`
   - Verify no other code references the Anthropic SDK package

2. **Refactor `src/lib/llm/config.ts`**:
   - Rename validation from `ANTHROPIC_API_KEY` to `OPENROUTER_API_KEY`
   - Rename validation from `ANTHROPIC_MODEL` to `OPENROUTER_MODEL`
   - Add optional `OPENROUTER_SITE_URL` with default value (empty string or project URL)
   - Add optional `OPENROUTER_APP_NAME` with default value "Cadre AI Support Chatbot"
   - Update error messages to reference OpenRouter instead of Anthropic
   - Update exported config interface to include `siteUrl` and `appName` fields
   - Update `getApiKey()` to return the OpenRouter API key
   - Preserve module-level initialization and lazy singleton pattern

3. **Refactor `src/lib/llm/provider.ts`**:
   - Remove `import Anthropic from "@anthropic-ai/sdk"`
   - Remove Anthropic client instantiation
   - Define OpenRouter API endpoint constant: `https://openrouter.ai/api/v1/chat/completions`
   - Implement request transformation:
     - Convert `ProviderRequest` to OpenRouter format
     - Map `systemPrompt` to a message with `role: "system"`
     - Include `userMessages` array in OpenRouter messages format
     - Include `max_tokens`, `temperature` parameters
     - Set `model` from config
   - Implement fetch call with:
     - POST method to OpenRouter endpoint
     - Required headers: `Authorization`, `Content-Type`, `HTTP-Referer`, `X-Title`
     - 30-second timeout using `AbortSignal.timeout(30000)`
     - JSON body with transformed request
   - Implement response transformation:
     - Extract `choices[0].message.content` → `text`
     - Map `choices[0].finish_reason` → `finishReason` (normalize "length" to "max_tokens")
     - Extract `usage.prompt_tokens` → `inputTokens`
     - Extract `usage.completion_tokens` → `outputTokens`
   - Preserve error handling:
     - Catch `AbortError` → `TIMEOUT`
     - Check response status codes and map to existing error codes
     - Parse JSON error responses when available
     - Log structured events with same format (model, duration, tokens, finish reason, request ID)
   - Keep user-safe error messages unchanged
   - Return `ProviderResponse` (success or error, never throw)

4. **Update `src/lib/llm/config.test.ts`**:
   - Replace all references to `ANTHROPIC_API_KEY` with `OPENROUTER_API_KEY`
   - Replace all references to `ANTHROPIC_MODEL` with `OPENROUTER_MODEL`
   - Update error message expectations to reference OpenRouter
   - Add tests for optional `OPENROUTER_SITE_URL` and `OPENROUTER_APP_NAME` configuration
   - Verify default values are applied when optional vars are missing
   - Maintain test coverage for missing/empty required variables

5. **Update `src/lib/llm/provider.test.ts`**:
   - Replace Anthropic SDK mock with `fetch` mock using `vi.spyOn(globalThis, 'fetch')`
   - Update mock responses to OpenRouter JSON format:
     - `{ choices: [{ message: { content: "..." }, finish_reason: "stop" }], usage: { prompt_tokens: N, completion_tokens: M } }`
   - Test success case with OpenRouter response structure
   - Test timeout (AbortError after 30s) → `TIMEOUT`
   - Test HTTP 401 response → `AUTH_FAILED`
   - Test HTTP 429 response → `RATE_LIMITED`
   - Test HTTP 400 response → `BAD_REQUEST`
   - Test HTTP 500/502/503 responses → `PROVIDER_ERROR`
   - Test network error (fetch rejection) → `PROVIDER_ERROR`
   - Verify OpenRouter headers are included in request (Authorization, HTTP-Referer, X-Title, Content-Type)
   - Verify API key never appears in logs or return values
   - Verify finish_reason normalization ("length" → "max_tokens", "stop" → "stop")
   - Verify token counts are extracted correctly from OpenRouter usage object
   - Maintain all existing test coverage scenarios

6. **Update `.env.example`**:
   - Replace `ANTHROPIC_API_KEY=` with `OPENROUTER_API_KEY=`
   - Replace `ANTHROPIC_MODEL=` with `OPENROUTER_MODEL=`
   - Add `OPENROUTER_SITE_URL=` (optional)
   - Add `OPENROUTER_APP_NAME=` (optional)
   - Add comments explaining expected values (e.g., model format: `anthropic/claude-3.5-haiku`)

7. **Update documentation references**:
   - `CLAUDE.md`: Update environment variables section (lines 107-108)
   - `specs/p4-anthropic-provider.md`: Add note about OpenRouter migration (or mark as historical reference)
   - `specs/p4-e2e-orchestration.md`: Update environment variable references
   - `specs/p6-security-hardening.md`: Replace `ANTHROPIC_API_KEY` with `OPENROUTER_API_KEY` in security checklist
   - `.claude/agent-memory/code-reviewer/MEMORY.md`: Update API key reference (line 14)
   - `.claude/output-styles/concise-technical.md`: Update example reference (line 29)
   - `.claude/skills/security-review/checklist.md`: Update all references to API key validation (lines 12, 70, 97, etc.)

8. **Verify refactoring**:
   - Run `npm run lint` and fix any issues
   - Run `npm run typecheck` and ensure no type errors
   - Run `npm run test` and verify all tests pass
   - Run `npm run build` and verify successful build
   - Manually inspect that no `@anthropic-ai/sdk` references remain in source code
   - Manually search for any remaining `ANTHROPIC_API_KEY` references outside of documentation/specs

## Acceptance criteria

- [ ] `@anthropic-ai/sdk` dependency is removed from `package.json`
- [ ] `src/lib/llm/config.ts` validates `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and optional site/app configuration
- [ ] `src/lib/llm/provider.ts` makes HTTP requests to OpenRouter API endpoint with correct headers
- [ ] Provider request transformation correctly maps system prompt and user messages to OpenRouter format
- [ ] Provider response transformation correctly extracts text, finish reason, and token counts from OpenRouter format
- [ ] All existing error codes (`TIMEOUT`, `AUTH_FAILED`, `RATE_LIMITED`, `BAD_REQUEST`, `PROVIDER_ERROR`) are preserved
- [ ] 30-second timeout behavior is maintained
- [ ] Structured logging format is unchanged (model, duration, tokens, finish reason, request ID, error code)
- [ ] API key is never logged, returned, or exposed to client code
- [ ] All tests in `config.test.ts` and `provider.test.ts` pass with updated mocks
- [ ] Test coverage for success, errors, timeouts, and edge cases is maintained or improved
- [ ] `.env.example` reflects new environment variable names with clear documentation
- [ ] All documentation references to Anthropic API key and model are updated to OpenRouter
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` all pass
- [ ] No references to `@anthropic-ai/sdk` or `import Anthropic` remain in source code
- [ ] OpenRouter headers (Authorization, HTTP-Referer, X-Title) are included in all API requests
- [ ] Finish reason is correctly normalized ("length" → "max_tokens")
- [ ] The `ProviderRequest` and `ProviderResponse` interfaces are unchanged
- [ ] No changes are required to orchestration, guardrails, retrieval, or UI layers

## Tests

All existing test scenarios are preserved with updated mocks:

### `src/lib/llm/config.test.ts`

- Config initialization succeeds with valid `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`
- Config throws descriptive error if `OPENROUTER_API_KEY` is missing
- Config throws descriptive error if `OPENROUTER_MODEL` is missing
- Config throws descriptive error if `OPENROUTER_API_KEY` is empty string
- Config throws descriptive error if `OPENROUTER_MODEL` is empty string
- Optional `OPENROUTER_SITE_URL` uses default value if not provided
- Optional `OPENROUTER_APP_NAME` uses default value if not provided
- Config caches values and does not re-validate on subsequent calls
- `getProviderConfig()` returns validated model, timestamp, site URL, and app name
- `getApiKey()` returns validated OpenRouter API key (internal use only)

### `src/lib/llm/provider.test.ts`

- **Success path**:
  - `generateResponse()` returns `ProviderSuccessResponse` with text, finish reason "stop", token counts
  - Request includes correct OpenRouter endpoint, headers (Authorization, HTTP-Referer, X-Title, Content-Type)
  - System prompt is transformed to `{ role: "system", content: "..." }` message
  - User messages array is passed correctly in OpenRouter format
  - `max_tokens` and `temperature` are included in request body
  - Response `choices[0].message.content` is extracted as `text`
  - Response `choices[0].finish_reason` "stop" is normalized to `finishReason: "stop"`
  - Response `choices[0].finish_reason` "length" is normalized to `finishReason: "max_tokens"`
  - Response `usage.prompt_tokens` and `usage.completion_tokens` are extracted correctly
  - Structured log includes model, duration, token counts, finish reason, request ID

- **Error paths**:
  - Timeout (AbortError after 30s) returns `ProviderErrorResponse` with `errorCode: "TIMEOUT"` and user-safe message
  - HTTP 401 response returns `errorCode: "AUTH_FAILED"` and user-safe message
  - HTTP 403 response returns `errorCode: "AUTH_FAILED"` and user-safe message
  - HTTP 429 response returns `errorCode: "RATE_LIMITED"` and user-safe message
  - HTTP 400 response returns `errorCode: "BAD_REQUEST"` and user-safe message
  - HTTP 500 response returns `errorCode: "PROVIDER_ERROR"` and user-safe message
  - HTTP 502 response returns `errorCode: "PROVIDER_ERROR"` and user-safe message
  - HTTP 503 response returns `errorCode: "PROVIDER_ERROR"` and user-safe message
  - Network error (fetch rejection) returns `errorCode: "PROVIDER_ERROR"` and user-safe message
  - Error log includes error code, model, duration, request ID (but not API key or full prompt)

- **Security invariants**:
  - API key never appears in logged output (check console.log calls)
  - API key never appears in returned `ProviderResponse` (success or error)
  - Full prompt text is never logged (only model, tokens, duration, metadata)
  - Stack traces and raw provider errors do not leak to user-safe messages

- **Edge cases**:
  - Empty response `choices` array is handled safely (returns error)
  - Missing `message.content` is handled safely (returns error)
  - Malformed JSON response is handled safely (returns error)
  - Missing `usage` object is handled safely (returns error or zero tokens)
  - Multiple calls with different request IDs are logged independently

## Verification commands

After implementation, run all verification commands in sequence:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

All commands must pass with zero errors. Additionally, perform manual verification:

```bash
# Verify no Anthropic SDK references remain
grep -r "@anthropic-ai/sdk" src/
grep -r "import Anthropic" src/

# Verify environment variable migration is complete
grep -r "ANTHROPIC_API_KEY" src/
grep -r "ANTHROPIC_MODEL" src/

# Expected: only historical references in specs/ and documentation, no code references
```

## Risks and pending decisions

### Identified risks

1. **OpenRouter API compatibility changes**: OpenRouter's OpenAI-compatible API may have subtle differences from the documented behavior. Mitigation: implement robust error handling and response validation; test against actual OpenRouter API during development (if a test key is available) or during first deployment with production key.

2. **Token usage tracking differences**: OpenRouter may report token counts differently than Anthropic's native API. Mitigation: verify token counts in logs during initial deployment; adjust if necessary; token counts are informational only and do not affect response correctness.

3. **Finish reason mapping**: OpenRouter's finish reasons may include additional values beyond "stop" and "length" (e.g., "content_filter", "tool_calls"). Mitigation: map unknown finish reasons to "stop" as a safe default; add logging to detect unexpected values; update mapping if new reasons need distinct handling.

4. **Rate limit behavior**: OpenRouter may have different rate limit policies than direct Anthropic API. Mitigation: existing rate limit error handling remains unchanged; monitor logs for rate limit occurrences; adjust request patterns or upgrade plan if needed.

5. **Model availability**: The `anthropic/claude-3.5-haiku` model identifier may change or become unavailable. Mitigation: use environment variable for model selection; document expected format; fail fast at startup if model is invalid rather than at request time.

6. **Timeout precision**: Native fetch with `AbortSignal.timeout()` may behave differently than Anthropic SDK's timeout. Mitigation: test timeout behavior explicitly; ensure 30-second limit is enforced consistently; log timeout events to verify behavior in production.

7. **HTTP header requirements**: OpenRouter may enforce or recommend additional headers beyond documented requirements. Mitigation: include recommended headers (HTTP-Referer, X-Title); monitor error responses for missing header warnings; update headers if needed based on production feedback.

8. **Cost differences**: OpenRouter pricing for Anthropic models may differ from direct Anthropic API pricing. Mitigation: this is expected and intentional for unified provider access; monitor usage and cost in production; adjust budget if necessary; cost is not a blocking concern for this refactoring.

### Pending decisions

- **D7-A — OpenRouter API key availability**: An OpenRouter API key must be provisioned before deployment. This refactoring assumes the key will be available and configured in the deployment environment (Vercel environment variables). If the key is not yet available, deployment and live testing will be blocked until the key is provisioned.

- **D7-B — Model identifier verification**: The exact model identifier format for Claude 3.5 Haiku on OpenRouter should be verified against OpenRouter's current model catalog. This spec assumes `anthropic/claude-3.5-haiku` based on OpenRouter's typical naming convention (provider/model-name). If the actual identifier differs, the `OPENROUTER_MODEL` value in deployment configuration must be updated.

- **D7-C — Site URL configuration**: The `OPENROUTER_SITE_URL` header is optional but recommended by OpenRouter for attribution and analytics. Decision needed: use the actual Cadre AI chatbot public URL (once deployed), use Cadre's main website URL, or leave empty. This can be decided at deployment time and does not block implementation.

- **D7-D — Backward compatibility during migration**: If the application is already deployed with Anthropic API key, the migration requires updating environment variables in production. Decision needed: perform deployment update during a maintenance window, or support both configurations temporarily with a feature flag. Recommend: direct cutover with verified test deployment first.

### Contradictions with plan.md

- **Architecture diagram**: `plan.md` section 5 shows "Anthropic LLM Provider" in the architecture diagram. This should be updated to "LLM Provider (OpenRouter)" or remain generic as "LLM Provider" since the abstraction is provider-neutral. The diagram is illustrative and does not dictate implementation, so this is a documentation update rather than a scope change.

- **Technology stack**: `plan.md` section 6 lists "Anthropic API" in the proposed stack. This should be updated to "OpenRouter API" or "Claude via OpenRouter" to reflect the actual provider. This is a documentation correction that aligns with the user's request to use OpenRouter instead of direct Anthropic integration.

- **Environment variables**: Multiple sections reference `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`. All references should be updated to `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` for consistency. This includes `CLAUDE.md`, specs, security checklists, and agent memory files.

These contradictions are expected given the refactoring scope and will be resolved as part of the documentation updates in Task 7.

## Notes for implementation

- The provider interface (`ProviderRequest`, `ProviderResponse`) is already provider-neutral and requires no changes. This makes the refactoring a clean internal swap within the provider module.
- The orchestration layer (`src/app/api/chat/route.ts`) depends only on the provider interface and should require zero changes if the interface contract is preserved.
- OpenRouter's OpenAI-compatible format is well-documented and widely tested, reducing integration risk compared to a proprietary API format.
- Using native `fetch` instead of adding a new dependency keeps the refactoring minimal and avoids introducing new supply-chain risk.
- The 30-second timeout is implemented using `AbortSignal.timeout(30000)`, which is available in Node.js 20+. Verify this works correctly in the target Node.js version.
- Structured logging must exclude full prompt text and API keys, exactly as the current implementation does. Do not log request/response bodies, only metadata (model, tokens, duration, status).
- All tests should remain deterministic and not require network access. Mock `fetch` calls and responses explicitly using Vitest's mocking capabilities.
- If the developer encounters undocumented OpenRouter behavior during implementation, document it in the spec or add a note in the code with a reference to OpenRouter's support or changelog.
