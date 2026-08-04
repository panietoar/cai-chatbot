# P4-S4 — Complete End-to-End API Orchestration

Status: APPROVED
Plan phase: Phase P4 — Grounded Anthropic response pipeline

## Outcome

Replace the placeholder response in `POST /api/chat` with complete orchestration connecting validation → input guardrails → retrieval → retrieval guardrails → context assembly → provider → output guardrails. Add structured logging with request IDs, duration, retrieval IDs, prompt version, model name, outcome, error category, and token usage where available.

## In scope

1. Wire the full pipeline in [src/app/api/chat/route.ts](src/app/api/chat/route.ts):
   - Generate request ID using Node.js `crypto.randomUUID()`
   - Invoke `retrieveKnowledge()` from `lib/retrieval/retrieval.ts`
   - Invoke `checkRetrievalGuardrails()` from `lib/guardrails/retrieval-guardrails.ts`
   - Return safe fallback when retrieval guardrails fail (no matches or all invalid)
   - Invoke `assembleContext()` from `lib/prompts/context.ts`
   - Invoke `generateResponse()` from `lib/llm/provider.ts`
   - Invoke `checkOutputGuardrails()` from `lib/guardrails/output-guardrails.ts`
   - Return safe fallback when output guardrails fail
   - Map provider errors to user-safe responses
2. Add structured logging at key decision points:
   - Log successful orchestration outcome with request ID, duration, retrieval match count/IDs, prompt version, model name, token usage
   - Log fallback when retrieval fails (reason: no matches or validation failure)
   - Log output guardrail failures (reason category)
   - Log provider failures (error code)
   - Never log secrets, full prompts, or request bodies
3. Add integration tests covering:
   - Successful response with knowledge match
   - Unsupported question → safe fallback (no retrieval matches)
   - Invalid retrieved knowledge → safe fallback (all invalid entries)
   - Unsafe output → safe fallback (output guardrails reject)
   - Provider timeout → user-safe error
   - Provider authentication failure → user-safe error
   - Provider generic error → user-safe error
4. Remove placeholder response and related comments

## Out of scope

- UI changes or chat interface modifications
- Conversation state management beyond in-request history
- Streaming responses
- Response caching or optimization
- Database or persistent storage
- Real calendar booking or portal integration
- Multi-turn conversation memory across sessions
- Rate limiting or usage quotas
- Analytics dashboards or telemetry aggregation
- Custom logging infrastructure (use console.log with structured JSON)
- Retry logic or circuit breakers
- Model fallback to alternative providers

## Current-state evidence

From repository inspection on 2026-08-04:

### Existing implementation

- [src/app/api/chat/route.ts](src/app/api/chat/route.ts): Implements validation and input guardrails, returns placeholder response after line 59
- [src/lib/retrieval/retrieval.ts](src/lib/retrieval/retrieval.ts): Exports `retrieveKnowledge(query, options?)` returning `RetrievalResult`
- [src/lib/guardrails/retrieval-guardrails.ts](src/lib/guardrails/retrieval-guardrails.ts): Exports `checkRetrievalGuardrails(result)` returning `RetrievalGuardrailResult` with `safe`, `validEntries`, `reason`; exports `SAFE_FALLBACK_MESSAGE` constant
- [src/lib/prompts/context.ts](src/lib/prompts/context.ts): Exports `assembleContext(request)` accepting `ContextAssemblyRequest` and returning `AssembledContext | ContextAssemblyError`
- [src/lib/llm/provider.ts](src/lib/llm/provider.ts): Exports `generateResponse(request)` accepting `ProviderRequest` and returning `Promise<ProviderResponse>` where response is `{ type: "success" | "error", ... }`
- [src/lib/guardrails/output-guardrails.ts](src/lib/guardrails/output-guardrails.ts): Exports `checkOutputGuardrails(text)` returning `OutputGuardrailResult` with `safe`, `reason`, `originalText`
- [src/lib/chat/contracts.ts](src/lib/chat/contracts.ts): Defines `ChatRequest`, `ChatSuccessResponse`, `ChatErrorResponse`, `ChatErrorCode` including `KNOWLEDGE_UNAVAILABLE`

### Existing tests

- [src/app/api/chat/route.test.ts](src/app/api/chat/route.test.ts): Covers validation and input guardrails; tests expect placeholder response for valid requests
- Individual module tests exist for retrieval, guardrails, context, provider, and output validation

### Package configuration

