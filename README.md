# booking-engine

Open-source TypeScript booking engine: availability, slots, no double bookings, deposits and time zones.

It is a booking engine for booking platforms: one source of truth for availability, price, add-ons, deposits, tax and booking rules. The owner's rules are settings, so an admin screen can change them and no developer changes code. The platform brings its own database, payment provider, messages and screens.

## Status

This project is at the start. **You cannot take a booking with it yet.** The money side and the time side work and are tested: it can price a booking and list the free times. It cannot yet decide or record a booking.

| Stage                                                             | Status      |
| ----------------------------------------------------------------- | ----------- |
| Repo setup (TypeScript, tests, lint, CI)                          | Done        |
| Contracts: scenario files, operation shape, public API            | Done        |
| Money: add-ons, deposit, tax, fees, balance                       | Done        |
| Time: hours, breaks, closures, gaps, lead time, clock changes     | Done        |
| Bookings: no overlap, hold during payment, safe retries           | Next        |
| Rules: patch test, consultation, consent, fill or full set, staff | Not started |
| Policies: cancellation, refund, reschedule                        | Not started |
| Follow-ups: reminders, balance links, hold expiry                 | Not started |
| First products: tools for AI agents, scenario pages               | Not started |

[docs/architecture.md](./docs/architecture.md) explains the design: one core, many products. [docs/roadmap.md](./docs/roadmap.md) has each stage in detail.

What works today:

- `parseSettings` checks a business's settings (services, add-ons, deposit rules) and returns plain errors an owner can read.
- `createQuote` prices what a client picked: line items, tax, the amount due today and the balance, with the rule behind each deposit. It handles add-ons, fees, prices by the hour, four kinds of deposit, and tax that is added on top or included in the price.
- `listSlots` lists the free start times on a date, for one or more staff or rooms. It applies opening hours, lunch breaks, closures, the length of the booking, gaps between bookings, the notice a booking needs and the busy times. `checkSlot` says if one time is free, and why not.
- Time zones are handled with the built-in `Temporal` API, with tests for the days when the clocks change in Toronto and in London.
- Real cases live as JSON files in [`scenarios/`](./scenarios) and run as tests. To add a case, add one file.

[PROGRESS.md](./PROGRESS.md) has the session log. [docs/how-the-code-works.md](./docs/how-the-code-works.md) is a reading guide to the code.

## Design rules

- **Pure core.** The engine does not call a database, a payment provider or the system clock directly. It uses interfaces, so each one can be replaced.
- **Many businesses in one deployment.** Every record belongs to a business.
- **Money as integers.** Amounts are whole numbers of minor units (cents, pence), with one currency per business.
- **Time in UTC.** Each business has its own time zone.

## Development

You need Node 26 or later and pnpm 12.

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test
```

CI runs the same four checks on every push, on Node 26.

## Layout

```
packages/core                 the engine
scenarios                     real cases as data files, run as tests
docs/architecture.md          the design: one core, many products
docs/roadmap.md               the stages and what each one proves
docs/how-the-code-works.md    a reading guide to the code
docs/decisions                short records of the big choices and why
```

## How this is built

I write this project with help from AI tools (Claude). I review and run every change, and I write the commits.

## Licence

[MIT](./LICENSE)
