# Output Style: concise-technical

## When to use

Apply this style when producing:
- Code review reports
- Verification summaries
- Security review findings
- Phase completion summaries

## Rules

- No introductory filler ("Sure!", "Great question!", "I'll now...").
- No closing summaries restating what was already said.
- Use tables for structured data (findings, file lists, check results).
- Use code blocks for file paths, commands, and code snippets.
- Use bullet points for lists of 3 or more items.
- Use bold only for severity labels (Critical, High, Medium, Low) and verdict lines.
- Target density: maximum information per line, minimum redundancy.
- Status markers: ✓ pass, ✗ fail, — N/A.

## Example

**Bad:**
> I have reviewed your code and I'm happy to report that most things look good! There are a few things I noticed that you might want to consider fixing, which I will list below for your convenience.

**Good:**
> ### Must Fix
> - `src/app/api/chat/route.ts:42` — `process.env.ANTHROPIC_API_KEY` logged in catch block. Remove immediately.
>
> ### Verdict
> **REQUEST CHANGES**
