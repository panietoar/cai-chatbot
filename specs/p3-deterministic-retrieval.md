# P3-S2 — Deterministic Retrieval

Status: APPROVED
Plan phase: P3

## Outcome

Implement deterministic keyword-based retrieval that normalizes user questions, scores them against knowledge entry topics and keywords, and returns a small ordered set of relevant approved entries with retrieval metadata. No match is returned below an explicit relevance threshold.

## In scope

- Create `src/lib/retrieval/retrieval.ts` with typed retrieval interface and implementation
- Normalize user questions: lowercase, trim whitespace, remove common stop words
- Score entries based on keyword overlap and topic matching
- Return top N relevant entries (configurable, default 3) above a minimum relevance threshold
- Include retrieval metadata: entry IDs, scores, total entries considered, matched count
- Deterministic scoring: same question always produces same results in same order
- Handle edge cases: empty question, no matches, ties in scoring, single-keyword questions
- Comprehensive test coverage in `src/lib/retrieval/retrieval.test.ts`:
  - Exact topic matches
  - Keyword overlap (single and multiple keywords)
  - Paraphrase detection through keyword matching
  - Ranking by relevance score
  - Tie-breaking (stable sort by entry ID)
  - Empty query handling
  - Below-threshold filtering
  - Maximum results limiting
  - Stop word normalization
  - Case-insensitive matching

## Out of scope

- Vector embeddings or semantic similarity
- External API calls or network access
- Machine learning models
- Fuzzy string matching or Levenshtein distance
- Natural language parsing beyond normalization
- Query expansion or synonym detection
- Relevance feedback or learning
- User-specific personalization
- Caching or performance optimization beyond basic efficiency
- Integration with chat API (deferred to P4 context assembly)
- Retrieval guardrails (P3-S3)

## Current-state evidence

