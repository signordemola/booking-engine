# Progress

Newest first. Updated at the end of every session.

## 2026-11-17 (stage 6)

- Milestone: roadmap stage 6 - Policies - done. Stage 7 - Follow-ups - next, after a reading break of 2 to 3 days.
- Done:
  - Policies are settings: non-refundable or a notice period; what a late cancel and a no-show keep (what was paid, a percentage of the total, or a fixed amount); a reschedule notice and a limit on moves. Each booking keeps a copy of its policy and a move count.
  - `decideCancellation` gives what is kept, refunded and still to charge, with the tax inside the kept amount (the Canada Revenue Agency rule for a kept deposit). `decideReschedule` moves a confirmed booking with the same slot check as a new booking, so the patch test rule still applies.
  - The store cancels and moves bookings. Two clients who move into the same free time at the same moment: exactly one gets it. "Non-refundable. Moves once." runs as scenarios: US$30 kept, first move accepted, second move refused.
- Tests: 370 passing, 0 failing (294 in the engine, 26 in the store, 50 for the scenario files; 49 real cases). Ten planted bugs, all caught after one new test.
- Learned (interview topics practised):
  - A copy beats a link: a booking keeps the policy it was made with, so a later settings change cannot change what a client agreed to.
  - A boundary needs two tests: a cancel exactly 336 hours before is in time, one minute later is late.
  - A move must be checked where it is saved, like a new booking: two moves into the same time both read "free" first.
- Next step: read the code (plan below), then start stage 7, follow-ups.
- Reading plan for the break:
  - Day 1: `docs/architecture.md`, `docs/roadmap.md`, then `docs/how-the-code-works.md` up to Time. Open each file it names.
  - Day 2: Rules, Slots, Bookings and Policies in the reading guide, with their tests (`*.test.ts` next to each file). Run `pnpm run test` and break one line on purpose to see a test fail.
  - Day 3: `packages/store`, `scenarios/` (open five JSON files), and the decision records 0011 to 0016. Write down every question.
- Blockers / questions: none. Not built: a policy for each service, a fee for a move, a move to another staff member, a copy of the tax rates on the booking.

## 2026-11-17

- Milestone: roadmap stage 5 - Rules - done. Stage 6 - Policies - next. (The plan is `docs/roadmap.md`: stages 1 to 8.)
- Done since the last entry:
  - New direction: a booking engine for booking platforms, with the owner's rules as settings. Milestones revised; each one proves a real scenario as tests (first: US$120 service + US$10 add-on, deposit US$30, balance US$100).
  - Phase 1, money: `percentageOf`, exact and rounded half-up, with the big.js library. Phase 2, settings: `parseSettings` checks the owner's settings (services, add-ons, deposit rules) and returns plain errors.
  - Phase 3, quote totals: `createQuote` turns the client's picked services and add-ons into line items and a total (US$120 + US$10 = US$130), and rejects a request the owner's settings do not allow.
  - Wrote the architecture and the roadmap: one pure core, with thin products on top (client builds, tools for AI agents, a simulator, a benchmark), and real cases stored as data files.
  - Stage 5, rules: five rule kinds in the settings (prerequisite, consent, book-alone, fill-window, new-client-deposit), checked against facts about the client. After a patch test, the slot list offers only times at least 48 hours later; ombre brows cannot be booked before the consultation and the signed consent form; a late fill is refused and the answer names the full set; a new client pays a higher deposit; a senior stylist has her own price. Every promise on the lash, salon and studio hire pages of demolastudio.com runs as a scenario.
  - Slot holds: a time a client picks is held for the minutes the owner sets; it is released the moment the hold runs out, with no clean-up job; the client who holds a time still sees it on the calendar.
  - Stage 4, bookings: `decideBooking` returns the record to save, its quote and the events; a booking with money due is held and is confirmed when the deposit is paid; `applyBookingAction` moves a booking between six statuses. A new package, `packages/store`, saves safely: 20 requests for the same time at the same moment give exactly 1 booking, a retry makes no second booking, and two businesses never see each other's data.
  - Stage 3, time: `listSlots` gives the free start times on a date and `checkSlot` says why a time is not free. They apply the time zone, opening hours per resource, lunch breaks, closures, the length of the booking with its add-ons, gaps, notice, the booking window and busy times. With two stylists, each start time lists who is free. Tested on the days the clocks change in Toronto and London, and with 10,000 busy times (26 ms).
  - Stage 2, money: the quote now gives the deposit (none, percentage, fixed or full; the service rule wins over the business rule), fees due today or later, prices by the hour, tax added on top or included in the price, the amount due today and the balance, with the reason for each rule. Four demo businesses and 8 real cases run as scenario files.
  - Stage 1, contracts: each public function takes one input object; every error has a stable code; one list of operations; a public API with a test that guards it; real cases as JSON files in `scenarios/` that run as tests; the linter enforces the import order.
  - Rewrote the first two phases in regular modern TypeScript after a comparison with Cal.com, Medusa, Zod and tRPC. Moved to Node 26 and the built-in `Temporal`. Added Dependabot and a rule that `main` only changes through a pull request with green checks.
- Tests: 331 passing, 0 failing (268 in the engine, 22 in the store, 41 for the scenario files; 40 real cases). CI is green on Node 26.
- Learned (interview topics practised):
  - Types are removed before the code runs, so Zod checks outside data at runtime; `z.infer` makes the type from the same schema.
  - A discriminated union: the deposit rule has a `kind` field, and TypeScript narrows on it.
  - Decimal numbers are wrong for money: `Math.round(amount * percent / 100)` was wrong by one cent in 50 of 2.6 million test cases.
  - A clock time and an exact moment are different things: 10:00 in Toronto is 15:00 UTC in winter and 14:00 UTC in summer. Binary search finds an overlap in a sorted list in about 14 steps for 10,000 items.
  - An interface is a contract with no code; a class `implements` it. A check in code is not enough under load: 20 requests all read "free" before one saves, so the rule must sit where the save happens. `Promise.allSettled` waits for every request and keeps each outcome.
- Next step: stage 6, policies: cancellation, refund and reschedule ("Non-refundable. Moves once.").
- Blockers / questions: none

Scale features (designed or built): settings carry a `version` and a `businessId`; pure operations with JSON in and out; scenario files; one-way imports (all built). The store contract, an in-memory store, retry by booking id and the no-overlap rule at save time are built. The Postgres store is designed only.

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
