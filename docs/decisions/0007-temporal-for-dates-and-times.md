# Temporal for all dates and times

The engine uses the built-in `Temporal` API, not `Date` and not a date library. `Temporal` has separate types for a clock time with no date (`PlainTime`), a calendar date (`PlainDate`) and an exact moment (`Instant`). Opening hours are clock times, bookings are exact moments, and the compiler stops us from mixing them. It also handles time zones and daylight saving changes with no extra package.

We rejected `date-fns` with `@date-fns/tz`: it works on older Node versions, but every value is a `Date`, so a mix-up between a clock time and an exact moment shows only at runtime.

The cost is that the engine needs Node 26 or later. `tsconfig.base.json` lists `esnext.temporal` in `lib` for the types. `lib` has no `dom`, so the core cannot use browser globals by mistake; `skipLibCheck` is on because the test runner's own type files expect `dom`.