- P3-S1 complete: [specs/p3-knowledge-schema.md](p3-knowledge-schema.md) approved and implemented
- Knowledge corpus exists at [src/lib/knowledge/corpus.ts](../src/lib/knowledge/corpus.ts) with 2 placeholder entries
- Knowledge types defined at [src/lib/knowledge/types.ts](../src/lib/knowledge/types.ts)
- Knowledge validation exists at [src/lib/knowledge/validation.ts](../src/lib/knowledge/validation.ts) with 21 passing tests
- No `src/lib/retrieval/` directory exists
- Chat API at [src/app/api/chat/route.ts](../src/app/api/chat/route.ts) currently returns placeholder response after validation and guardrails
- Current test suite has 83 passing tests across validation (8), guardrails (30), knowledge (24), chat API (17), health (2), smoke (1), and corpus (3)
- [plan.md §10](../plan.md#L295-L325) defines retrieval strategy: normalize → compare → score → select
- [plan.md §14](../plan.md#L407-L413) golden questions include topics like "what Cadre does", "industries", "AI Maturity Index", "LLM selection", "data security", "strategy call", "portal access"
- No deployment blockers for retrieval (works with placeholder corpus)

## Decisions and assumptions

**Decision:** Use simple token-based keyword matching rather than semantic similarity for MVP reliability and determinism.

**Decision:** Normalize questions by: lowercase conversion, whitespace trimming, stop word removal (common English words like "the", "is", "a", "what", "how", "do", "does").

**Decision:** Score entries using weighted sum:
- Topic exact match: 10 points
- Topic partial match (topic appears as substring in question): 5 points  
- Each keyword match: 1 point per keyword
- Total score = topic points + keyword points

**Decision:** Default minimum relevance threshold: 1 (at least one keyword or partial topic match required).

**Decision:** Default maximum results: 3 entries (small set for focused responses).

**Decision:** Tie-breaking: when scores are equal, sort by entry ID (stable, deterministic).

**Decision:** Return retrieval metadata including: matched entry IDs, scores per entry, threshold used, max results limit, total corpus size, matched count.

**Assumption:** The placeholder corpus (2 entries) is sufficient for testing retrieval logic; real Cadre content (decision gate D3) can be added later without changing retrieval implementation.

**Assumption:** Stop word list is predefined and static in the MVP; no configuration or update mechanism needed.

**Assumption:** Retrieval result type includes enough metadata for observability and later guardrail validation (P3-S3) without needing to redesign the interface.

**Assumption:** Performance is adequate for in-memory scoring of small corpus (< 100 entries); optimization is deferred until proven necessary.

## Executable tasks

1. Create `src/lib/retrieval/` directory
2. Define `src/lib/retrieval/types.ts`:
   - `RetrievalResult` interface with matched entries, scores, metadata
   - `RetrievalOptions` interface with threshold and maxResults
   - `RetrievalMetadata` interface for observability
3. Implement `src/lib/retrieval/retrieval.ts`:
   - `normalizeQuery(query: string): string[]` — lowercase, trim, split, remove stop words, return tokens
   - `scoreEntry(queryTokens: string[], entry: KnowledgeEntry): number` — calculate relevance score
   - `retrieveKnowledge(query: string, options?: Partial<RetrievalOptions>): RetrievalResult` — main retrieval function
     - Normalize query
     - Score all corpus entries
     - Filter by threshold
     - Sort by score descending, then by ID for ties
     - Limit to maxResults
     - Return matched entries with metadata
4. Define stop words list (e.g., ["the", "is", "a", "an", "what", "how", "do", "does", "can", "could", "will", "would", "should"])
5. Create `src/lib/retrieval/retrieval.test.ts` with comprehensive test coverage:
   - **Normalization tests:**
     - Case insensitivity: "What Does Cadre Do?" → same as "what does cadre do"
     - Stop word removal: "What is the AI Maturity Index?" → removes "what", "is", "the"
     - Whitespace handling: "  multiple   spaces  " → single spaces, trimmed
   - **Scoring tests:**
     - Exact topic match gets highest score
     - Partial topic match gets medium score
     - Keyword matches accumulate
     - No match returns score of 0
   - **Retrieval tests:**
     - Question matching topic exactly returns that entry first
     - Question with multiple keyword matches ranks higher
     - Question below threshold returns empty results
     - Question with ties uses stable ID sort
     - Empty query returns empty results
     - Query matching all entries respects maxResults limit
     - Paraphrased questions match via keywords (e.g., "help me contact Cadre" matches "escalation" entry with keyword "contact")
   - **Edge cases:**
     - Single-word query
     - All stop words query returns empty
     - Query longer than any entry content
     - Corpus with single entry
     - MaxResults = 1
     - Threshold higher than any possible score
6. Update `package.json` scripts if needed (verify existing `npm test` works)
7. Run verification: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`

## Acceptance criteria

- `retrieveKnowledge(query, options)` returns `RetrievalResult` with matched entries and metadata
- Normalization is case-insensitive and removes configured stop words
- Scoring is deterministic: identical queries produce identical scores
- Entries are ranked by score descending, with stable ID-based tie-breaking
- Below-threshold entries are excluded from results
- Results are limited to maxResults (default 3)
- Retrieval metadata includes: threshold, maxResults, totalEntries, matchedCount, and per-entry scores
- No network access, no external dependencies beyond TypeScript/Vitest
- All retrieval tests pass (minimum 15 test cases covering normalization, scoring, ranking, edge cases)
- Retrieval works with placeholder corpus and will work identically with real corpus once D3 is resolved
- Module exports are typed and have no `any` at boundaries

## Tests

**Unit tests** (`src/lib/retrieval/retrieval.test.ts`):

1. **Normalization:**
   - "What Does Cadre Do?" normalizes to ["cadre"]
   - "  Multiple   Spaces  " normalizes to ["multiple", "spaces"]
   - "What is the company?" normalizes to ["company"]
   - "a an the" normalizes to [] (all stop words)

2. **Scoring:**
   - Entry with topic "Company Overview" scores 10 for query "company overview"
   - Entry with topic "Company Overview" scores 5 for query "tell me about the company"
   - Entry with keywords ["help", "contact"] scores 2 for query "help me contact you"
   - Entry with no matches scores 0 for query "unrelated topic"

3. **Retrieval:**
   - Query "company overview" returns entry with exact topic match first
   - Query "help contact" returns entry with both keywords ranked by total score
   - Query "unrelated unknown topic" with threshold=1 returns empty results
   - Query matching 5 entries with maxResults=3 returns exactly 3 entries
   - Query producing tied scores returns stable sort by ID

4. **Edge cases:**
   - Empty string query returns empty results
   - All stop words query returns empty results
   - Single-word query "cadre" matches entries with that keyword
   - Query with threshold=100 returns empty results (too high)
   - Corpus with 1 entry and matching query returns that entry

**Integration readiness:**
- Retrieval module can be imported and called from chat API without errors
- Retrieval result type is compatible with planned P3-S3 guardrail validation
- Retrieval result metadata is suitable for P4-S4 logging and observability

## Verification commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All commands must pass. Test count should increase from 83 to at least 98 (adding minimum 15 retrieval tests).

## Risks and pending decisions

**Risk:** Keyword-based retrieval may miss semantic matches (e.g., "What are your services?" vs "What does Cadre offer?"). Mitigation: Ensure keywords are comprehensive and synonyms are included in knowledge entries. Evaluate after P6-S1 golden question tests; consider synonym expansion only if deterministic tests prove inadequate.

**Risk:** Placeholder corpus has only 2 entries, limiting retrieval test coverage. Mitigation: Tests must explicitly verify behavior with small corpus and define expected behavior that will scale to larger corpus (e.g., ranking, threshold, limits).

**Pending decision (non-blocking):** Stop word list completeness. Current list is sufficient for MVP; can be extended based on real query patterns after deployment.

**Pending decision (non-blocking):** Score weights (topic=10, partial topic=5, keyword=1) are initial estimates. Can be tuned in P6-S1 if golden question evaluations show poor ranking. Change does not affect interface or test structure.

**Pending decision (D3):** Real Cadre knowledge content will replace placeholder entries but should not require retrieval algorithm changes. Verification: Retrieval tests must pass with both placeholder and real content.

**No blocking decisions.** This story can proceed to implementation immediately.
