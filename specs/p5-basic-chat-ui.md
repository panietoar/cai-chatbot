# P5-S1 — Build the Basic Chat Interaction

Status: APPROVED
Plan phase: Phase P5 — Chat user experience

## Outcome

Replace the static Cadre support shell with a functional chat interface that connects to the verified `POST /api/chat` endpoint, displays user and assistant message turns, shows visible loading and error states, prevents duplicate in-flight submissions, supports limited in-page history, and works on desktop and mobile with keyboard accessibility.

## In scope

1. Create a chat UI component that replaces the current static shell content in [src/app/page.tsx](src/app/page.tsx):
   - Message input field (textarea) with visible character limit indicator
   - Submit button with disabled state during submission
   - Scrollable message history container showing user and assistant turns
   - Loading indicator when awaiting response
   - Error state display for user-safe API error messages
   - Purpose statement and limitation notice in a persistent header or above the input
2. Implement client-side state management:
   - Current user input text
   - Conversation history (array of user/assistant turn pairs)
   - Loading state
   - Error state
   - Prevent empty message submission
   - Prevent duplicate in-flight requests (disable submit while loading)
   - Clear input field after successful submission
3. Connect to the existing API contract from [src/lib/chat/contracts.ts](src/lib/chat/contracts.ts):
   - POST to `/api/chat` with `ChatRequest` payload
   - Handle `ChatSuccessResponse` by appending assistant message to history
   - Handle `ChatErrorResponse` by displaying the user-safe error message
   - Respect `CHAT_MAX_MESSAGE_LENGTH` (2,000 characters) client-side
   - Maintain up to `CHAT_MAX_HISTORY_TURNS` (10 turns) for context
4. Ensure accessibility and responsive behavior:
   - Semantic HTML structure (main, form, textarea, button, list/article for messages)
   - Visible focus indicators (already established in globals.css)
   - Keyboard submission (Enter to submit, Shift+Enter for newline)
   - ARIA labels for loading state and error announcements
   - Mobile-friendly touch targets and responsive layout
   - Desktop and mobile viewport testing
5. Add proportionate tests:
   - Rendering: component mounts with purpose statement and input elements
   - Interaction: typing, submission, message appending
   - Loading state: submit button disabled, loading indicator visible
   - Error handling: API error displays user-safe message, internal details excluded
   - Empty input: submit button remains disabled or submission is blocked
   - Client-side validation: oversized message blocked before API call
   - History management: maintains correct turn structure for API payload
6. Update global styles in [src/app/globals.css](src/app/globals.css) as needed for:
   - Message turn containers (user vs assistant visual distinction)
   - Input area layout and character counter
   - Loading indicator styling
   - Error message styling
   - Responsive behavior for chat layout

## Out of scope

- Suggested questions or starter prompts (P5-S3 candidate)
- Approved action links or URL rendering from assistant responses (P5-S3)
- Markdown or rich text rendering in messages
- Conversation export or persistence across page reloads
- Streaming responses
- Message editing or deletion
- Conversation reset button (acceptable to include if trivial, but not required)
- Admin or operator interface
- Analytics or telemetry integration
- Rate limiting or usage quotas UI
- Multi-device conversation sync
- Authentication or user profiles
- Custom themes or dark mode toggle
- Deployment changes or infrastructure work

## Current-state evidence

- All P1-P4 specs are APPROVED and implemented:
  - [specs/p1-scaffold.md](specs/p1-scaffold.md) — application scaffold complete
  - [specs/p1-shell-health.md](specs/p1-shell-health.md) — static shell and health endpoint
  - [specs/p2-shared-chat-validation.md](specs/p2-shared-chat-validation.md) — chat contracts and validation
  - [specs/p2-input-guardrails.md](specs/p2-input-guardrails.md) — input safety checks
  - [specs/p2-chat-api-skeleton.md](specs/p2-chat-api-skeleton.md) — API route skeleton
  - [specs/p3-knowledge-schema.md](specs/p3-knowledge-schema.md) — knowledge base structure
  - [specs/p3-deterministic-retrieval.md](specs/p3-deterministic-retrieval.md) — retrieval logic
  - [specs/p3-retrieval-guardrails.md](specs/p3-retrieval-guardrails.md) — retrieval safety
  - [specs/p4-anthropic-provider.md](specs/p4-anthropic-provider.md) — LLM provider integration
  - [specs/p4-system-prompt.md](specs/p4-system-prompt.md) — system prompt and context
  - [specs/p4-output-validation.md](specs/p4-output-validation.md) — output guardrails
  - [specs/p4-e2e-orchestration.md](specs/p4-e2e-orchestration.md) — full pipeline integration
