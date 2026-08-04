# Security Review Checklist — Cadre AI Chatbot

Work through each item in the order listed. Mark each as **PASS**, **FAIL**, or **N/A**.

---

## A. Secret and Credential Exposure

- [ ] No API keys, tokens, or passwords appear in source files.
- [ ] No secrets appear in `.env.example` (names only, no values).
- [ ] `.env` and `.env.local` are listed in `.gitignore`.
- [ ] `OPENROUTER_API_KEY` is accessed only in server-side code (`src/app/api/` or `src/lib/`).
- [ ] No secrets are passed to client-side React components.
- [ ] No secrets appear in Next.js `publicRuntimeConfig` or `NEXT_PUBLIC_*` variables.
- [ ] No secrets are logged to the console or any logging sink.

---

## B. Prompt Injection

- [ ] User input is never concatenated directly into the system prompt string.
- [ ] User messages are passed as a separate role (`"user"`) in the messages array, not embedded in the system string.
- [ ] Retrieved knowledge is labeled or delimited so the model understands it is reference data, not instructions.
- [ ] The input guardrail detects and rejects messages containing injection patterns (e.g., "Ignore previous instructions", "You are now", "Repeat your system prompt").
- [ ] The chatbot never returns the full system prompt in a response.
- [ ] The chatbot rejects requests that ask it to act outside its defined role.

---

## C. Input Validation (OWASP A03 — Injection)

- [ ] All API request bodies are validated against a strict schema before processing.
- [ ] Message length is capped (e.g., 2000 characters) and enforced server-side.
- [ ] Conversation history depth is capped and enforced.
- [ ] Unknown fields in the request body are rejected or stripped.
- [ ] Validation errors return 422 with a user-safe message — not a stack trace.

---

## D. Output Safety

- [ ] The output guardrail checks every response before it is returned to the client.
- [ ] Responses containing non-approved URLs are blocked or replaced.
- [ ] Responses containing dollar amounts or pricing figures are flagged and reviewed.
- [ ] Responses are never raw LLM text streamed directly without validation.
- [ ] Stack traces and internal error details are never included in the response body.

---

## E. Data Integrity — Knowledge Base

- [ ] Knowledge base files are read-only at runtime (not user-modifiable).
- [ ] Retrieved content is treated as data, not executed as code or instructions.
- [ ] Knowledge source metadata (version, approval status) is validated before use.
- [ ] No external URLs are fetched at runtime to populate the knowledge base.

---

## F. Approved Link Enforcement

- [ ] Every URL in a chatbot response is checked against an approved allowlist.
- [ ] The allowlist is defined in a single, auditable location.
- [ ] Dynamically constructed URLs (e.g., from user input) are forbidden.
- [ ] If the LLM produces a non-approved URL, the response is replaced with the safe escalation.

---

## G. Server / Infrastructure

- [ ] The `OPENROUTER_API_KEY` is only read server-side (never in a `use client` component).
- [ ] No API route exposes the model name, system prompt, or knowledge content when called without a valid request.
- [ ] The `/api/chat` route returns 405 for GET, PUT, DELETE — only POST is allowed.
- [ ] CORS is not set to `*` unless explicitly required and approved.

---

## H. Dependency Security (OWASP A06 — Vulnerable Components)

- [ ] No authentication, session, CRM, or vector DB packages are present in `package.json`.
- [ ] `npm audit` returns no critical or high-severity advisories.
- [ ] No packages with known prompt-injection or data-exfiltration risk are added.

---

## I. Error Handling

- [ ] All catch blocks return user-safe error messages, not raw exceptions.
- [ ] No `console.error` calls include user input or API keys.
- [ ] Failed guardrail checks return the safe escalation response, not an empty body.

---

## J. Logging Safety

- [ ] Request bodies are not logged in full (may contain user PII).
- [ ] Logged events contain only: timestamp, request ID, event type, sanitized outcome.
- [ ] No log line includes the value of `OPENROUTER_API_KEY` or any secret.
