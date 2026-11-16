# Progress

Newest first. Updated at the end of every session.

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

Scale features (designed or built): none yet. Milestone 1 is tooling only.
