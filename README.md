# booking-engine

Open-source TypeScript booking engine: availability, slots, no double bookings, deposits and time zones.

It is a booking engine for booking platforms: one source of truth for availability, price, add-ons, deposits, tax and booking rules. The owner's rules are settings, so an admin screen can change them and no developer changes code. The platform brings its own database, payment provider, messages and screens.

## Status

This project is at the start. **You cannot take a booking with it yet.** Two small parts work and are tested.

| Part                                                               | Status      |
| ------------------------------------------------------------------ | ----------- |
| Repo setup (TypeScript, tests, lint, CI)                           | Done        |
| Business settings and quote: add-ons, deposit, tax, balance        | In progress |
| Slots: hours, breaks, closures, gaps, lead time                    | Not started |
| Bookings: no overlap, hold during payment, safe retries            | Not started |
| Service rules: patch test, consultation, consent, fill or full set | Not started |
| Policies: cancellation, refund, reschedule                         | Not started |
| Automations: reminders, balance links, hold expiry                 | Not started |
| Staff and levels, time zones and daylight saving                   | Not started |
| Example apps                                                       | Not started |

What works today:

- `parseSettings` checks a business's settings (services, add-ons, deposit rules) and returns plain errors an owner can read.
- `percentageOf` takes a percentage of an amount, exact and rounded half-up.

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
docs/decisions                short records of the big choices and why
docs/how-the-code-works.md    a reading guide to the code
```

## How this is built

I write this project with help from AI tools (Claude). I review and run every change, and I write the commits.

## Licence

[MIT](./LICENSE)
