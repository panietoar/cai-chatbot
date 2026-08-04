# Fix TypeScript Errors in Test Files

Status: APPROVED
Plan phase: P5 (maintenance)

## Outcome

Restore the passing typecheck verification baseline by fixing TypeScript compilation errors in test files that deliberately test invalid runtime inputs without compromising type safety or test coverage.

## In scope

- Fix 6 TypeScript errors in `src/lib/prompts/context.test.ts` related to deliberately assigning `null` to typed properties in invalid-input tests
- Preserve test intent: these tests validate runtime handling of invalid inputs (null values, undefined, wrong types)
- Maintain strict TypeScript configuration and type safety at module boundaries
- Ensure all verification commands pass: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`

## Out of scope

- Changing test coverage or test cases
- Modifying implementation code in `src/lib/prompts/context.ts`
- Relaxing TypeScript strict mode or type-checking rules
- Adding new test patterns or frameworks
- Changing any behavior of the context assembly logic

## Current-state evidence

**Observed 2026-08-04:**

```bash
$ npm run typecheck
> tsc --noEmit

src/lib/prompts/context.test.ts:269:5 - error TS2322: Type 'null' is not assignable to type 'string | undefined'.
269     mutableRequest.systemPromptVersion = null;

src/lib/prompts/context.test.ts:290:5 - error TS2322: Type 'null' is not assignable to type 'string | undefined'.
290     mutableRequest.currentQuery = null;

src/lib/prompts/context.test.ts:313:5 - error TS2322: Type 'null' is not assignable to type 'ScoredEntry[] | undefined'.
313     mutableRequest.knowledge = null;

src/lib/prompts/context.test.ts:325:5 - error TS2322: Type 'null' is not assignable to type '{ role: "user" | "assistant"; content: string; }[] | undefined'.
325     mutableRequest.conversationHistory = null;

src/lib/prompts/context.test.ts:354:5 - error TS2322: Type 'null' is not assignable to type 'string | undefined'.
354     mutableRequest.requestId = null;

src/lib/prompts/context.test.ts:366:5 - error TS2322: Type 'null' is not assignable to type 'string | undefined'.
366     mutableRequest.currentQuery = null;

Found 6 errors in the same file
```

**Repository status:**
- All Phase P5 specs (P5-S1, P5-S3) are APPROVED
- `src/lib/prompts/context.ts` and `context.test.ts` exist from P4-S2
- Tests use a pattern attempting to bypass TypeScript for invalid-input testing: `const mutableRequest = request as Partial<ContextAssemblyRequest> & { systemPromptVersion: unknown };`
- The pattern successfully allows the variable to hold `unknown`, but the assignment `mutableRequest.systemPromptVersion = null;` is still type-checked against the original typed property
- `npm run lint` passes
- `npm test` would pass if typecheck were fixed
- `npm run typecheck` fails with 6 errors
- `npm run build` cannot be verified until typecheck passes

## Decisions and assumptions

**Decision:** Use a more explicit type-assertion pattern that allows tests to deliberately pass invalid values to runtime validation functions without TypeScript preventing the assignment.

**Assumption:** The tests are correctly structured and their intent (validating runtime behavior when receiving null/invalid inputs) is correct; only the TypeScript pattern needs adjustment.

**Assumption:** The implementation code in `context.ts` correctly handles these invalid inputs at runtime and returns appropriate error objects.

## Executable tasks

1. Read `src/lib/prompts/context.test.ts` lines 265-370 to understand the current test pattern and all affected test cases
2. Identify the exact lines where TypeScript errors occur (already known from typecheck output)
3. Update the type-assertion pattern to use `any` or a more explicit cast that allows the assignment without compromising the test's ability to verify runtime validation:
   - Option A: Cast the entire request object to `any` before assignment
   - Option B: Use `(mutableRequest as any).propertyName = null;`
   - Option C: Create a properly typed test helper that explicitly allows invalid values
4. Apply the chosen pattern consistently to all 6 failing test cases
5. Verify no other test files have similar patterns that might fail in the future
6. Run `npm run typecheck` to confirm all errors are resolved
7. Run `npm test` to confirm tests still pass and validate the same runtime behavior
8. Run full verification: `npm run lint && npm run typecheck && npm test && npm run build`

## Acceptance criteria

- `npm run typecheck` exits with code 0 and reports no errors
- All existing tests in `src/lib/prompts/context.test.ts` continue to pass
- The tests still validate that `assembleContext` correctly rejects null/invalid inputs at runtime
- Test intent and coverage are preserved: the same invalid-input scenarios are tested
- No new TypeScript errors are introduced in other files
- All four verification commands pass: lint, typecheck, test, build
- No `tsconfig.json` rules are relaxed
- No implementation code is modified

## Tests

**Affected test cases in `src/lib/prompts/context.test.ts`:**

All tests are in the `describe("Context Assembly — Invalid Inputs")` block:

1. "should reject null systemPromptVersion" (line ~269)
2. "should reject null currentQuery" (line ~290)
3. "should reject null knowledge" (line ~313)
4. "should reject null conversationHistory" (line ~325)
5. "should reject null requestId" (line ~354)
6. "should not raise exceptions; return error objects instead" (line ~366)

**Required test validation:**

- All 6 affected tests must continue to pass after the fix
- Test assertions must remain unchanged
- The runtime behavior being validated (rejection of null values) must be preserved

**Regression check:**

- Run the full test suite to ensure no other tests are affected
- Verify test output shows the same number of passing tests before and after

## Verification commands

From [package.json](../package.json):

```bash
npm run lint      # ESLint must pass
npm run typecheck # TypeScript compilation must pass (currently fails)
npm test          # Vitest unit and integration tests must pass
npm run build     # Next.js production build must succeed
```

**Expected outcome:**

All four commands exit with code 0.

## Risks and pending decisions

### Risks

**Low risk — Type assertion pattern choice:**
- Option A (`request as any`) is simplest but loses all type safety for the entire object
- Option B (`(mutableRequest as any).property = null`) is targeted but repetitive
- Option C (test helper) is cleanest but adds indirection

**Mitigation:** Choose Option B for its balance of clarity and minimal scope. The cast is local to each assignment, making the intent explicit.

### Pending decisions

None. This is a straightforward maintenance fix with a clear technical solution.

### Contradictions

**P5-S2 gap:** The implementation-plan.md dependency chain includes `P5-S2` between P5-S1 and P5-S3, but no P5-S2 spec exists and no P5-S2 story is defined in Phase P5. This appears to be a documentation inconsistency but does not block this maintenance fix.

**Not blocking:** This spec can proceed independently; the P5-S2 gap should be documented separately if it represents missing work rather than merged stories.
