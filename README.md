# booking-engine

Open-source TypeScript booking engine: availability, slots, no double bookings, deposits and time zones.

It is the core logic a booking app needs, with no UI framework and no database inside. You connect your own database, payment provider and email service through small interfaces.

## Status

This project is at the start. **The engine does not work yet.**

| Part                                     | Status      |
| ---------------------------------------- | ----------- |
| Repo setup (TypeScript, tests, lint, CI) | Done        |
| Services, availability rules, slot list  | Not started |
| Bookings with no overlaps                | Not started |
| Deposits, balances, cancellation policy  | Not started |
| Time zones and daylight saving           | Not started |
| Multiple staff and rooms                 | Not started |
| Example apps                             | Not started |

[PROGRESS.md](./PROGRESS.md) has the session log.

## Design rules

- **Pure core.** The engine does not call a database, a payment provider or the system clock directly. It uses interfaces, so each one can be replaced.
- **Many businesses in one deployment.** Every record belongs to a business.
- **Money as integers.** Amounts are in minor units (cents, kobo) with a currency code.
- **Time in UTC.** Each business has its own time zone.

## Development

You need Node 24 or later and pnpm 12.

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test
```

CI runs the same four checks on every push, on Node 24 and Node 26.

## Layout

```
packages/core     the engine
docs/decisions    short records of the big choices and why
```

## How this is built

I write this project with help from AI tools (Claude). I review and run every change, and I write the commits.

## Licence

[MIT](./LICENSE)
