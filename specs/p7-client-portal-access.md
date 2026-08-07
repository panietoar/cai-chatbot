# P7 — Client Portal Access Information

Status: APPROVED
Plan phase: P3 (Knowledge Enhancement)

## Outcome

Update the `client-portal` knowledge entry to provide clear, actionable information about accessing Cadre AI's client portal, including the verified login URL that is already in the approved links allowlist. Replace the current placeholder language stating that no URL has been verified with direct guidance for existing clients.

## In scope

- Update the `client-portal` knowledge entry in `src/lib/knowledge/corpus.ts`:
  - Revise content to provide clear instructions for existing clients
  - Change `approvedUrl` from contact page to the verified portal login URL
  - Update `actionGuidance` to direct users to the portal login
  - Update `approvalNote` to reflect that the portal URL has been verified
- Ensure the portal URL (`https://send.reignmakerapp.com/login`) remains in the approved links allowlist
- Add or update tests in `src/lib/knowledge/corpus.test.ts` if needed
- Verify retrieval correctly matches portal-related queries to the updated entry
- Verify output guardrails accept responses containing the portal link

## Out of scope

- Adding authentication or real portal access to the chatbot itself
- Implementing password reset functionality
- Adding client-specific portal features or account information
- Creating a portal onboarding guide or documentation
- Changing the portal URL or the link allowlist structure
- Modifying other knowledge entries
- Adding new knowledge entries beyond the client portal update

## Current-state evidence

