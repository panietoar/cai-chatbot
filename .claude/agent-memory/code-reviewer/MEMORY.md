# Code Reviewer Agent — Persistent Memory

Claude Code maintains this project-scoped memory for the `code-reviewer` agent. It records recurring patterns and stable project decisions that should inform future reviews. Review reports may recommend memory updates; they must not edit this file directly.

---

## Project Constraints (non-negotiable)

- No authentication packages (passport, next-auth, jose, etc.).
- No vector DB packages (pinecone, weaviate, qdrant, chromadb, etc.).
- No CRM integrations.
- No real calendar booking integrations.
- Single bounded assistant — no multi-agent orchestration in the main API route.
- `OPENROUTER_API_KEY` must never appear outside `src/lib/llm/` or `src/app/api/`.

## Approved Architecture Boundaries

- `src/app/api/chat/` → orchestration only, delegates to `src/lib/`.
- `src/lib/guardrails/` → all guardrail logic lives here.
- `src/lib/knowledge/` → knowledge base loading and retrieval.
- `src/lib/prompts/` → system prompt construction.
- `src/lib/llm/` → Anthropic API wrapper.
- `src/lib/validation/` → input schema and validators.
- `src/components/` → React UI only, no server-side logic.
- `src/types/` → shared TypeScript interfaces.

## Recurring Issues (updated per review)

_No issues recorded yet. This section is populated as reviews are completed._

## Patterns That Have Been Approved

_No patterns recorded yet. This section is populated as reviews are completed._

## Open Questions

_No open questions._

---

_No review findings recorded yet._
