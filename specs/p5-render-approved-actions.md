# P5-S3 — Render Approved Actions Safely

Status: APPROVED
Plan phase: Phase P5 — Chat user experience

## Outcome

Extend the chat response contract and UI to include structured, server-approved action links (e.g., "Book a strategy call", "Access client portal") that are rendered safely with proper accessibility, security attributes, and visual distinction from message text. Only exact allowlisted URLs may be clickable. Arbitrary model text and URLs remain non-executable.

## In scope

1. **Update the link allowlist** in [src/lib/knowledge/links.ts](src/lib/knowledge/links.ts):
   - Add portal URL: `https://send.reignmakerapp.com/login`
   - Verify strategy call URL: `https://www.cadreai.com/contact` (already present)
   - Document D4 resolution and URL approval source

2. **Extend the chat response contract** in [src/lib/chat/contracts.ts](src/lib/chat/contracts.ts):
   - Add optional `actions` field to `ChatSuccessResponse`:
     ```typescript
     actions?: Array<{
       label: string;
       url: string;
     }>;
     ```
   - Document that actions are server-approved and pre-validated

3. **Update API route** [src/app/api/chat/route.ts](src/app/api/chat/route.ts):
   - After retrieval, extract `actionGuidance` and `approvedUrl` from top-scoring knowledge entries
   - Include actions in the response when both fields are present and URL is allowlisted
   - Deduplicate actions (same URL should not appear multiple times)
   - Limit actions to 3 maximum to prevent UI clutter
   - Actions are optional; responses without actions are valid

4. **Create a safe link component** (e.g., [src/components/SafeActionLink.tsx](src/components/SafeActionLink.tsx)):
   - Accept only `label` and `url` props (both required strings)
   - Validate URL against `APPROVED_LINKS` before rendering
   - Render as accessible link with:
     - `rel="noopener noreferrer"` for external links
     - `target="_blank"` to open in new tab
     - Clear visual distinction (button-like styling)
     - Icon or indicator showing external navigation
   - If URL is not in allowlist (defensive check), render nothing or log error
   - Add aria-label when label alone is insufficient (e.g., "Book a strategy call - opens in new tab")

5. **Update ChatInterface** [src/components/ChatInterface.tsx](src/components/ChatInterface.tsx):
   - Parse `actions` array from `ChatSuccessResponse`
   - Render actions below the assistant message using `SafeActionLink`
   - Actions appear as a horizontal button group or vertical stack (mobile-friendly)
   - Actions are associated with their message (not floating or global)
   - Screen readers announce actions as "available actions" or similar landmark

6. **Add proportionate tests**:
   - [src/lib/chat/contracts.test.ts](src/lib/chat/contracts.test.ts): (new or extend existing)
     - Response with actions array validates correctly
     - Response without actions validates correctly
     - Malformed actions array fails validation if present
   - [src/app/api/chat/route.test.ts](src/app/api/chat/route.test.ts): (extend existing)
     - Response includes actions when knowledge entries have actionGuidance + approvedUrl
     - Actions are deduplicated (same URL appears once)
     - Actions are omitted when URL is not in allowlist (defensive)
     - Actions are omitted when actionGuidance or approvedUrl is missing
     - Maximum 3 actions enforced
   - [src/components/SafeActionLink.test.tsx](src/components/SafeActionLink.test.tsx): (new)
     - Renders link with correct href, rel, target, and label
     - Approved URL renders as clickable link
     - Non-approved URL does not render (or renders as disabled/text)
     - Has accessible aria-label
     - Visual indicator for external link is present
   - [src/components/ChatInterface.test.tsx](src/components/ChatInterface.test.tsx): (extend)
     - Assistant message with actions renders action links
     - Assistant message without actions renders message only
     - Multiple actions render in order
     - Actions are visually separated from message text

7. **Update styles** in [src/app/globals.css](src/app/globals.css):
   - Add styles for action button group (`.message-actions`)
   - Add styles for individual action links (`.action-link`)
   - Ensure responsive behavior (horizontal on desktop, vertical/stacked on mobile)
   - Maintain focus indicators and touch-friendly targets (min 44x44px)
   - Add external link icon if desired (optional, can use text indicator)

