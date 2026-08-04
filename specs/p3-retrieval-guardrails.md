# P3-S3 — Retrieval Guardrails and Safe Fallback

Status: DRAFT
Plan phase: P3

## Outcome

Implement retrieval guardrails that validate approval state, schema version, freshness metadata, and link allowlist membership for every retrieved knowledge entry. Define and implement a canonical safe fallback response for situations where retrieval returns no matches, invalid entries, or insufficient confidence. Ensure that invalid retrieval results can never reach prompt assembly or model invocation.

## In scope

- Create `src/lib/guardrails/retrieval-guardrails.ts` with typed guardrail interface and implementation
- Validate each retrieved entry:
  - Approval note is present and non-empty
  - Schema version matches expected version(s)
  - Effective date (if present) is valid ISO 8601 format
  - URL (if present) is in the approved allowlist
  - Entry ID, topic, content, and keywords are non-empty
- Define a canonical safe fallback response for:
  - Empty retrieval results (no matches above threshold)
  - All retrieved entries fail guardrail validation
  - Retrieval returns matches but confidence is insufficient
- Return typed guardrail results indicating: passed/failed, validated entries, reason for failure, fallback trigger
- Implement deterministic decision logic for when to use fallback vs. proceed with retrieval
- Comprehensive test coverage in `src/lib/guardrails/retrieval-guardrails.test.ts`:
  - Valid retrieval results pass guardrails
  - Empty retrieval triggers safe fallback
  - Invalid approval note blocks entry
  - Invalid schema version blocks entry
  - Malformed effective date blocks entry
  - Non-allowlisted URL blocks entry
  - Empty required fields block entry
  - Partial validation (some entries pass, some fail)
  - All entries fail validation triggers fallback

## Out of scope

- Model invocation or prompt assembly (P4-S2)
- Output guardrails for model responses (P4-S3)
- Semantic confidence scoring beyond retrieval scores (P3-S2 handles scoring)
- Dynamic fallback personalization or history-aware responses
- Integration with chat API route (P4-S4)
- User-visible error messages (API route will map guardrail results to HTTP responses)
- Link rendering or action UI (P5-S3)
- Retrieval quality metrics or telemetry beyond pass/fail decisions

## Current-state evidence

