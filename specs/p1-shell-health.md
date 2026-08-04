# P1-S2 — Public Cadre Shell and Health Signal

Status: APPROVED
Plan phase: P1

## Outcome
Replace scaffold placeholder UI with a minimal, accessible public Cadre support shell that clearly states assistant purpose and limitations, and add a lightweight health signal endpoint for deployment verification before chat behavior is introduced.

## In scope
- Replace scaffold text on the main page with a minimal Cadre support landing shell.
- Add clear, visible copy for:
  - What the assistant is for.
  - What it cannot do yet.
- Establish simple responsive layout primitives for desktop and mobile.
- Ensure basic accessibility: semantic landmarks, heading structure, visible focus, readable contrast.
- Add a lightweight read-only health endpoint at `/api/health` that returns a safe status payload with no secrets or internal details.
- Add proportionate tests for the health endpoint and key shell rendering assertions.
- Run existing verification commands from package scripts.

## Out of scope
- Chat message interaction, input box, conversation state, or API chat orchestration.
- Knowledge base, retrieval, prompt assembly, provider integration, or guardrails.
- Suggested questions and approved action links.
- Deployment wiring changes beyond what is needed to verify the endpoint exists.
- README or architecture documentation expansion.

## Current-state evidence
- Scaffold placeholder page is still present in `src/app/page.tsx`.
- Styling is minimal and non-productized in `src/app/globals.css`.
- Root metadata exists but no structured public shell yet in `src/app/layout.tsx`.
- Existing tests are only a smoke test in `src/app/smoke.test.ts`.
- Toolchain and verification scripts already exist in `package.json`.
- Roadmap orders this story directly after P1-S1 in `implementation-plan.md`.

## Decisions and assumptions
- Decision: Include the health endpoint in this story because it materially helps P1 deployment verification while remaining a small, isolated addition.
- Decision: Keep the health payload minimal and static (for example status and service name) to avoid exposing runtime configuration, secrets, or provider information.
- Assumption: No approved external URLs are required for this story; limitation text remains plain and non-promissory.
- Assumption: Visual design remains intentionally lightweight and functional at this stage, prioritizing clarity and accessibility over full chat UX.

## Executable tasks
1. Update the page component to a minimal Cadre support shell with purpose and limitation copy, using semantic structure (`main`, heading, supporting text).
2. Expand global styles only as needed for responsive spacing, readable typography, and visible focus indicators.
3. Add a server route handler for `GET /api/health` under the App Router API path.
4. Ensure the health handler returns a safe JSON response and does not include environment values, stack traces, provider details, or secrets.
5. Add or update tests:
   - One test for health endpoint response shape and status code.
   - One rendering-oriented test that asserts the shell purpose and limitation text are present.
6. Confirm existing smoke test still passes or remove duplication if superseded.
7. Run lint, typecheck, tests, and build from current package scripts.
8. Manually verify desktop and mobile rendering and basic keyboard focus behavior.

## Acceptance criteria
- Main page no longer contains scaffold placeholder wording from `src/app/page.tsx`.
- The shell explicitly communicates assistant purpose and current limitation boundaries.
- Layout is usable at common mobile and desktop widths without content overlap or clipping.
- Keyboard focus is visible on interactive elements.
- `GET /api/health` exists and returns 200 with a minimal safe JSON payload.
- Health response contains no secret, environment configuration, stack trace, model name, or provider internals.
- Automated checks pass:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`

## Tests
- Health route test:
  - Verifies HTTP 200.
  - Verifies stable minimal JSON shape.
  - Verifies absence of sensitive/internal fields.
- Shell rendering test:
  - Verifies purpose text is rendered.
  - Verifies limitation text is rendered.
- Keep tests deterministic and offline; no network dependency.

## Verification commands
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Risks and pending decisions
- Risk: Scope creep into chat UX can delay progression to deterministic API boundary stories.
  Mitigation: Keep this story strictly to static shell plus health endpoint.
- Risk: Health route may accidentally expose runtime or deployment details.
  Mitigation: Enforce a minimal explicit response contract and test for excluded fields.
- Pending decision: Final wording tone for limitation text (strictly neutral vs more marketing-oriented) may need stakeholder preference before implementation polish.
- Pending decision: Whether to include a non-sensitive version indicator in health payload now or defer to later observability work.