## Out of scope

- Suggested questions or starter prompts (separate story)
- Markdown rendering for message content (plain text only)
- Rich text formatting (bold, italic, lists) in messages
- Image rendering or embedded media
- Custom action types beyond simple external links (e.g., in-app actions, modals)
- Analytics or click tracking for actions
- Dynamic action generation based on conversation state (actions come from knowledge only)
- Admin interface for managing allowlist
- A/B testing of action labels or placement
- Conversion tracking or UTM parameters
- Authentication or session-aware actions
- Action history or "recently clicked" features

## Current-state evidence

- **P5-S1 implemented and approved:**
  - [specs/p5-basic-chat-ui.md](specs/p5-basic-chat-ui.md) — chat UI complete
  - [src/components/ChatInterface.tsx](src/components/ChatInterface.tsx) — renders plain text messages
  - Current `ChatSuccessResponse` has only `message: string` field
- **Link allowlist exists:**
  - [src/lib/knowledge/links.ts](src/lib/knowledge/links.ts) — `APPROVED_LINKS` array with Cadre URLs
  - Portal URL (`https://send.reignmakerapp.com/login`) not yet added
  - `isApprovedLink()` function validates URLs exactly
- **Knowledge entries support actions:**
  - [src/lib/knowledge/types.ts](src/lib/knowledge/types.ts) — `actionGuidance?: string`, `approvedUrl?: string`
  - [src/lib/knowledge/corpus.ts](src/lib/knowledge/corpus.ts) — many entries have both fields populated
  - Context assembly in [src/lib/prompts/context.ts](src/lib/prompts/context.ts) currently only includes `topic` and `content`, NOT `actionGuidance` or `approvedUrl`
- **Output guardrails validate URLs:**
  - [src/lib/guardrails/output-guardrails.ts](src/lib/guardrails/output-guardrails.ts) — `checkOutputGuardrails()` detects URLs in response text and blocks non-approved ones
  - Existing tests verify approved vs. non-approved URL detection
- **Decision gates:**
  - D4 (Approved URLs) now resolved:
    - Strategy call: `https://www.cadreai.com/contact` (already in allowlist)
    - Client portal: `https://send.reignmakerapp.com/login` (needs adding)
    - No general contact URL (N/A)
  - D2 (Deployment): Vercel deployment (not blocking P5-S3)

## Decisions and assumptions

- **Decision:** P5-S3 is the next bounded story because P5-S1 is complete, P5-S2 is explicitly skipped (user does not want suggested questions), and all dependencies for P5-S3 are satisfied.
- **Decision:** Use structured actions in the response contract rather than parsing URLs from plain text, for clarity, safety, and testability.
- **Decision:** Actions are extracted from retrieved knowledge entries by the API, not generated by the model, ensuring they are always grounded and pre-validated.
- **Decision:** Actions are optional in responses; not every message needs an action.
- **Decision:** Limit actions to 3 maximum to prevent overwhelming the user and maintain UI simplicity.
- **Decision:** Deduplicate actions by URL to avoid redundant buttons (e.g., multiple knowledge entries pointing to the same contact page).
- **Decision:** All action links open in a new tab (`target="_blank"`) with `rel="noopener noreferrer"` for security and to preserve the chat session.
- **Decision:** SafeActionLink performs defensive URL validation even though actions should already be validated server-side, following defense-in-depth principle.
- **Decision:** Action rendering is visual enhancement; screen reader users can still access the links through standard link navigation.
- **Assumption:** Knowledge entries with `actionGuidance` but missing `approvedUrl` should not render as clickable actions (text-only guidance can appear in message content if model includes it, but no clickable link).
- **Assumption:** The order of actions follows the order of retrieved knowledge entries (highest-scoring first).
- **Assumption:** If the same URL appears in multiple retrieved entries, the first occurrence's `actionGuidance` label is used.
- **Assumption:** Actions are rendered per-message, not as a global persistent action bar, to maintain context between question and action.
- **Assumption:** External link icon/indicator can be text-based (e.g., "↗" or "(opens in new tab)") to avoid dependency on icon libraries for MVP.

## Executable tasks

