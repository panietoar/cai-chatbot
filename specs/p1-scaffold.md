# P1-S1 — Scaffold the application and quality baseline

Status: APPROVED
Plan phase: P1

## Outcome

A minimal Next.js application with App Router, TypeScript strict mode, ESLint, Prettier, and Vitest that builds
successfully. All four verification commands (`lint`, `typecheck`, `test`, `build`) exist and pass. No boilerplate,
telemetry, or sample content remains.

## In scope

- Initialize Next.js 15 with TypeScript, App Router, and `src/` directory layout
- Configure strict TypeScript in `tsconfig.json`
- Configure ESLint with the Next.js rule set
- Configure Prettier; resolve any ESLint/Prettier conflicts
- Install and configure Vitest with `@vitejs/plugin-react`
- Define `lint`, `typecheck`, `test`, and `build` scripts in `package.json`
- Pin Node 20 LTS via `.nvmrc` or `package.json` `engines`
- Strip all Next.js boilerplate: sample CSS, SVGs, unused assets, example text
- Replace `app/page.tsx` with a single minimal placeholder
- Run and confirm all four verification commands pass

## Out of scope

- Chat UI or any Cadre-specific content (P1-S2)
- Health route (P1-S2)
- Vercel deployment (P1-S3)
- Knowledge base or retrieval (Phase P3)
- Any provider integration or API routes (Phase P4)
- CSS framework selection (P1-S2)

## Current-state evidence

P0-S1 validation performed on 2026-08-03:

| Check | Result |
|---|---|
| `.claude/settings.json` valid JSON and schema-referenced | ✓ |
| `.claude/settings.local.json` git-ignored and write-blocked by hook | ✓ |
| `.env` and `.env.*` excluded from git and from read/write by hooks | ✓ |
| `plan.md` / `CLAUDE.md` / `implementation-plan.md` — no blocking contradictions | ✓ |
| `plan.md §6` lists "Vitest or Jest" — resolved to Vitest in D1 | Resolved |
| `claude doctor` — CLI availability in environment unconfirmed | Known limitation |

No application code, `package.json`, tests, README, or deployment configuration exists at baseline.

## Decisions and assumptions (resolves gate D1)

| Decision | Selected | Rationale |
|---|---|---|
| Next.js version | 15.x latest stable | Current stable; App Router is default |
| Package manager | npm | Ships with Node; no extra tooling |
| Node version | 20 LTS | Current LTS; aligns with Vercel runtime defaults |
| Test runner | Vitest | Listed first in `plan.md §6`; native ESM; faster for App Router projects |
| Formatting | Prettier | Listed in `plan.md §6` |
| TypeScript | `strict: true` | Required by CLAUDE.md |
| `src/` layout | Yes | Consistent with CLAUDE.md structure diagram |
| CSS framework | None for this story | Styling decisions belong to P1-S2 |
| Next.js telemetry | Disabled | No call-home behavior in a controlled deployment |

## Executable tasks

1. Run `npx create-next-app@latest` with flags: `--typescript`, `--eslint`, `--app`, `--src-dir`,
   `--no-tailwind`, `--no-import-alias`. Resolve any remaining interactive prompts non-interactively.
2. Disable Next.js telemetry in `next.config.ts` (or equivalent).
3. Verify `tsconfig.json` has `"strict": true`.
4. Remove all Next.js sample files: boilerplate CSS variables, SVG assets, and example text in
   `src/app/page.tsx`. Replace with a single-line placeholder.
5. Install `vitest` and `@vitejs/plugin-react` as dev dependencies. Create `vitest.config.ts` with
   React plugin. Add `"test": "vitest run"` to `package.json` scripts.
6. Add `"typecheck": "tsc --noEmit"` to `package.json` scripts.
7. Add Prettier: install `prettier` and `eslint-config-prettier` as dev dependencies; add `prettier`
   last in ESLint extends; add `.prettierrc` with project defaults.
8. Add `.nvmrc` containing `20` (or add `"engines": { "node": ">=20" }` to `package.json`).
9. Write one smoke test at `src/__tests__/smoke.test.ts`: `expect(true).toBe(true)`.
10. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and confirm all pass.
    Record actual output in the delivery report.
11. Confirm `.env.example` still contains only empty variable names. Confirm `git status` shows
    no `.env*` tracked files.

## Acceptance criteria

- `package.json` exists with `lint`, `typecheck`, `test`, and `build` scripts defined.
- `npm run lint` exits 0.
- `npm run typecheck` exits 0.
- `npm test` exits 0 with at least one passing test.
- `npm run build` exits 0 and produces `.next/`.
- `src/app/page.tsx` exists and contains no Next.js boilerplate sample content.
- `vitest.config.ts` exists and references `@vitejs/plugin-react`.
- `tsconfig.json` contains `"strict": true`.
- Node 20 is pinned in `.nvmrc` or `package.json` `engines`.
- `.env.example` contains only names with empty values; no `.env*` file is tracked.
- No sample SVGs, boilerplate CSS variables, or `create-next-app` example text remain.

## Tests

- `src/__tests__/smoke.test.ts`: one assertion confirming the test runner executes.
- No snapshots. No application mocks (nothing meaningful to mock yet).

## Verification commands

These scripts are created by this story and do not exist before it completes:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Risks and pending decisions

| Risk | Mitigation |
|---|---|
| `create-next-app` interactive prompts vary by version | Use explicit CLI flags; document any remaining prompts in delivery report |
| Vitest + Next.js App Router server-component imports | Use `environment: 'jsdom'` in `vitest.config.ts`; test only non-server modules in smoke test |
| ESLint / Prettier version conflicts | Add `eslint-config-prettier` as the last entry in ESLint extends |
| `claude doctor` unavailable | Document limitation; not a blocker for this story |
| Next.js 15 changes to `next.config` shape | Use the output of `create-next-app` as baseline; do not copy a stale config template |

No D2, D3, D4, D5, or D6 decisions are needed for this story.