**Existing implementation:**
- [src/lib/knowledge/corpus.ts](../src/lib/knowledge/corpus.ts#L558-L587) contains a `client-portal` entry (ID: `client-portal`)
- Current content states: "The approved knowledge base does not contain a verified direct portal login URL or account-recovery procedure."
- Current `approvedUrl`: `https://www.cadreai.com/contact`
- Current `actionGuidance`: "Contact Us About Portal Access"
- [src/lib/knowledge/links.ts](../src/lib/knowledge/links.ts#L26) includes `https://send.reignmakerapp.com/login` in `APPROVED_LINKS`
- The portal URL has been approved (decision gate D4 was resolved on 2026-08-04 per inline comment)

**Problem:**
The knowledge entry content contradicts the fact that the portal URL is verified and approved. Users asking about portal access are being directed to the contact page instead of the actual portal login.

**Expected behavior after this change:**
When a user asks "How do I access the Cadre portal?" or similar questions, the chatbot should:
1. Explain that the portal is available for existing clients
2. Provide the login URL as an approved action
3. Suggest contacting Cadre support for account setup or access issues

## Decisions and assumptions

**Decision:** The portal URL `https://send.reignmakerapp.com/login` has been verified and approved for inclusion in chatbot responses.

**Decision:** The updated content will:
- Clarify that the portal is for existing Cadre clients
- Provide clear instructions to visit the login URL
- Explain what the portal provides (tracking tools, agents, training, results)
- Direct users with account issues to contact support

**Decision:** Keep the existing keywords array as it covers the relevant terms.

**Decision:** Maintain the same entry ID (`client-portal`) to preserve retrieval consistency.

**Assumption:** The portal URL will remain stable and does not require frequent updates.

**Assumption:** The chatbot should not attempt to troubleshoot specific portal login failures or technical issues - those should be escalated to Cadre support.

**Assumption:** Users who don't have portal access yet (prospective clients) should be guided to contact Cadre through the contact page.

## Executable tasks

1. Read the current `client-portal` entry in [src/lib/knowledge/corpus.ts](../src/lib/knowledge/corpus.ts#L558-L587)
2. Update the entry with the following changes:
   - **content**: Replace with clear guidance stating:
     - The portal is available for existing Cadre AI clients
     - It provides access to track AI tools, agents, training, and results
     - Existing clients can log in at the provided URL
     - Users who need account setup or have access issues should contact Cadre support
   - **approvedUrl**: Change from `https://www.cadreai.com/contact` to `https://send.reignmakerapp.com/login`
   - **actionGuidance**: Change from "Contact Us About Portal Access" to "Access the Client Portal"
   - **approvalNote**: Update to reflect that the portal URL has been verified and approved
   - **effectiveDate**: Update to current date (2026-08-07)
   - **keywords**: Keep unchanged (already comprehensive)
3. Verify the updated entry passes validation:
   - All required fields present
   - URL is in the approved links allowlist
   - Schema version is "v1"
   - Content is clear and actionable
4. Run existing corpus validation tests to ensure no regressions
5. Manually test retrieval with portal-related queries:
   - "How do I access the portal?"
   - "Where can I log in to my Cadre account?"
   - "Client portal access"
   - "Portal login"
6. Verify the updated entry is properly retrieved and formatted in responses
7. Run full verification: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`

## Acceptance criteria

- [ ] The `client-portal` knowledge entry content no longer states that no URL has been verified
- [ ] The entry provides clear, actionable guidance for existing clients
- [ ] The `approvedUrl` points to `https://send.reignmakerapp.com/login`
- [ ] The `actionGuidance` reads "Access the Client Portal" or similar action-oriented text
- [ ] The `approvalNote` reflects that the URL has been verified
- [ ] The `effectiveDate` is updated to 2026-08-07
- [ ] All existing corpus validation tests pass
- [ ] Portal-related queries successfully retrieve the updated entry
- [ ] The chatbot response includes the portal link as an approved action
- [ ] No new errors or warnings in verification commands
- [ ] The updated content distinguishes between existing clients (who can log in) and prospective clients (who should contact Cadre)

## Tests

All tests are deterministic and require no network access.

### Existing tests to verify

1. **Corpus validation** (`corpus.test.ts`):
   - All entries in `KNOWLEDGE_CORPUS` pass validation
   - All entry IDs remain unique
   - All URLs are in the approved allowlist

### Manual verification tests

1. **Portal access query**: Query "How do I access the client portal?" retrieves the `client-portal` entry
2. **Login query**: Query "Where do I log in?" retrieves the `client-portal` entry
3. **Portal URL query**: Query "Cadre portal" retrieves the `client-portal` entry with correct URL
4. **Action rendering**: Response includes "Access the Client Portal" action with correct URL

### Expected retrieval behavior

**User query:** "How do I access the Cadre portal?"

**Expected response structure:**
- Main content explaining the portal is for existing clients
- Clear statement that they can log in at the provided URL
- Guidance for users without access to contact support
- Approved action: "Access the Client Portal" → `https://send.reignmakerapp.com/login`

## Verification commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All commands must pass with no new errors or warnings.

## Risks and pending decisions

### Risks

1. **Portal URL stability**: If the portal URL changes in the future, the knowledge entry and allowlist must be updated together. Consider adding a comment or documentation noting this dependency.

2. **Account setup confusion**: Users without portal accounts may try to access the portal and encounter login failures. The content should make it clear that the portal is for existing clients only.

3. **Password reset requests**: Users may ask the chatbot to reset their password or troubleshoot login issues. The chatbot should escalate these to Cadre support rather than attempting to handle them.

### Mitigation

- Keep language clear that the portal is for "existing Cadre AI clients"
- Include guidance in the content to contact support for account setup or access issues
- Ensure the contact information entry remains accessible for escalation

### Contradictions

None identified. The change aligns with:
- [plan.md §3](../plan.md#L43) MVP scope: "How existing clients access the Cadre portal"
- [CLAUDE.md](../CLAUDE.md#L21) grounding requirement: using approved links only
- [implementation-plan.md](../implementation-plan.md#L217) D4 decision gate: portal URL has been verified

### Open questions for user

1. **Content tone**: Should the language emphasize security/restricted access, or be more welcoming to existing clients?

2. **Account setup process**: Should the content mention how new clients get portal access, or simply direct them to contact Cadre?

3. **Support escalation**: Should the entry provide specific contact information (email/phone) for portal issues, or just reference the general contact page?

4. **Portal features**: Should the updated content expand on portal capabilities (tracking tools, agents, training results), or keep it brief?

## Definition of done

- All executable tasks completed
- All acceptance criteria met
- Existing corpus validation tests pass
- Manual retrieval verification confirms correct entry matching
- All verification commands pass with no new errors
- Updated entry content is clear, accurate, and actionable
- Portal URL is correctly linked and in the allowlist
- Documentation (inline comments) reflects the verified status
- No fabricated capabilities or unverified claims in the updated content
- Spec reviewed and approved by the user

---

## Proposed updated entry content

```typescript
{
  id: "client-portal",
  topic: "Client Portal",
  content:
    "Cadre AI provides a centralized client portal for existing clients to track AI tools, agents, training progress, and implementation results. The portal helps clients stay aligned with their AI initiatives, maintain accountability across teams, and understand which AI projects are delivering value. Existing clients can access the portal by visiting the login page. If you need help setting up your portal account or have trouble accessing it, please contact Cadre support.",
  keywords: [
    "portal",
    "client portal",
    "cadre portal",
    "login",
    "log in",
    "sign in",
    "account",
    "dashboard",
    "track results",
    "track tools",
    "track agents",
    "training results",
    "access portal",
    "portal access",
    "forgot password",
    "password reset",
  ],
  approvalNote:
    "Portal URL verified and approved on 2026-08-04. Portal capabilities are described on Cadre AI's official website. For account setup and technical support, clients should contact Cadre directly.",
  actionGuidance:
    "Access the Client Portal",
  approvedUrl: "https://send.reignmakerapp.com/login",
  schemaVersion: "v1",
  effectiveDate: "2026-08-07T00:00:00Z",
}
```

Key changes:
- ✅ Removed "no verified URL" language
- ✅ Added clear instructions for existing clients
- ✅ Explained portal purpose and capabilities
- ✅ Included support escalation guidance
- ✅ Changed URL to actual portal login
- ✅ Updated action guidance to be direct and actionable
- ✅ Updated approval note to reflect verification
- ✅ Updated effective date to today
