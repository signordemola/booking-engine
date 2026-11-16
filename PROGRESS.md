# Progress

Newest first. Updated at the end of every session.

## 2026-11-17

- Milestone: 2 - Business settings and Quote - in progress (3 phases done). The plan is now `docs/roadmap.md`: stages 1 to 8.
- Done since the last entry:
  - New direction: a booking engine for booking platforms, with the owner's rules as settings. Milestones revised; each one proves a real scenario as tests (first: US$120 service + US$10 add-on, deposit US$30, balance US$100).
  - Phase 1, money: `percentageOf`, exact and rounded half-up, with the big.js library. Phase 2, settings: `parseSettings` checks the owner's settings (services, add-ons, deposit rules) and returns plain errors.
  - Phase 3, quote totals: `createQuote` turns the client's picked services and add-ons into line items and a total (US$120 + US$10 = US$130), and rejects a request the owner's settings do not allow.
  - Wrote the architecture and the roadmap: one pure core, with thin products on top (client builds, tools for AI agents, a simulator, a benchmark), and real cases stored as data files.
  - Rewrote the first two phases in regular modern TypeScript after a comparison with Cal.com, Medusa, Zod and tRPC. Moved to Node 26 and the built-in `Temporal`. Added Dependabot and a rule that `main` only changes through a pull request with green checks.
- Tests: 48 passing, 0 failing. CI is green on Node 26.
- Learned (interview topics practised):
  - Types are removed before the code runs, so Zod checks outside data at runtime; `z.infer` makes the type from the same schema.
  - A discriminated union: the deposit rule has a `kind` field, and TypeScript narrows on it.
  - Decimal numbers are wrong for money: `Math.round(amount * percent / 100)` was wrong by one cent in 50 of 2.6 million test cases.
- Next step: stage 1 of the new roadmap, contracts (scenario files, operation shape, public API). See `docs/roadmap.md`.
- Blockers / questions: none

Scale features (designed or built): settings carry a `version` and a `businessId` (built). Everything else is designed only.

## 2026-11-16

- Milestone: 1 - Repo set up - done
- Done today:
  - Connected the local folder to GitHub. Added a pnpm workspace with one package, `packages/core`.
  - Added strict TypeScript 7.0.2, Vitest 5.1.0, oxlint 1.93.0 (type-aware) and Prettier 3.10.1, all pinned.
  - Added a GitHub Actions workflow (format check, lint, type check, tests on Node 24 and 26), six decision records in `docs/decisions/` and an honest README.
- Tests: 1 passing (a smoke test that proves the runner works; it has no engine logic). CI is green on Node 24 and Node 26.
- Learned (interview topics practised):
  - Compile time and runtime: `tsc` checks types and then removes them; a test runner does not check types.
  - `strict` is a group of flags; `noUncheckedIndexedAccess` makes `list[0]` possibly `undefined`.
  - A floating promise (no `await`) loses errors; the compiler accepts it, the linter catches it.
  - A lockfile makes CI and my computer install the same versions; CI actions are pinned by commit SHA because a tag can move.
- Next step: start Milestone 2 (services and availability rules, then slot listing), tests first.
- Blockers / questions: decide on Dependabot and on a branch ruleset that requires green CI before a merge.
