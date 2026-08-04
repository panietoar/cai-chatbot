# P3-S1 — Approved Knowledge and Link Schemas

Status: APPROVED
Plan phase: P3

## Outcome

Define typed, versioned knowledge entry schemas with stable ID, topic, approved content, keywords, source/approval metadata, optional action guidance, and optional exact URL. Define a server-side link allowlist that can be audited and enforced. Establish schema validation that rejects unapproved, malformed, stale, or non-allowlisted entries before any retrieval or model invocation.

## In scope

- Define a `KnowledgeEntry` TypeScript interface with:
  - Stable string ID
  - Topic name
  - Approved content text
  - Keywords array for retrieval
  - Approval/source note
  - Optional action guidance (plain text, e.g., "Book a strategy call")
  - Optional approved URL
  - Schema version identifier
  - Optional effective date or version timestamp
- Define a `LinkAllowlist` structure as a typed, auditable constant or configuration.
- Implement runtime validation for knowledge entries:
  - Required fields presence
  - Non-empty content, topic, and keywords
  - URL presence only when allowed by the link allowlist
  - Schema version compatibility
- Implement link allowlist validation that rejects URLs not in the approved set.
- Add deterministic schema validation tests covering:
  - Valid complete entries
  - Valid entries without URLs
  - Missing required fields
  - Empty content/topic/keywords
  - Unknown schema version
  - URL not in allowlist
  - Malformed URL
- Add an empty or minimal placeholder knowledge corpus in `src/lib/knowledge/corpus.ts` with clear inline notes that actual Cadre content requires explicit user approval (decision gate D3).
- Keep knowledge and link data server-side only; never bundle into client code.

## Out of scope

- Actual Cadre-specific content (blocked by D3).
- Exact verified URLs for strategy calls, contact, or portal (blocked by D4).
- Retrieval scoring, ranking, or query normalization (P3-S2).
- Retrieval guardrails (P3-S3).
- Knowledge update UI or CMS.
- Vector database, embeddings, or semantic search.
- Knowledge versioning infrastructure beyond a simple schema version field.
- Knowledge entry mutation or deletion logic.

## Current-state evidence