- [package.json](package.json): Defines `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- Node.js 20+ required
- Vitest configured as test runner

### Environment

- [.env.example](.env.example): Specifies `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`

## Decisions and assumptions

1. **Request ID generation**: Use Node.js built-in `crypto.randomUUID()` for RFC 4122 v4 UUID generation; no external library needed
2. **Logging format**: Use structured JSON logs via `console.log(JSON.stringify({...}))` for consistency with existing provider logging
3. **Duration tracking**: Capture start time with `Date.now()` at route entry; log duration in milliseconds
4. **Prompt version**: Hard-code to `"v1"` in context assembly request to match current `SYSTEM_PROMPT_V1`
5. **History conversion**: Map `ChatRequest.history` (array of `{userMessage, assistantMessage}`) to provider `UserMessage[]` format with alternating `role: "user" | "assistant"`
6. **Safe fallback reuse**: Use `SAFE_FALLBACK_MESSAGE` from retrieval guardrails module for all knowledge-unavailable scenarios
7. **Error code mapping**: Map provider `ErrorCode` to appropriate `ChatErrorCode`:
   - `TIMEOUT`, `RATE_LIMITED`, `PROVIDER_ERROR` → `INTERNAL_ERROR`
   - `AUTH_FAILED` → `INTERNAL_ERROR` (never expose auth issues to user)
   - `BAD_REQUEST` → `INTERNAL_ERROR` (indicates implementation bug)
8. **Token usage**: Log `inputTokens` and `outputTokens` from provider success response when available
9. **Retrieval options**: Use default retrieval options (no custom threshold or limit override) for initial implementation
10. **Context assembly error handling**: Treat context assembly errors as internal errors; log reason but return generic user-safe message

## Executable tasks

### Task 1: Wire retrieval and retrieval guardrails

In [src/app/api/chat/route.ts](src/app/api/chat/route.ts):

1. Add imports:
   ```typescript
   import { retrieveKnowledge } from "../../../lib/retrieval/retrieval";
   import { 
     checkRetrievalGuardrails, 
     SAFE_FALLBACK_MESSAGE 
   } from "../../../lib/guardrails/retrieval-guardrails";
   ```
2. After input guardrails pass, call `retrieveKnowledge(validationResult.data.message)`
3. Call `checkRetrievalGuardrails(retrievalResult)`
4. If `!guardrailResult.safe`:
   - Return `ChatSuccessResponse` with `message: SAFE_FALLBACK_MESSAGE`
   - Log structured event with request ID, outcome: "fallback", reason: guardrailResult.reason

### Task 2: Wire context assembly

1. Add imports:
   ```typescript
   import { assembleContext } from "../../../lib/prompts/context";
   import type { UserMessage } from "../../../lib/llm/provider";
   ```
2. Generate request ID: `const requestId = crypto.randomUUID()`
3. Convert `validationResult.data.history` to `UserMessage[]`:
   - Flatten each `ChatTurn` into two messages: `{role: "user", content: userMessage}` and `{role: "assistant", content: assistantMessage}`
4. Call `assembleContext()` with:
   - `systemPromptVersion: "v1"`
   - `knowledge: guardrailResult.validEntries` (array of `ScoredEntry`)
   - `currentQuery: validationResult.data.message`
   - `conversationHistory: convertedHistory`
   - `requestId: requestId`
5. If result has `reason` property (is error):
   - Log structured error with request ID, error: "context_assembly_failed", reason
   - Return `ChatErrorResponse` with code `INTERNAL_ERROR`

### Task 3: Wire provider and output guardrails

1. Add imports:
   ```typescript
   import { generateResponse } from "../../../lib/llm/provider";
   import { checkOutputGuardrails } from "../../../lib/guardrails/output-guardrails";
   ```
2. Call `generateResponse()` with:
   - `systemPrompt: assembledContext.systemPrompt`
   - `userMessages: assembledContext.messages`
   - `maxTokens: 1000` (reasonable default for concise answers)
   - `temperature: 0.3` (lower temperature for grounded, consistent responses)
   - `requestId: requestId`
3. If `providerResponse.type === "error"`:
   - Map `providerResponse.errorCode` to `INTERNAL_ERROR`
   - Return `ChatErrorResponse` with user-safe message from provider
   - Log structured event with request ID, error: "provider_failed", errorCode, durationMs
4. If `providerResponse.type === "success"`:
   - Call `checkOutputGuardrails(providerResponse.text)`
   - If `!outputResult.safe`:
     - Return `ChatSuccessResponse` with `message: SAFE_FALLBACK_MESSAGE`
     - Log structured event with request ID, outcome: "output_rejected", reason: outputResult.reason, originalText: outputResult.originalText (for debugging)
   - If `outputResult.safe`:
     - Return `ChatSuccessResponse` with `message: providerResponse.text`
     - Log structured success event

### Task 4: Add structured logging

Define logging helper at module level in [src/app/api/chat/route.ts](src/app/api/chat/route.ts):

```typescript
interface OrchestrationLogEvent {
  timestamp: string;
  requestId: string;
  durationMs: number;
  outcome: "success" | "fallback" | "error";
  retrievalMatchCount?: number;
  retrievalIds?: string[];
  promptVersion?: string;
  modelName?: string;
  inputTokens?: number;
  outputTokens?: number;
  errorCode?: string;
  reason?: string;
}