- Current [src/app/page.tsx](src/app/page.tsx) shows static shell with no interactive elements
- No chat UI components exist in [src/components/](src/components/)
- API route [src/app/api/chat/route.ts](src/app/api/chat/route.ts) is fully implemented and tested
- Chat contracts in [src/lib/chat/contracts.ts](src/lib/chat/contracts.ts) define request/response shapes
- Global styles in [src/app/globals.css](src/app/globals.css) provide accessible focus and responsive baseline
- Verification commands exist in [package.json](package.json): `lint`, `typecheck`, `test`, `build`
- Phase P5 in [implementation-plan.md](implementation-plan.md) identifies P5-S1 as "Build the basic chat interaction"
- P5-S1 dependencies (P4-S4) are satisfied
- P5-S3 will handle approved action rendering separately

## Decisions and assumptions

- Decision: P5-S1 is the next bounded story because it is the earliest incomplete unblocked slice in Phase P5, with all dependencies satisfied.
- Decision: Build chat UI as React client components using Next.js App Router conventions.
- Decision: Use React `useState` for simple in-component state; no external state library needed for MVP scope.
- Decision: Display all message turns in a single scrollable container rather than paginated or virtualized (acceptable for MVP with 10-turn limit).
- Decision: Character count indicator helps users stay within 2,000-char limit without cryptic validation errors.
- Decision: Keyboard shortcut (Enter to submit, Shift+Enter for newline) follows common chat UX patterns.
- Decision: Loading state disables submit button and shows visible indicator to prevent duplicate requests.
- Decision: Error messages from API are already user-safe per output guardrails; display them directly without transformation.
- Assumption: Message history is kept in client state only; no server-side session or persistence required for MVP.
- Assumption: Message turns will be plain text display for now; rich rendering of links/actions is P5-S3 scope.
- Assumption: The existing globals.css provides sufficient baseline; chat-specific styles can be added inline or extended minimally.
- Assumption: Manual accessibility and responsive checks are acceptable for this story; automated a11y testing tools are not required but may be added if practical.

## Executable tasks

1. Create chat UI component file (e.g., [src/components/ChatInterface.tsx](src/components/ChatInterface.tsx)):
   - Define state for input text, conversation history, loading, error
   - Render purpose/limitation header
   - Render message history container with user/assistant turn visual distinction
   - Render textarea input with character counter
   - Render submit button with loading-disabled logic
   - Render error message display when error state is present
   - Implement form submission handler that calls `/api/chat`
   - Handle success response by appending new turn and clearing input
   - Handle error response by setting error state
   - Implement keyboard shortcuts (Enter to submit, allow Shift+Enter for newlines)
2. Update [src/app/page.tsx](src/app/page.tsx):
   - Import and render the chat interface component
   - Remove or replace static shell sections with the interactive UI
   - Maintain overall page structure and semantic HTML
3. Extend [src/app/globals.css](src/app/globals.css):
   - Add styles for message turn containers (user/assistant distinction)
   - Add styles for textarea input and character counter
   - Add styles for loading indicator
   - Add styles for error message banner/alert
   - Ensure responsive behavior on mobile viewports
4. Add proportionate tests (e.g., [src/components/ChatInterface.test.tsx](src/components/ChatInterface.test.tsx)):
   - Test: component renders with input, submit button, and purpose statement
   - Test: typing in textarea updates state
   - Test: submit button disabled when input is empty
   - Test: submit button disabled when loading
   - Test: oversized message (>2,000 chars) triggers client-side warning or blocks submission
   - Test: successful API response appends message to history and clears input
   - Test: API error response displays user-safe error message
   - Test: loading state shows indicator and disables submit
   - Test: history respects 10-turn limit for API payload
5. Manual verification checklist (record in spec or commit message):
   - Desktop Chrome/Firefox: type, submit, see response
   - Mobile viewport (DevTools): layout works, touch targets adequate
   - Keyboard only: tab to input, type, Enter to submit, Shift+Enter for newline
   - Screen reader spot check: purpose statement and error announcements perceivable
   - Loading state: indicator visible, duplicate submissions blocked
   - Error scenario: trigger API error (e.g., disconnect network), verify user-safe message
