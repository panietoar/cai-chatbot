# P4-S3 — Implement Output Validation and Approved Actions

Status: APPROVED
Plan phase: P4

## Outcome

Implement runtime validation of model responses to detect and block non-approved URLs, invented pricing figures, claims about unsupported Cadre capabilities, and malformed output. Replace invalid output with the canonical safe fallback before returning to the client. Ensure every model response is validated and safely handled, preventing leakage of speculative claims or external links.

## In scope

- Create `src/lib/guardrails/output-guardrails.ts` with typed guardrail interface and implementation
- Validate each model response for:
  - Expected text shape (non-empty string, reasonable length)
  - Absence of exact pricing figures (e.g., "$X", "€Y", "cost is Z")
  - Absence of non-approved URLs (any URL not in the link allowlist)
  - Absence of claims about unsupported capabilities (e.g., "integrate with your CRM", "access real portal", "book a live call")
  - Absence of internal details leaked from prompts or knowledge (e.g., "based on schema v1", "retrieved from knowledge ID xyz")
  - Reasonable response length (e.g., <5000 characters to detect runaway generation)
- Define a canonical safe fallback response for output validation failures (reuses `SAFE_FALLBACK_MESSAGE` from P3-S3)
- Return typed guardrail results indicating: passed/failed, validation reason, optionally the original/sanitized text
- Implement deterministic decision logic for when to use fallback vs. return provider output
- Comprehensive test coverage in `src/lib/guardrails/output-guardrails.test.ts`:
  - Valid response (text, no URLs, no pricing, no unsupported claims) passes validation
  - Response with non-approved URL is blocked
  - Response with exact pricing figures (e.g., "$10,000", "€500") is blocked
  - Response with claims about unsupported features (e.g., "access the portal", "schedule a live meeting", "integrate with Salesforce") is blocked
  - Response with internal details (e.g., schema version mention, knowledge ID) is blocked
  - Empty or null response is rejected
  - Oversized response (>5000 chars) is blocked
  - Legitimate mentions of Cadre capabilities pass (e.g., "Cadre helps with AI implementation strategy")
  - Edge cases: URLs in markdown format, partial URLs, capitalization variations

## Out of scope

- Semantic validation of response correctness (only structural/safety rules)
- Scoring response quality or confidence
- Conversation history mutation or storage
- Chat API route integration (P4-S4 handles orchestration)
- User-facing error messages beyond the safe fallback
- Output formatting or markdown processing
- Response streaming or chunking
- Analytics or detailed failure logging beyond safe categories

## Current-state evidence

