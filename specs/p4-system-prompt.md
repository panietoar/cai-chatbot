# P4-S2 — Version the System Prompt and Context Assembly

Status: APPROVED
Plan phase: P4

## Outcome

Establish a reviewable, versioned system prompt separate from route and orchestration logic. Define and implement deterministic context assembly that combines trusted instructions, validated knowledge entries, limited conversation history, and the current user query in distinct, auditable sections. Ensure user input is never concatenated into the system instruction string, and that only approved knowledge makes it into model context.

## In scope

- Create `src/lib/prompts/system-prompt.ts` with:
  - Versioned system prompt as an exported constant (v1.0)
  - Prompt should instruct the model to act as a Cadre AI support assistant
  - Prompt should emphasize grounding answers in provided knowledge only
  - Prompt should include guidance on what NOT to do: invent pricing, claims, URLs, or capabilities not in knowledge
  - Prompt should specify response style: concise, professional, action-oriented
  - Include clear instruction that unknown/unsupported questions warrant a transparent fallback, not speculation
  - No secrets, API keys, or configuration should be embedded
  
- Create `src/lib/prompts/context.ts` with:
  - Type `ContextAssemblyRequest` containing:
    - `systemPromptVersion: string`
    - `knowledge: ScoredEntry[]` (validated entries from retrieval guardrails)
    - `conversationHistory: Array<{ role: "user" | "assistant"; content: string }>` (max 10 turns)
    - `currentQuery: string` (user's current message)
    - `requestId: string` (for tracing)
  
  - Type `AssembledContext` containing:
    - `messages: Array<{ role: "user" | "assistant"; content: string }>` (normalized for Anthropic)
    - `systemPrompt: string`
    - `promptVersion: string`
    - `metadata: { knowledgeIds: string[]; historyTurns: number }`

  - Exported function `assembleContext(request: ContextAssemblyRequest): AssembledContext` that:
    - Validates input (no null/undefined values, knowledge array non-empty, history array ≤ 10 entries)
    - Returns early with error context if validation fails
    - Constructs the system prompt from versioned template
    - Formats knowledge as a delimited section (e.g., "--- APPROVED KNOWLEDGE ---")
    - Builds messages array: conversation history + current query
    - Ensures user input is part of messages array, never concatenated into system instruction
    - Includes requestId in metadata for observability
    - Returns fully assembled context ready for provider

- Create `src/lib/prompts/types.ts` with:
  - `ContextAssemblyRequest`, `AssembledContext`, and related types
  - Keep provider-agnostic (message format compatible with Anthropic, but no provider-specific fields)

- Create comprehensive tests in `src/lib/prompts/context.test.ts`:
  - System prompt version is correctly exported and stable
  - Context assembly validates required fields
  - Empty knowledge array is rejected or handled safely
  - Conversation history exceeding 10 turns is rejected
  - User input appears in messages array, not in system prompt
  - Knowledge is formatted as delimited text section
  - Request ID is preserved in metadata
  - Messages array structure matches Anthropic contract (role + content)
  - Null/undefined values trigger error context
  - Multiple knowledge entries are correctly combined (e.g., topic + topic, or topic + FAQ)

## Out of scope

- Prompt optimization or iterative tuning (happens after baseline is live)
- Model-specific instruction formatting beyond current Anthropic contract
- Semantic prompt injection detection (input guardrails handle this in P2-S2)
- Output validation or response filtering (P4-S3)
- Chat API route orchestration (P4-S4)
- User-visible prompt version disclosure (metadata only)
- Dynamic prompt generation based on user input (system prompt is static for MVP)
- Conversation state management or persistence (stateless assembly only)

## Current-state evidence

- P4-S1 complete: `src/lib/llm/provider.ts` and `provider.test.ts` implemented (commit c21c976)
- Provider generates responses with normalized ProviderResponse contract
- P3-S3 guarantees only validated KnowledgeEntry objects reach context assembly
- Input guardrails (P2-S2) already classify unsafe input, so system prompt can assume safe user intent
- Chat API route at `src/app/api/chat/route.ts` currently passes placeholder to provider
- No system prompt or context assembly exists yet
- Anthropic provider imported and ready to receive structured ProviderRequest
- Test suite currently has 118 tests; P4-S2 adds ~15-20 new tests

## Decisions and assumptions

**Decision:** System prompt is versioned as a simple string constant (`SYSTEM_PROMPT_V1`) for MVP. No dynamic routing or A/B testing of prompts.

**Decision:** Context assembly is a pure function (no side effects, no network I/O) that accepts validated inputs and returns a normalized output ready for the provider.

**Decision:** Knowledge entries in context are formatted as delimited blocks (e.g., "Topic: X\nContent: Y\n---") rather than JSON. This is human-readable in logs and easier for the model to parse than escaped JSON strings.

**Decision:** Conversation history is included as-is from the API contract (P2-S1). Context assembly does not replay or rescore history; it assumes the API route already validated and limited it to 10 turns max.

**Decision:** If knowledge array is empty, context assembly can still return a valid context (with empty knowledge section). The model may then fall back to its own knowledge, but output guardrails (P4-S3) will catch unsupported claims.

**Decision:** Request ID is passed through context for tracing but is not interpreted or modified by context assembly. The API route will create and propagate request IDs.

**Assumption:** The system prompt for MVP focuses on role definition, grounding rules, and refusal guidance. It does NOT include example responses or few-shot prompting; that increases token consumption and complexity without proven benefit for MVP scope.

**Assumption:** Knowledge entries are already deduplicated and ranked by P3-S2. Context assembly does not re-rank or filter by confidence; it includes all validated entries up to a reasonable token budget (deferred to P4-S4 if token limiting is needed).

**Assumption:** User input safety has been validated by input guardrails (P2-S2). Context assembly does not apply additional prompt-injection detection.

**Assumption:** Version string (e.g., "v1.0") is hardcoded and matches the constant name. Schema version changes require explicit code review and version bump.

## Executable tasks

1. Create `src/lib/prompts/types.ts` with TypeScript definitions:
   - `ContextAssemblyRequest` type
   - `AssembledContext` type
   - Metadata object shape

2. Create `src/lib/prompts/system-prompt.ts`:
   - Export `SYSTEM_PROMPT_VERSION = "v1.0"`
   - Export `SYSTEM_PROMPT_V1 = "You are a customer support assistant..."`
     - Include core instructions for Cadre support
     - Emphasize grounding in provided knowledge
     - Clear refusal guidance for unsupported/unknown topics
     - Professional, concise response style

3. Create `src/lib/prompts/context.ts`:
   - Import types from `./types.ts`
   - Implement `assembleContext(request: ContextAssemblyRequest): AssembledContext`
   - Input validation: check for null/undefined, knowledge array, history length ≤ 10
   - Format knowledge as text: each entry as "Topic: X\nContent: Y\n---"
   - Build messages array from history + current query
   - Return fully formed context with metadata

4. Create `src/lib/prompts/context.test.ts`:
   - Import `describe`, `it`, `expect` from vitest
   - Create helper functions for test data (valid request, valid entry, etc.)
   - Test: system prompt version is exported and stable
   - Test: context assembly with valid inputs returns expected structure
   - Test: empty knowledge array is accepted
   - Test: conversation history > 10 entries is rejected
   - Test: null currentQuery is rejected
   - Test: user input appears in messages, not in system prompt
   - Test: knowledge is formatted with delimiters
   - Test: request ID is preserved in metadata
   - Test: messages structure matches Anthropic contract (role + content)
   - Test: multiple knowledge entries are combined correctly
   - Test: prompts version matches system-prompt.ts export

5. Update `src/lib/llm/provider.ts` (if needed):
   - Confirm ProviderRequest accepts systemPrompt + messages array
   - Verify no changes needed; provider should be agnostic to assembly details

6. Import context assembly into chat API route (P4-S4 will integrate; this spec only creates the module)

## Acceptance criteria

- System prompt is stored in a separate, reviewable file (`system-prompt.ts`)
- Context assembly is a pure function that accepts validated inputs
- User input never appears in the system instruction string
- All knowledge entries are validated before reaching context assembly (guardrails check this)
- Conversation history is limited to 10 turns max at the API boundary (P2-S1 enforces; context assembly assumes it)
- Request ID is threaded through for tracing
- Tests confirm that invalid input is rejected or safely handled
- Metadata is clear enough for debugging and audit (knows which knowledge IDs were used, history length)
- No secrets, API keys, or raw model details leak into the context or logs
- Messages array structure is compatible with Anthropic provider interface

## Tests

**Unit tests** (`src/lib/prompts/context.test.ts`):

1. Context assembly with valid request returns correct shape
2. System prompt version is stable
3. Knowledge entries are formatted with topic and content delimiters
4. Empty knowledge array is handled gracefully
5. Conversation history > 10 turns is rejected
6. Null/undefined currentQuery is rejected
7. User input appears in messages array, not system prompt
8. Request ID is included in metadata
9. Messages structure has role + content for each entry
10. Multiple knowledge entries from different topics are combined
11. Knowledge IDs are tracked in metadata
12. History turn count is accurate in metadata

## Verification commands

```bash
npm run lint      # ESLint: no errors in prompts/**
npm run typecheck # TypeScript: no type errors in prompts/**
npm test          # Vitest: all tests in prompts/**.test.ts pass
npm run build     # Production build succeeds
```

All four commands must pass before the story is considered complete.

## Risks and pending decisions

### Risks

1. **Token budget:** If knowledge entries are large or numerous, context may grow without limit. Mitigation: P4-S4 can add token budgeting if needed; for MVP, assume bounded knowledge size.

2. **Prompt injection via knowledge:** If retrieval includes adversarial content, the model might follow embedded instructions in knowledge instead of system prompt. Mitigation: Output guardrails (P4-S3) validate model output; knowledge is sourced from approved corpus, not user input.

3. **History replay:** If conversation history includes adversarial exchanges, they may influence the model. Mitigation: Input guardrails (P2-S2) catch obvious attacks; history is limited to 10 turns and assumed to be from the same session.

### Pending Decisions

- **D4 — Approved URLs:** If knowledge entries include action URLs, context assembly will include them. URL validation is deferred to output guardrails (P4-S3) and guardrails at retrieval time (P3-S3). No change to context assembly needed.

- **Token budgeting:** If production reveals that contexts are too large for cost/latency, P4-S4 or a follow-up can add selective truncation. For MVP, assume knowledge size is bounded.

- **Prompt tuning:** System prompt is intentionally simple for MVP. Optimization (few-shot, examples, detailed role play) can be added post-launch if golden questions reveal need.

---

## Story dependency chain

```
P4-S1 (Anthropic provider) ✓
    ↓
P4-S2 (this spec: System prompt + context assembly)
    ↓
P4-S3 (Output guardrails)
    ↓
P4-S4 (End-to-end orchestration)
    ↓
P5-S1 (Chat UI)
```

## Related documentation

- `plan.md` §3: MVP scope (system prompt is in scope; prompt tuning is not)
- `plan.md` §5: Architecture and safety harness (context assembly is the "context assembly" box)
- `CLAUDE.md`: Code quality standards (no secrets, no `any`, focused modules)
- `.claude/rules/api-design.md`: Provider-boundary validation (will apply to ProviderRequest construction)