6. Run full verification suite:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
   - `npm run build`

## Acceptance criteria

- A functional chat interface replaces the static shell in [src/app/page.tsx](src/app/page.tsx).
- User can type a message, submit it, and see both the user message and assistant response appended to the conversation.
- Loading state is visible during API request; submit button is disabled.
- API errors display user-safe messages from the error response; no stack traces or internal details appear.
- Empty messages cannot be submitted.
- Messages exceeding 2,000 characters are blocked or warned about before submission.
- Conversation history maintains up to 10 turns for API context.
- Keyboard navigation works: focus visible, Enter submits, Shift+Enter allows multiline.
- Mobile and desktop layouts are usable and responsive.
- Purpose statement and limitation notice remain visible.
- Automated tests cover rendering, interaction, loading, error, and validation.
- Repository verification commands pass:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`

## Tests

Automated component tests (React Testing Library or equivalent):

1. Rendering:
   - Chat interface renders with textarea, submit button, and purpose/limitation text
   - Message history container is present (empty initially)
2. Interaction:
   - User can type in textarea
   - Submit button is disabled when textarea is empty
   - Submitting a valid message calls `/api/chat` with correct payload structure
3. Loading state:
   - Submit button is disabled during API call
   - Loading indicator is visible during API call
4. Success flow:
   - Successful API response appends user + assistant messages to history
   - Input textarea is cleared after successful submission
5. Error handling:
   - API error response displays user-safe error message
   - Error message does not contain stack traces or internal details
   - User can attempt another message after error
6. Client-side validation:
   - Empty message submission is blocked
   - Oversized message (>2,000 chars) is blocked or warned
7. History management:
   - History includes both user and assistant messages in correct order
   - API payload includes history array with up to 10 turns

Manual accessibility and responsive checks (documented in commit or verification report):

- Keyboard navigation: tab order, Enter to submit, Shift+Enter for newline
- Focus indicators: visible on all interactive elements
- Mobile layout: usable on 375px and 768px viewports
- Touch targets: adequate size for mobile interaction
- Screen reader: purpose statement and error announcements are perceivable

## Verification commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All commands must pass before marking this story complete.

## Risks and pending decisions

**Risks:**

1. Risk: Chat component complexity could introduce untested edge cases.
   - Mitigation: Keep state management simple; use established React patterns; add proportionate tests.
2. Risk: Accessibility gaps could make the interface unusable for keyboard or screen reader users.
   - Mitigation: Manual keyboard and screen reader spot checks; follow semantic HTML and ARIA best practices; existing focus indicators provide baseline.
3. Risk: Mobile layout could be unusable or have touch target issues.
   - Mitigation: Test on representative mobile viewports; use responsive CSS already established in globals.css.
4. Risk: Duplicate submissions could occur if loading state is not correctly enforced.
   - Mitigation: Explicitly disable submit button and form submission during loading; test this scenario.
5. Risk: Error messages could expose internal details if API changes.
   - Mitigation: API already enforces user-safe error messages through output guardrails; UI should display them directly without transformation.

**Pending decisions:**

- Decision resolved: Use React `useState` for component state (no Redux or Zustand needed for MVP).
- Decision resolved: Plain text message rendering for P5-S1; link/action rendering is P5-S3.
- Decision resolved: Character counter is client-side only; validation still occurs at API boundary.
- Decision resolved: Conversation history is client-only; no server-side session storage.
- Decision resolved: Manual accessibility checks are sufficient for P5-S1; automated tooling is optional enhancement.

**Contradictions:**

- None identified. P5-S1 is correctly sequenced after P4-S4 in [implementation-plan.md](implementation-plan.md) and has no unresolved dependencies.

**Unresolved decisions requiring user input:**

- None. This story is self-contained and implementable with current repository state.

## Notes

- P5-S2 does not appear in [implementation-plan.md](implementation-plan.md) story descriptions, though it appears in the dependency graph. Assuming it was removed or is a placeholder; P5-S3 depends only on P5-S1, not P5-S2.
- P5-S3 will handle rendering approved actions and links from assistant responses; that is explicitly out of scope for P5-S1.
- Suggested questions/starter prompts are mentioned in CLAUDE.md UI Expectations but are not required for P5-S1; they may be added in P5-S3 or as a follow-on enhancement.
- This spec uses the established format from existing approved specs and grounds all decisions in repository evidence.