### 1. Update link allowlist

File: [src/lib/knowledge/links.ts](src/lib/knowledge/links.ts)

- Add `"https://send.reignmakerapp.com/login"` to `APPROVED_LINKS` array
- Add comment documenting D4 resolution and approval date (2026-08-04)
- Verify existing strategy call URL is present (`https://www.cadreai.com/contact`)
- Run existing link validation tests to confirm new URL is recognized

### 2. Extend chat contracts

File: [src/lib/chat/contracts.ts](src/lib/chat/contracts.ts)

- Add `actions?: Array<{ label: string; url: string }>` field to `ChatSuccessResponse`
- Add JSDoc comment explaining that actions are server-approved and pre-validated
- If contract validation tests exist, update them to accept optional actions field
- Document that `label` is intended for display (e.g., "Book a strategy call") and `url` is an exact allowlisted URL

### 3. Update API route to extract and include actions

File: [src/app/api/chat/route.ts](src/app/api/chat/route.ts)

- After retrieval step, iterate through scored knowledge entries
- For each entry with both `actionGuidance` and `approvedUrl`:
  - Verify `approvedUrl` is in `APPROVED_LINKS` (defensive check)
  - Add action to response actions array: `{ label: entry.actionGuidance, url: entry.approvedUrl }`
- Deduplicate actions by URL (use Set or Map keyed by URL)
- Limit to maximum 3 actions (slice array if needed)
- Include `actions` field in `ChatSuccessResponse` if array is non-empty
- Add integration tests for action extraction logic

### 4. Create SafeActionLink component

File: [src/components/SafeActionLink.tsx](src/components/SafeActionLink.tsx)

- Accept props: `label: string`, `url: string`
- Import `APPROVED_LINKS` and `isApprovedLink` from `src/lib/knowledge/links`
- Validate `url` against allowlist before rendering
- If invalid, return `null` or log error (defensive check; should not happen if API is correct)
- Render as:
  ```tsx
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="action-link"
    aria-label={`${label} - opens in new tab`}
  >
    {label} ↗
  </a>
  ```
- Add unit tests verifying:
  - Approved URL renders with correct attributes
  - Non-approved URL does not render or renders disabled
  - Aria-label is correct
  - rel and target attributes are present

### 5. Update ChatInterface to render actions

File: [src/components/ChatInterface.tsx](src/components/ChatInterface.tsx)

- Import `SafeActionLink`
- Update success response handling to extract `actions` from `ChatSuccessResponse`
- Extend `ChatTurn` type or component state to include actions:
  ```typescript
  interface ChatTurn {
    userMessage: string;
    assistantMessage: string;
    actions?: Array<{ label: string; url: string }>;
  }
  ```
- When rendering assistant messages, check if `actions` exists and is non-empty
- Render actions below message content:
  ```tsx
  {turn.actions && turn.actions.length > 0 && (
    <div className="message-actions" aria-label="Available actions">
      {turn.actions.map((action, idx) => (
        <SafeActionLink key={idx} label={action.label} url={action.url} />
      ))}
    </div>
  )}
  ```
- Add tests for:
  - Assistant message with actions renders SafeActionLink components
  - Assistant message without actions renders message only
  - Multiple actions render in order
  - Actions container has accessible label

### 6. Add styles for actions

File: [src/app/globals.css](src/app/globals.css)

- Define `.message-actions` container:
  - Margin-top spacing from message content
  - Flexbox layout: row on desktop, column on mobile
  - Gap between action buttons
- Define `.action-link`:
  - Button-like appearance (border, padding, background)
  - Minimum touch target 44x44px
  - Hover/focus states with visible outline
  - External link indicator (↗) styled appropriately
  - Color contrast meets WCAG AA
- Responsive behavior:
  - Desktop: horizontal row, buttons side-by-side
  - Mobile (<640px): vertical stack, full-width buttons

### 7. Add and extend tests

#### New test file: [src/components/SafeActionLink.test.tsx](src/components/SafeActionLink.test.tsx)

- Test: renders link with approved URL
- Test: does not render link with non-approved URL
- Test: link has correct href, target="_blank", rel="noopener noreferrer"
- Test: aria-label includes "opens in new tab"
- Test: external indicator (↗) is present in text

