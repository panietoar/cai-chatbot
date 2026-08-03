---
paths:
  - "src/app/api/**/*.ts"
  - "src/lib/guardrails/**/*.ts"
  - "src/lib/validation/**/*.ts"
---

# API Design Rules — Cadre AI Chatbot

These rules apply to all API routes in `src/app/api/` and to any module that handles external input or produces output.

## Route Structure

The chat endpoint lives at `POST /api/chat`. Do not add additional routes unless the plan explicitly approves them.

All route handlers must:
1. Validate the request body at the boundary using a typed schema.
2. Return a structured error response, never a raw stack trace.
3. Use explicit HTTP status codes (200, 400, 422, 500).
4. Never expose internal implementation details in the response body.

## Input Validation

- Validate at the route boundary before any processing.
- Use a schema library (Zod preferred) to define the expected payload shape.
- Strip unknown fields before passing data downstream.
- Enforce message length limits (max 2000 characters per message).
- Enforce conversation history limits (max 10 turns).
- Return 422 Unprocessable Entity for schema violations, not 400.

## Request/Response Types

Define explicit TypeScript types for:
- The request body (`ChatRequest`).
- The response body (`ChatResponse`).
- Any error response (`ApiError`).

Do not use `any` at module boundaries. Do not infer types from API responses at runtime without validation.

## Guardrail Integration

The route handler must call guardrails in order:
1. Input validation → 422 on failure.
2. Input guardrails → 400 with a user-safe message on rejection.
3. Knowledge retrieval.
4. Retrieval guardrails → safe fallback response on failure.
5. Context assembly.
6. LLM invocation.
7. Output guardrails → safe escalation response on failure.

Do not bypass any layer. Do not add hidden fallback behavior that skips guardrails.

## Error Handling

- Handle expected errors deliberately (validation failures, retrieval misses, LLM errors).
- Return user-safe error messages — never raw exception messages.
- Log errors server-side with enough context to diagnose (see observability rules in `plan.md`).
- Do not log request bodies — they may contain user PII.

Preferred error response shape:

```ts
{
  error: {
    code: "INVALID_REQUEST" | "UNSAFE_INPUT" | "KNOWLEDGE_UNAVAILABLE" | "INTERNAL_ERROR",
    message: string  // user-safe, non-technical
  }
}
```

## Streaming

Streaming responses are permitted if the UX benefits are clear. If streaming is used:
- Apply output guardrails to the complete assembled response before streaming begins, or stream with buffered chunk inspection.
- Do not stream raw LLM output directly to the client without validation.

## Security

- Never include the system prompt, API keys, or internal knowledge source names in the response.
- Reject requests that ask for the system prompt or internal configuration.
- Treat user input as untrusted data — escape or sanitize before embedding in prompts.
- Set `Content-Type: application/json` explicitly.
- Do not set permissive CORS headers unless the plan requires it.

## Approved Links Only

The API must never return a URL that is not on the approved allowlist. If retrieval produces a non-approved URL, strip it before assembly. If the LLM output contains a non-approved URL, replace the response with the safe escalation.

Illustrative patterns only; do not treat these as approved until their exact destinations are verified and added to the application allowlist:
```
https://cadreai.com/*
https://cal.com/cadreai/*
```

## What Not to Do

- Do not add authentication middleware.
- Do not add CRM webhook endpoints.
- Do not add endpoints that proxy external URLs.
- Do not return the full conversation history in the response.
- Do not add rate limiting infrastructure unless plan §3 is updated to include it.