function logOrchestration(event: OrchestrationLogEvent): void {
  console.log(JSON.stringify(event));
}
```

Invoke at each exit point with appropriate fields populated.

### Task 5: Replace placeholder and remove dead code

1. Delete placeholder response block (lines 59-64)
2. Remove placeholder-related comments
3. Verify no unreachable code remains

### Task 6: Add integration tests

In [src/app/api/chat/route.test.ts](src/app/api/chat/route.test.ts):

1. Mock all imported lib modules at suite level:
   ```typescript
   import * as retrieval from "../../../lib/retrieval/retrieval";
   import * as retrievalGuardrails from "../../../lib/guardrails/retrieval-guardrails";
   import * as context from "../../../lib/prompts/context";
   import * as provider from "../../../lib/llm/provider";
   import * as outputGuardrails from "../../../lib/guardrails/output-guardrails";
   ```
2. Add new describe block: `describe("Full pipeline orchestration", () => { ... })`
3. Add tests:
   - **Successful grounded response**: Mock retrieval → valid knowledge → context → provider success → output passes → 200 with model text
   - **No retrieval matches**: Mock retrieval → 0 matches → fallback before provider called → 200 with `SAFE_FALLBACK_MESSAGE`
   - **Invalid retrieved knowledge**: Mock retrieval → matches exist → guardrails fail (all_invalid) → fallback → 200 with `SAFE_FALLBACK_MESSAGE`
   - **Output guardrails rejection**: Mock pipeline → provider success → output unsafe (contains_url) → fallback → 200 with `SAFE_FALLBACK_MESSAGE`
   - **Provider timeout**: Mock pipeline → provider error (TIMEOUT) → 500 with `INTERNAL_ERROR` and timeout user message
   - **Provider auth failure**: Mock pipeline → provider error (AUTH_FAILED) → 500 with `INTERNAL_ERROR` and auth user message
   - **Provider generic error**: Mock pipeline → provider error (PROVIDER_ERROR) → 500 with `INTERNAL_ERROR` and generic user message
4. In each test:
   - Assert correct HTTP status
   - Assert correct response body structure and error codes
   - Assert provider is/isn't called as expected
   - Verify no internal details leak to user-facing messages

### Task 7: Update existing placeholder tests

In [src/app/api/chat/route.test.ts](src/app/api/chat/route.test.ts):

1. Remove placeholder-specific assertions from "Valid safe requests" tests
2. Add mocks to existing valid request tests so they produce real responses
3. Ensure all tests pass with new orchestration

## Acceptance criteria

### Functional requirements

1. A valid request with supported question receives a grounded response from the provider after passing all guardrails
2. A request matching no knowledge entries returns `SAFE_FALLBACK_MESSAGE` without calling the provider
3. A request with only invalid knowledge entries returns `SAFE_FALLBACK_MESSAGE` without calling the provider
4. A provider response failing output guardrails returns `SAFE_FALLBACK_MESSAGE` to the user
5. Provider timeout, auth failure, or generic errors return 500 with `INTERNAL_ERROR` code and provider's user-safe message
6. No placeholder response or comment remains in the route handler

### Logging requirements

7. Successful responses log: request ID, outcome: "success", retrieval match count/IDs, prompt version, model name, input/output tokens, duration
8. Knowledge fallback logs: request ID, outcome: "fallback", reason (no_matches | all_invalid), retrieval match count, duration
9. Output rejection logs: request ID, outcome: "fallback", reason (output guardrail failure type), original rejected text, duration
10. Provider errors log: request ID, outcome: "error", error code, duration
11. No logs contain API keys, full prompts, or raw request bodies

### Test coverage

12. Integration tests cover successful pipeline, no-match fallback, invalid-knowledge fallback, output-rejected fallback, provider timeout, provider auth error, provider generic error
13. Existing validation and input-guardrail tests still pass
14. All tests use proper mocks and don't require live API access

### Code quality

15. No `any` types at module boundaries
16. All imports are used
17. Request ID is generated once and passed through the pipeline
18. Duration calculation is accurate (start time captured at route entry)
19. History conversion correctly alternates user/assistant roles
20. Error handling never throws unhandled exceptions to the user

## Tests

### Unit-level verification

Since the orchestration is integration by nature, most verification happens at integration level. However, ensure:

- Request ID generation produces valid UUIDs
- History conversion produces correct `UserMessage[]` structure
- Logging helper produces valid JSON

### Integration tests

See Task 6 for detailed integration test requirements covering:

1. Success path: validation → input guards → retrieval → retrieval guards → context → provider → output guards → 200 response
2. No knowledge: validation → input guards → retrieval (0 matches) → fallback → 200 with `SAFE_FALLBACK_MESSAGE`
3. Invalid knowledge: validation → input guards → retrieval → retrieval guards fail (all_invalid) → fallback → 200
4. Output rejected: full pipeline → output guards fail → fallback → 200
5. Provider timeout: full pipeline → provider times out → 500 with `INTERNAL_ERROR`
6. Provider auth failure: full pipeline → provider auth fails → 500 with `INTERNAL_ERROR`
7. Provider generic error: full pipeline → provider error → 500 with `INTERNAL_ERROR`

Each test must assert:
- Correct HTTP status code
- Correct response structure matching `ChatSuccessResponse` or `ChatErrorResponse`
- Appropriate error codes
- No internal details in user-facing messages
- Provider is called only when appropriate (not for knowledge fallbacks)

### Manual verification

After implementation:

1. Start dev server with valid `ANTHROPIC_API_KEY`
2. Send a supported question (e.g., "What does Cadre AI do?") → verify grounded response
3. Send an unsupported question (e.g., "What is the capital of France?") → verify fallback message
4. Check server logs for structured JSON output with request IDs and durations
5. Verify logs contain no secrets or full prompts

## Verification commands

All commands must pass before completion:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected results:

- **Lint**: No errors or warnings from new code
- **Typecheck**: No type errors; all imports resolve
- **Test**: All existing tests pass; new integration tests pass with mocks
- **Build**: Production build succeeds with no runtime errors

## Risks and pending decisions

### Resolved for this story

- **Decision D5 (Anthropic model)**: Implementation references model through `getProviderConfig()` which reads from `ANTHROPIC_MODEL` env var; no hardcoded model ID in orchestration
- **Request ID format**: Using Node.js `crypto.randomUUID()` (available since Node 14.17, well before required Node 20+)
- **Logging format**: Consistent with existing provider structured logging
- **History limit enforcement**: Already enforced by validation layer (max 10 turns)

### Risks

1. **Provider latency**: Real model calls will be slower than placeholder; acceptable for MVP, streaming not in scope
2. **Cost**: Each request consumes tokens; expected for LLM-based system, usage monitoring not in scope for P4-S4
3. **Context assembly edge cases**: Empty knowledge arrays are valid input to context assembly; tested in P4-S2
4. **Output guardrail false positives**: Rare legitimate responses might be rejected; acceptable trade-off for security
5. **Log volume**: Structured logging on every request increases log volume; acceptable for MVP observability
6. **Request ID collision**: UUID v4 collision probability is negligible (1 in 2^122)

### Pending decisions for later stories

- **Decision D4 (Approved URLs)**: Output guardrails will check URLs against allowlist, but actual approved URLs for actions (strategy call, portal) are defined in P3-S1 knowledge schema; orchestration does not modify or inject actions
- **Decision D6 (Live evaluation)**: P6-S2 will add opt-in live evaluations; this story's tests remain deterministic and offline

### Dependencies

This story depends on:

- ✅ P2-S1: Shared chat types and validation
- ✅ P2-S2: Input guardrails
- ✅ P2-S3: Chat API skeleton
- ✅ P3-S1: Knowledge schema
- ✅ P3-S2: Deterministic retrieval
- ✅ P3-S3: Retrieval guardrails
- ✅ P4-S1: Anthropic provider
- ✅ P4-S2: System prompt and context assembly
- ✅ P4-S3: Output validation

All dependencies are satisfied; all prerequisite specs are APPROVED.

### Blocks

Successful completion of P4-S4 unblocks:

- P5-S1: Basic chat interaction (UI needs working API)
- P6-S1: Golden question evaluations (needs full pipeline)
- P6-S3: Security hardening (needs complete attack surface)