#### Extend: [src/app/api/chat/route.test.ts](src/app/api/chat/route.test.ts)

- Test: response includes actions when knowledge entries have actionGuidance + approvedUrl
- Test: actions are deduplicated by URL
- Test: actions are limited to 3 maximum
- Test: actions are omitted when approvedUrl is not in allowlist
- Test: actions are omitted when actionGuidance is undefined
- Test: actions are omitted when approvedUrl is undefined
- Test: response without matching actions omits actions field (or returns empty array)

#### Extend: [src/components/ChatInterface.test.tsx](src/components/ChatInterface.test.tsx)

- Test: assistant message with actions renders action links below message
- Test: assistant message without actions renders message only (no actions container)
- Test: multiple actions render in order
- Test: actions container has aria-label="Available actions"

## Acceptance criteria

1. **Link allowlist updated:**
   - Portal URL `https://send.reignmakerapp.com/login` is in `APPROVED_LINKS`
   - Strategy call URL `https://www.cadreai.com/contact` is in `APPROVED_LINKS`
   - `isApprovedLink()` validates both URLs correctly

2. **Response contract extended:**
   - `ChatSuccessResponse` includes optional `actions` field
   - Existing API responses without actions remain valid
   - Responses with actions validate correctly

3. **API includes actions when appropriate:**
   - Actions are extracted from knowledge entries with both `actionGuidance` and `approvedUrl`
   - Only allowlisted URLs appear in actions
   - Actions are deduplicated by URL
   - Maximum 3 actions enforced
   - Responses without matching actions omit actions or return empty array

4. **SafeActionLink renders securely:**
   - Only approved URLs render as clickable links
   - Links have `target="_blank"` and `rel="noopener noreferrer"`
   - Links have accessible aria-label indicating external navigation
   - External indicator (↗ or text) is visible
   - Non-approved URLs do not render or render as disabled (defensive)

5. **ChatInterface displays actions:**
   - Actions appear below assistant messages when present
   - Actions are visually distinct from message text
   - Actions are responsive (horizontal on desktop, vertical on mobile)
   - Actions container has semantic accessible label
   - Messages without actions render normally

6. **Styles are accessible and responsive:**
   - Action buttons have minimum 44x44px touch targets
   - Focus indicators are visible
   - Color contrast meets WCAG AA
   - Layout adapts to mobile viewports

7. **Tests pass and cover critical paths:**
   - SafeActionLink unit tests pass
   - API route integration tests for action extraction pass
   - ChatInterface rendering tests for actions pass
   - No regressions in existing tests

8. **Manual verification:**
   - Desktop Chrome/Firefox: ask "How do I book a call?" → action link appears and works
   - Desktop: click action link → new tab opens with correct URL
   - Mobile viewport: action buttons are touch-friendly and vertically stacked
   - Keyboard: tab to action link, Enter opens in new tab
   - Screen reader spot check: action links are announced with "opens in new tab"

## Tests

### Unit tests

**SafeActionLink component ([src/components/SafeActionLink.test.tsx](src/components/SafeActionLink.test.tsx)):**
- Renders link with approved URL
- Does not render link with non-approved URL (or renders disabled/null)
- Link has `href`, `target="_blank"`, `rel="noopener noreferrer"`
- Aria-label includes "opens in new tab"
- External indicator is present

**Contract validation (extend [src/lib/chat/contracts.test.ts](src/lib/chat/contracts.test.ts) or add validation tests):**
- `ChatSuccessResponse` with actions array is valid
- `ChatSuccessResponse` without actions is valid
- Malformed actions array fails validation

### Integration tests

**API route ([src/app/api/chat/route.test.ts](src/app/api/chat/route.test.ts)):**
- Response includes actions when retrieved knowledge has actionGuidance + approvedUrl
- Actions are deduplicated (same URL appears once)
- Actions are limited to 3 maximum
- Actions with non-allowlisted URLs are omitted (defensive)
- Actions with missing actionGuidance are omitted
- Actions with missing approvedUrl are omitted
- Response without actionable knowledge omits actions field