- P3-S1 complete: [specs/p3-knowledge-schema.md](p3-knowledge-schema.md) approved and implemented
- P3-S2 complete: [specs/p3-deterministic-retrieval.md](p3-deterministic-retrieval.md) approved and implemented
- Knowledge validation exists at [src/lib/knowledge/validation.ts](../src/lib/knowledge/validation.ts) with 21 passing tests
- Knowledge corpus at [src/lib/knowledge/corpus.ts](../src/lib/knowledge/corpus.ts) with 2 placeholder entries
- Link allowlist at [src/lib/knowledge/links.ts](../src/lib/knowledge/links.ts) with `isApprovedLink()` helper
- Retrieval at [src/lib/retrieval/retrieval.ts](../src/lib/retrieval/retrieval.ts) with 34 passing tests
- Input guardrails at [src/lib/guardrails/input-guardrails.ts](../src/lib/guardrails/input-guardrails.ts) with 30 passing tests
- Chat API at [src/app/api/chat/route.ts](../src/app/api/chat/route.ts) currently returns placeholder after validation and input guardrails
- Current test suite has 118 total passing tests
- [plan.md §5](../plan.md#L131-L154) defines retrieval guardrails as layer 2 of the safety harness
- [plan.md §14.2](../plan.md#L431-L438) defines golden questions for fallback behavior when knowledge is unavailable
- Decision gates D3 (approved knowledge) and D4 (approved URLs) remain unresolved but don't block guardrail implementation

## Decisions and assumptions

**Decision:** Retrieval guardrails operate on the `RetrievalResult` from P3-S2, not on individual queries or the raw corpus. This separates concerns: retrieval ranks and filters, guardrails validate what was retrieved.

**Decision:** Use the existing `validateKnowledgeEntry()` from P3-S1 as the core validation mechanism rather than duplicating validation logic. Retrieval guardrails orchestrate validation and decide whether to proceed or fallback.

**Decision:** Define a canonical fallback message that is transparent, action-oriented, and does not apologize excessively. Example: "I don't have verified information to answer that question. You can book a strategy call to discuss your needs directly with the Cadre team."

**Decision:** The fallback message references a strategy call but does not include a clickable link until D4 is resolved. The message remains useful as text guidance even without a URL.

**Decision:** When retrieval returns matches but all fail validation, treat it the same as no matches: return the safe fallback. Do not expose validation failure details to users.

**Decision:** When retrieval returns a mix of valid and invalid entries, accept only the valid ones. If at least one valid entry remains, proceed. If all entries are invalid, use the fallback.

**Decision:** Schema version validation accepts only `"v1"` for the MVP. Future versions can be added explicitly when schema changes occur.

**Decision:** Effective date validation checks only that the date is a valid ISO 8601 string if present. Freshness comparison (e.g., "is this entry stale?") is deferred until there's a real need and policy for knowledge expiration.

**Assumption:** The safe fallback message is a static string constant in the guardrails module, not dynamic or personalized based on user input, to keep the MVP simple and predictable.

**Assumption:** Guardrails return structured results (`{ safe: boolean, validEntries: ScoredEntry[], reason?: string }`) that the API route can use to decide whether to proceed to model invocation or return a fallback response.

**Assumption:** Empty retrieval (no matches above threshold) is a normal, expected outcome, not an error. It triggers the fallback but logs as expected behavior, not as a guardrail violation.

**Assumption:** The fallback message will be used verbatim in the API response for now. P4-S4 may add request context or metadata to the response, but the fallback content itself remains unchanged.

## Executable tasks

1. Create `src/lib/guardrails/retrieval-guardrails.ts`
2. Define types in `retrieval-guardrails.ts`:
   - `RetrievalGuardrailResult` interface with:
     - `safe: boolean` — true if retrieval is safe to use, false if fallback should be used
     - `validEntries: ScoredEntry[]` — entries that passed validation (empty if all failed or no matches)
     - `reason?: string` — explanation for fallback (e.g., "no_matches", "all_invalid", "confidence_insufficient")
   - `SafeFallbackResponse` type or constant
3. Implement `SAFE_FALLBACK_MESSAGE` constant:
   - Transparent, professional, action-oriented
   - No apologies or over-explanation
   - References strategy call without assuming a URL is available
   - Example: "I don't have verified information to answer that question. You can book a strategy call to discuss your needs directly with the Cadre team."
4. Implement `checkRetrievalGuardrails(retrievalResult: RetrievalResult): RetrievalGuardrailResult` function:
   - If `retrievalResult.matches` is empty, return safe=false, reason="no_matches", empty validEntries
   - For each match, validate using `validateKnowledgeEntry()`:
     - Check approval note is present and non-empty
     - Check schema version is "v1"
     - Check effective date (if present) is valid ISO 8601
     - Check URL (if present) is in approved allowlist using `isApprovedLink()`
     - Check id, topic, content, keywords are non-empty
   - Collect valid entries
   - If no valid entries remain after validation, return safe=false, reason="all_invalid", empty validEntries
   - If at least one valid entry remains, return safe=true, validEntries with only the valid ones
5. Export `SAFE_FALLBACK_MESSAGE` and `checkRetrievalGuardrails()`
6. Create `src/lib/guardrails/retrieval-guardrails.test.ts`:
   - **Happy path tests:**
     - Valid retrieval with one match passes guardrails
     - Valid retrieval with multiple matches passes guardrails
     - Retrieval with mix of valid and invalid entries returns only valid ones
   - **Empty retrieval tests:**
     - Empty retrieval result (no matches) triggers fallback with reason "no_matches"
   - **Validation failure tests:**
     - Entry with missing approval note fails validation
     - Entry with empty approval note fails validation
     - Entry with unknown schema version fails validation
     - Entry with invalid effective date (not ISO 8601) fails validation
     - Entry with URL not in allowlist fails validation
     - Entry with empty id/topic/content/keywords fails validation
   - **All-invalid tests:**
     - All entries fail validation triggers fallback with reason "all_invalid"
   - **Edge cases:**
     - Single invalid entry returns fallback
     - Entry with no URL (valid if other fields OK) passes
     - Entry with approved URL passes
     - Entry with valid effective date passes
7. Update `package.json` scripts if needed (verify existing `npm test` works)
8. Run verification: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`

## Acceptance criteria

- `checkRetrievalGuardrails(retrievalResult)` returns typed `RetrievalGuardrailResult`
- Empty retrieval returns safe=false with reason "no_matches"
- Invalid entries are filtered out; if at least one valid entry remains, safe=true
- If all entries are invalid, safe=false with reason "all_invalid"
- Schema version validation accepts only "v1"
- Effective date validation checks ISO 8601 format when date is present
- URL validation uses the approved allowlist via `isApprovedLink()`
- Validation reuses `validateKnowledgeEntry()` from P3-S1 where applicable
- `SAFE_FALLBACK_MESSAGE` is transparent, actionable, and does not expose internal details
- All tests pass (minimum 15 test cases covering empty retrieval, validation failures, partial validation, edge cases)
- No network access or external dependencies
- Module exports are typed and have no `any` at boundaries

## Tests

**Unit tests** (`src/lib/guardrails/retrieval-guardrails.test.ts`):

### Happy path
1. Valid retrieval with one match passes guardrails
2. Valid retrieval with multiple matches passes guardrails
3. Mix of valid and invalid entries returns only valid entries as safe=true

### Empty retrieval
4. Empty retrieval result triggers fallback with safe=false, reason="no_matches"

### Validation failures
5. Entry with missing approval note fails validation
6. Entry with empty approval note fails validation
7. Entry with invalid schema version (not "v1") fails validation
8. Entry with malformed effective date (not ISO 8601) fails validation
9. Entry with URL not in approved allowlist fails validation
10. Entry with empty ID fails validation
11. Entry with empty topic fails validation
12. Entry with empty content fails validation
13. Entry with empty keywords array fails validation

### All-invalid scenarios
14. All entries fail validation triggers fallback with safe=false, reason="all_invalid"
15. Single invalid entry triggers fallback

### Edge cases
16. Entry without URL field passes validation if other fields valid
17. Entry with approved URL passes validation
18. Entry with valid ISO 8601 effective date passes validation

## Verification commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All commands must pass with no errors or warnings introduced by this story.

## Risks and pending decisions

### Unresolved decision gates

**D3 — Approved knowledge**: Real Cadre-specific content is not yet available. Guardrails will work with placeholder content, but the fallback will be used more often than in production until real knowledge is added.

**D4 — Approved URLs**: Strategy call URL is not verified. The fallback message references a strategy call but provides no clickable link. This is acceptable for the guardrail layer; P4-S3 and P5-S3 will handle action rendering when D4 is resolved.

### Risks

1. **Fallback overuse with placeholder data**: Until D3 is resolved, most real user questions will trigger the fallback because the placeholder corpus has limited coverage. This is expected and will improve when real knowledge is added.

2. **Fallback message quality**: The static fallback message may not be ideal for all situations. Post-MVP, dynamic fallbacks based on question category could improve UX, but that's out of scope for now.

3. **No confidence threshold beyond retrieval**: The guardrails trust the retrieval module's scoring and threshold. If retrieval returns a low-scoring match that still exceeds the threshold, guardrails will pass it. Semantic confidence assessment is deferred.

4. **Validation performance**: The guardrails validate each retrieved entry individually. For a small corpus (< 100 entries), this is fast. If the corpus grows significantly, performance may need revisiting, but optimization is premature now.

### Contradictions

None identified. The spec aligns with:
- [plan.md §5](../plan.md#L131-L154) retrieval guardrails definition.
- [plan.md §14.2](../plan.md#L431-L438) fallback behavior for unsupported questions.
- [implementation-plan.md](../implementation-plan.md#L250-L264) P3-S3 definition.
- [CLAUDE.md](../CLAUDE.md#L21) prohibition on inventing information.

### Open questions for user

1. **Fallback message content**: Is the proposed fallback message ("I don't have verified information to answer that question. You can book a strategy call...") acceptable, or do you want different wording?

2. **Partial validation behavior**: When some entries pass and some fail, should the system proceed with the valid entries (current decision), or use the fallback when any entry fails? The spec assumes proceeding is better to maximize answer coverage.

3. **Effective date interpretation**: The spec validates only that the effective date is ISO 8601 format, not whether an entry is "stale". Should guardrails check staleness against the current date, and if so, what's the staleness threshold (e.g., 90 days, 1 year)?

4. **Fallback escalation path**: Should the fallback message include a contact email or URL even without D4 resolution (e.g., a general contact@ address), or remain link-free until exact URLs are verified?

## Dependencies

- P3-S1: Knowledge schema and validation (APPROVED and implemented)
- P3-S2: Deterministic retrieval (APPROVED and implemented)

## Next steps

After this story is approved and implemented:
- **P4-S1**: Implement Anthropic provider boundary
- **P4-S2**: Version system prompt and context assembly
- **P4-S3**: Implement output validation and approved actions
- **P4-S4**: Complete end-to-end API orchestration (will integrate retrieval guardrails)