- P2 phase complete: validation, input guardrails, and chat API skeleton implemented.
- No `src/lib/knowledge/` directory exists.
- No `src/lib/retrieval/` directory exists.
- The chat API in [src/app/api/chat/route.ts](../src/app/api/chat/route.ts) returns placeholder responses after validation and guardrails.
- Current test suite has 42 passing tests (8 validation, 30 input guardrails, 4 route/health/smoke).
- Verification commands defined: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Decision gates D3 (approved knowledge) and D4 (approved URLs) are unresolved per [implementation-plan.md §5](../implementation-plan.md#L80-L81).
- [plan.md §9](../plan.md#L263-L281) defines the intended knowledge entry structure.
- [plan.md §14](../plan.md#L407-L413) defines golden questions that require knowledge about: what Cadre does, industry support, portal access, pricing boundaries.
- [CLAUDE.md](../CLAUDE.md#L21) prohibits inventing pricing, case studies, URLs, policies, capabilities, or client information.

## Decisions and assumptions

**Decision:** Implement knowledge schema and validation as pure TypeScript types and runtime checks, not as a database schema, to keep the MVP deployable without external infrastructure.

**Decision:** Store the knowledge corpus as a typed TypeScript constant in `src/lib/knowledge/corpus.ts`, not as JSON or external files, for simplicity and type safety at this stage.

**Decision:** Define the link allowlist as a typed constant array in `src/lib/knowledge/links.ts` for auditability and explicit version control.

**Decision:** Add a minimal placeholder corpus with 1-2 example entries using fictional topic content and no real URLs, with clear inline comments stating that real Cadre content requires user approval per D3.

**Decision:** Include a schema version field (e.g., `"v1"`) in each entry to support future evolution without requiring migration infrastructure in the MVP.

**Decision:** Define optional action guidance as plain text only, not structured action objects, to avoid premature abstraction before P4 output validation and P5 UI integration clarify the needed contract.

**Decision:** Reject entries with URLs that are not in the allowlist at schema validation time, not at retrieval time, to fail fast.

**Assumption:** URL validation uses exact string matching against the allowlist; pattern-based or subdomain matching is out of scope for the MVP.

**Assumption:** The user will provide actual Cadre content and verified URLs after reviewing the schema, allowing P3-S2 to proceed with real data. If D3/D4 remain unresolved, P3-S2 can still implement retrieval logic against the placeholder corpus.

**Assumption:** Knowledge entries are immutable constants in the MVP; update and versioning workflows are deferred to post-release iteration.

## Executable tasks

1. Create `src/lib/knowledge/` directory.
2. Define `src/lib/knowledge/types.ts`:
   - `KnowledgeEntry` interface with all required and optional fields.
   - `KnowledgeSchemaVersion` type (e.g., literal `"v1"`).
   - Any supporting types (e.g., `ApprovalNote`).
3. Define `src/lib/knowledge/links.ts`:
   - `APPROVED_LINKS` constant array of exact allowed URLs.
   - `isApprovedLink(url: string): boolean` helper.
4. Define `src/lib/knowledge/corpus.ts`:
   - Export a `KNOWLEDGE_CORPUS: readonly KnowledgeEntry[]` constant.
   - Include 1-2 placeholder entries with fictional content and inline comments noting D3 requirement.
   - Include one example entry with no URL and one example entry with a placeholder-approved link (if any exist in the allowlist for testing).
5. Implement `src/lib/knowledge/validation.ts`:
   - `validateKnowledgeEntry(entry: unknown): { valid: boolean; errors: string[] }` function.
   - Check required fields, non-empty strings, schema version, keywords array, URL allowlist membership when URL present.
6. Create `src/lib/knowledge/validation.test.ts`:
   - Test valid entry with all fields.
   - Test valid entry without URL.
   - Test valid entry with approved URL.
   - Test missing required fields (id, topic, content, keywords, approvalNote, schemaVersion).
   - Test empty strings for topic, content.
   - Test empty keywords array.
   - Test URL not in allowlist.
   - Test unknown schema version.
   - Test malformed entry shapes.
7. Create `src/lib/knowledge/corpus.test.ts`:
   - Validate that every entry in `KNOWLEDGE_CORPUS` passes `validateKnowledgeEntry`.
   - Validate that all corpus entry IDs are unique.
   - Validate that all corpus URLs (if any) are in the approved allowlist.
8. Add inline JSDoc or comments in `types.ts` and `corpus.ts` explaining:
   - Schema field purposes.
   - D3/D4 requirement for real content and URLs.
   - That the placeholder content is not representative of actual Cadre services.
9. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and confirm all pass.
10. Manually inspect that no knowledge module is imported into client-side code bundles (e.g., check build output or use bundle analyzer if available).

## Acceptance criteria

- [ ] `KnowledgeEntry` type is defined with all required and optional fields.
- [ ] `APPROVED_LINKS` allowlist exists and is auditable.
- [ ] `KNOWLEDGE_CORPUS` contains at least one valid entry with clear placeholder/approval notes.
- [ ] `validateKnowledgeEntry` returns validation results for required fields, non-empty checks, schema version, and URL allowlist.
- [ ] All corpus entries pass validation.
- [ ] All corpus entry IDs are unique.
- [ ] Tests cover valid entries, missing fields, empty values, unapproved URLs, unknown schema versions.
- [ ] No pricing, case studies, client information, unverified security claims, or fabricated Cadre-specific facts appear in placeholder content.
- [ ] Missing or placeholder URLs do not break validation when the entry has no URL field.
- [ ] Inline documentation clearly states D3 and D4 requirements.
- [ ] All verification commands pass: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- [ ] Knowledge modules remain server-side only.

## Tests

All tests are deterministic and require no network access.

### Schema validation tests (`validation.test.ts`)

1. **Valid complete entry**: entry with all required fields and optional URL passes validation.
2. **Valid entry without URL**: entry with no URL field passes validation.
3. **Valid entry with approved URL**: entry with URL in allowlist passes validation.
4. **Missing id**: returns validation error.
5. **Missing topic**: returns validation error.
6. **Missing content**: returns validation error.
7. **Missing keywords**: returns validation error.
8. **Missing approvalNote**: returns validation error.
9. **Missing schemaVersion**: returns validation error.
10. **Empty topic string**: returns validation error.
11. **Empty content string**: returns validation error.
12. **Empty keywords array**: returns validation error.
13. **Unknown schema version**: returns validation error.
14. **URL not in allowlist**: returns validation error.
15. **Malformed entry (not an object)**: returns validation error.

### Corpus validation tests (`corpus.test.ts`)

1. **All entries valid**: every entry in `KNOWLEDGE_CORPUS` passes `validateKnowledgeEntry`.
2. **Unique IDs**: no duplicate entry IDs in the corpus.
3. **Approved URLs only**: if any entry has a URL, it is in `APPROVED_LINKS`.

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

**D3 — Approved knowledge**: Actual Cadre-specific content has not been provided or verified. The spec implements placeholder entries with inline notes. Real content must be added by the user before retrieval can return grounded Cadre answers.

**D4 — Approved URLs**: Exact strategy-call, contact, and portal URLs are not verified. The allowlist may remain empty or contain only safe placeholder links. Real URLs must be verified by the user before P4-S3 (output validation and approved actions) and P5-S3 (render approved actions).

### Risks

1. **Blocked retrieval utility**: P3-S2 (retrieval) can implement scoring and ranking logic against placeholder content, but the chatbot cannot answer real Cadre questions until D3 is resolved.
2. **Action and link limitations**: Without D4, the chatbot cannot provide clickable strategy-call or portal links. Fallback must remain text-only guidance.
3. **Schema evolution**: The MVP uses a simple version field. If knowledge structure changes significantly post-release, migration logic will be needed.
4. **No content update workflow**: The corpus is a code constant. Adding or updating entries requires code changes and redeployment. A CMS or admin UI is out of scope for the MVP.

### Contradictions

None identified. The spec aligns with:
- [plan.md §9](../plan.md#L263-L281) knowledge strategy.
- [CLAUDE.md](../CLAUDE.md#L21) prohibitions on inventing information.
- [implementation-plan.md](../implementation-plan.md#L217-L232) P3-S1 definition.

### Open questions for user

1. **D3 resolution**: Can you provide approved Cadre content for these topics, or should the placeholder corpus remain until a later phase?
   - What Cadre AI does
   - Core services
   - Supported industries
   - AI Maturity Index overview
   - LLM selection approach
   - Data security principles
   - Strategy call instructions
   - Client portal instructions
   - Escalation guidance

2. **D4 resolution**: Do you have verified URLs for:
   - Strategy call booking (e.g., Calendly, contact form)
   - Client portal login
   - General contact page

3. **Placeholder allowlist**: Should `APPROVED_LINKS` start empty, or include safe common URLs like `https://cadre.ai` (if verified)?

4. **Schema version approach**: Is a simple string literal `"v1"` sufficient, or do you prefer a more structured version identifier?

## Definition of done

- All executable tasks completed.
- All acceptance criteria met.
- All tests implemented and passing.
- All verification commands passing with no new errors or warnings.
- Inline documentation clearly states D3 and D4 requirements.
- No secrets, real client information, or fabricated Cadre facts in the code.
- Spec reviewed and approved by the user.
- D3 and D4 resolution path communicated to the user.