**ChatInterface rendering ([src/components/ChatInterface.test.tsx](src/components/ChatInterface.test.tsx)):**
- Assistant message with actions renders SafeActionLink components
- Assistant message without actions renders message only
- Multiple actions render in order
- Actions container has aria-label

### Manual verification checklist

- [ ] Desktop Chrome: ask "How do I book a strategy call?" → action appears
- [ ] Desktop Firefox: click action link → new tab opens to https://www.cadreai.com/contact
- [ ] Desktop: ask "How do I access the client portal?" → portal action appears
- [ ] Desktop: click portal action → new tab opens to https://send.reignmakerapp.com/login
- [ ] Mobile viewport (DevTools): actions are vertically stacked and touch-friendly
- [ ] Keyboard: tab to action link, Enter opens new tab
- [ ] Keyboard: focus indicator is visible on action button
- [ ] Screen reader (VoiceOver/NVDA spot check): action announced as link with "opens in new tab"
- [ ] Ask question with no actionable knowledge → no action buttons appear
- [ ] Ask question matching multiple entries with same action URL → action appears once only

## Verification commands

After implementation, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All commands must pass with no errors.

Manual verification must be completed and results recorded in commit message or completion report.

## Risks and pending decisions

### Risks

1. **Risk:** Model may mention URLs in message text that are not in the allowlist, causing output guardrails to block the entire response.
   - **Mitigation:** System prompt already instructs model not to invent URLs. Output guardrails enforce this. Retrieval-driven actions are separate from message text.
   - **Severity:** Low (already addressed by P4-S3 output guardrails)

2. **Risk:** User clicks action link expecting in-app behavior (e.g., calendar integration) but gets external website.
   - **Mitigation:** Clear aria-label and visual indicator (↗) communicate external navigation. Target="_blank" preserves chat session.
   - **Severity:** Low (acceptable for MVP)

3. **Risk:** Action labels from knowledge entries may be too generic or unclear (e.g., "Learn more").
   - **Mitigation:** Knowledge corpus review can improve labels. For MVP, rely on existing actionGuidance values.
   - **Severity:** Low (content quality issue, not functional)

4. **Risk:** Actions may not render on very narrow mobile screens if text is long.
   - **Mitigation:** Vertical stacking and full-width buttons on mobile. Test on 320px viewport.
   - **Severity:** Low (responsive design handles this)

5. **Risk:** Adding portal URL to allowlist may expose internal systems if URL is incorrect or changes.
   - **Mitigation:** D4 resolution verified portal URL (`https://send.reignmakerapp.com/login`). URL is public login page, not internal-only.
   - **Severity:** Low (verified URL)

### Pending decisions

None. All required decisions for P5-S3 are resolved:

- ✅ D4 (Approved URLs): Strategy call and portal URLs verified
- ✅ D2 (Deployment): Vercel deployment (not blocking)
- ✅ P5-S1 (Basic Chat UI): Implemented and approved

### Open questions

1. Should action rendering be extended to support in-app actions (e.g., expand FAQ, start a subtask) in the future?
   - **Answer:** Out of scope for MVP. Future enhancement if needed.

2. Should actions include UTM parameters or tracking tokens for analytics?
   - **Answer:** Out of scope for MVP. Pure navigation only.

3. Should the same action appear for every message in a conversation, or only the first/most relevant?
   - **Answer:** For MVP, actions appear per-message based on retrieved knowledge. Future enhancement could track "already shown" actions if needed.

## Notes

- This spec assumes existing knowledge corpus entries have reasonable `actionGuidance` labels. If labels are missing or poor quality, knowledge corpus should be reviewed separately (not blocking this implementation).
- External link security (`rel="noopener noreferrer"`) prevents tab-napping attacks and performance issues from opener references.
- Action deduplication prevents visual clutter when multiple retrieved entries point to the same destination (e.g., three entries all saying "contact us" with the same URL).
- Defensive URL validation in SafeActionLink ensures that even if API logic fails, non-approved URLs cannot become clickable (defense-in-depth).
- The 3-action limit is a UX heuristic to prevent overwhelming users. If a query matches many actionable entries, the top 3 by retrieval score are shown.