- P4-S1 complete: [specs/p4-anthropic-provider.md](p4-anthropic-provider.md) APPROVED; provider returns normalized ProviderResponse
- P4-S2 complete: [specs/p4-system-prompt.md](p4-system-prompt.md) APPROVED; context assembly ready to feed provider
- P3-S3 complete: [specs/p3-retrieval-guardrails.md](p3-retrieval-guardrails.md) APPROVED; `SAFE_FALLBACK_MESSAGE` defined
- Link allowlist at [src/lib/knowledge/links.ts](../src/lib/knowledge/links.ts) with `isApprovedLink()` helper
- Chat API at [src/app/api/chat/route.ts](../src/app/api/chat/route.ts) currently awaits output guardrails before returning response
- Knowledge corpus and validation exist at [src/lib/knowledge/](../src/lib/knowledge/)
- Current test suite has ~118+ passing tests
- [plan.md §5](../plan.md#L131-L154) defines output guardrails as layer 3 of the safety harness
- [plan.md §14.2](../plan.md#L431-L438) defines golden questions for pricing and unsupported-feature refusal

## Decisions and assumptions

**Decision:** Output guardrails operate on the text string returned by the provider, not on structured data or metadata. This keeps validation simple and deterministic.

**Decision:** Pricing detection uses simple pattern matching (e.g., `/$\d+|€\d+|£\d+/`) rather than semantic understanding. MVP does not attempt to parse complex pricing narratives.

**Decision:** Unsupported-capability detection uses a hardcoded list of banned phrases (e.g., "access the portal", "book a live meeting", "integrate with Salesforce", "authenticate", "login", "real-time handoff"). This is maintainable and explicit.

**Decision:** If any validation rule fails, the entire response is replaced with the safe fallback. There is no partial sanitization or selective URL removal; either the response passes all checks or it is replaced.

**Decision:** URL detection uses a simple regex (e.g., `https?://\S+`) to catch most URLs. It does not attempt to parse markdown or HTML; it operates on plain text.

**Decision:** The safe fallback message is identical to the one defined in P3-S3. Output guardrails import `SAFE_FALLBACK_MESSAGE` from `retrieval-guardrails.ts` to avoid duplication.

**Decision:** Response length validation checks raw character count. No token counting or semantic truncation is performed.

**Assumption:** The model response is a single text string from the provider. No multi-modal or structured content is expected at this MVP stage.

**Assumption:** Output guardrails return a simple boolean and reason, not a detailed diff or comparison. The API route will use the result to decide whether to return the response or the fallback.

**Assumption:** Known limitations: this guardrail catches obvious keyword violations but cannot detect subtle claims that look reasonable but are unsupported (e.g., "Cadre can make your AI 50% better"). Mitigation: system prompt emphasizes grounding and P6 golden questions will stress-test this.

## Executable tasks

1. Create `src/lib/guardrails/output-guardrails.ts`
2. Define types in `output-guardrails.ts`:
   - `OutputGuardrailResult` interface with:
     - `safe: boolean` — true if response passes all checks, false if fallback should be used
     - `reason?: string` — explanation for failure (e.g., "contains_url", "contains_pricing", "unsupported_capability", "malformed", "too_long")
     - `originalText?: string` — the original response (for logging, never sent to client)
3. Import `SAFE_FALLBACK_MESSAGE` from `retrieval-guardrails.ts` or define shared constant in new location
4. Implement `checkOutputGuardrails(text: string): OutputGuardrailResult` function:
   - If text is empty or null, return safe=false, reason="malformed"
   - If text length > 5000 characters, return safe=false, reason="too_long"
   - Define banned phrases list (e.g., "access the portal", "book a live meeting", "schedule a call", "integrate with", "authenticate", "login", "real-time handoff", "CRM", "Salesforce", "HubSpot")
   - Check if text contains any banned phrase (case-insensitive), return safe=false, reason="unsupported_capability" if found
   - Define pricing regex patterns: `/$\d+/`, `/€\d+/`, `/£\d+/`, `/¥\d+/`, `/cost is \$\d+/i`, `/price.*\$\d+/i`
   - Check if text matches any pricing pattern, return safe=false, reason="contains_pricing" if found
   - Check if text contains any URL (regex: `https?://\S+`), verify each URL is in approved allowlist using `isApprovedLink()`
   - If non-approved URL found, return safe=false, reason="contains_url"
   - Check for internal-detail leaks (e.g., "schema v1", "knowledge ID", "retrieved from", "guardrail", "fallback"):
     - Define leak phrases list: ["schema v1", "knowledge ID", "retrieved from", "guardrail", "fallback message"]
     - If any leak phrase found (case-insensitive), return safe=false, reason="internal_detail_leak"
   - If all checks pass, return safe=true
5. Export `checkOutputGuardrails()` and `SAFE_FALLBACK_MESSAGE` (or reference to it)
6. Create `src/lib/guardrails/output-guardrails.test.ts`:
   - **Happy path tests:**
     - Valid response with no URLs, pricing, or banned phrases passes
     - Response with approved URL (from allowlist) passes
     - Response mentioning legitimate Cadre capabilities (e.g., "Cadre helps with AI implementation strategy") passes
   - **URL blocking tests:**
     - Response with non-approved URL is blocked with reason "contains_url"
     - Response with multiple URLs, one non-approved, is blocked
     - Response with URL-like pattern but not actual URL (e.g., "visit example.com") passes (regex-based, not semantic)
   - **Pricing blocking tests:**
     - Response with "$10,000" is blocked
     - Response with "€500" is blocked
     - Response with "cost is $5,000" is blocked
     - Response with "price: €1,000" is blocked
     - Response with number alone (e.g., "1000") passes (not a pricing pattern)
   - **Unsupported-capability blocking tests:**
     - Response with "access the portal" is blocked
     - Response with "book a live meeting" is blocked
     - Response with "schedule a call" is blocked
     - Response with "integrate with Salesforce" is blocked
     - Response with "authenticate to the system" is blocked
     - Response with "CRM integration" is blocked
   - **Internal-detail leak tests:**
     - Response with "schema v1" is blocked
     - Response with "knowledge ID xyz" is blocked
     - Response with "retrieved from knowledge" is blocked
     - Response with "guardrail check" is blocked
   - **Malformed/edge-case tests:**
     - Empty string response is rejected
     - Null response is rejected
     - Response exceeding 5000 characters is blocked
     - Whitespace-only response is rejected
   - **Case-insensitivity tests:**
     - "Access The Portal" (mixed case) is blocked
     - "BOOK A LIVE MEETING" (uppercase) is blocked
7. Update or verify imports:
   - Import `isApprovedLink()` from `src/lib/knowledge/links.ts`
   - Import or reference `SAFE_FALLBACK_MESSAGE`
   - Export types and functions for use in P4-S4
8. Run verification: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`

## Acceptance criteria

- `checkOutputGuardrails(text)` returns typed `OutputGuardrailResult` with safe flag and reason
- Empty or null responses are rejected
- Responses exceeding 5000 characters are rejected
- Non-approved URLs trigger safe=false with reason "contains_url"
- Pricing patterns are detected (at least $, €, £, ¥ currencies with amounts)
- Unsupported-capability phrases are detected and blocked
- Internal-detail leaks (schema version, knowledge ID, internal guardrail mentions) are blocked
- Case-insensitive matching for all text-based checks
- Approved URLs (from allowlist) pass validation
- Legitimate Cadre capabilities mentioned without unsupported claims pass validation
- Safe fallback message is imported/reused from P3-S3, not duplicated
- All tests pass (minimum 20 test cases covering URLs, pricing, capabilities, edge cases)
- No network access or external dependencies
- Verification commands pass: lint, typecheck, test, build

## Tests

Covered in tasks above; ~20 test cases minimum:
- 2 happy path (valid responses, mixed valid content)
- 3 URL tests (non-approved, approved, multiple)
- 4 pricing tests (various currency patterns)
- 5 unsupported-capability tests (access portal, book meeting, CRM, etc.)
- 2 internal-leak tests (schema, knowledge ID)
- 4 edge cases (empty, null, oversized, whitespace)

## Verification commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All existing tests must continue to pass. New tests must cover the acceptance criteria above.

## Risks and pending decisions

**Risk:** Pricing detection with simple regex may miss edge cases (e.g., "£5k", "1.5M USD"). Mitigation: MVP prioritizes common patterns; P6 golden questions will test edge cases. If missed, P7 can refine patterns.

**Risk:** Hardcoded banned-phrase list for unsupported capabilities may grow unmaintainable. Mitigation: Keep list in a constant, review quarterly, move to configuration if list exceeds 20 items.

**Risk:** Case-insensitive matching for banned phrases may cause false positives (e.g., "Portal" in a legitimate context). Mitigation: Keep banned phrases broad and high-confidence. P6 tests will catch false positives.

**Pending decision:** D4 (approved URLs) must be resolved before this spec is approved for implementation. If D4 is still unresolved, the spec remains valid but the link allowlist may be empty, meaning no URLs pass validation.

**Known limitation:** Output guardrails cannot detect subtle unsupported claims that don't match keyword patterns (e.g., "Cadre can triple your productivity"). This is accepted MVP risk; P6 evaluation will assess how often this occurs.

