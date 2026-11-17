# Roadmap

The plan for building the engine in [architecture.md](./architecture.md). It is a sequence, not a calendar: no stage has a date.

## The order, and why

1. **Contracts first.** They are hard to change later, and every stage after them is built on them.
2. **Then the core, one area at a time.** Each stage ends when a real case runs as a scenario file.
3. **Then thin products**, in the order that helps most: first the ones that cost little and show the engine to people.

## Stages

| Stage | Name           | Real case that proves it                                                          | Status      |
| ----- | -------------- | --------------------------------------------------------------------------------- | ----------- |
| 0     | Repo setup     | Checks run on every push                                                          | Done        |
| 1     | Contracts      | The homepage quote (US$130) runs from a scenario file                             | Done        |
| 2     | Money          | US$130 total, US$30 due today, US$100 balance; tax in Canada and the UK           | Done        |
| 3     | Time           | Studio hire, Saturday 10:00 to 14:00, with a gap between hires                    | Done        |
| 4     | Bookings       | A date is held only when the retainer is paid; 20 requests at once make 1 booking | Done        |
| 5     | Rules          | Only times at least 48 hours after the patch test                                 | Done        |
| 6     | Policies       | "Non-refundable. Moves once."                                                     | Done        |
| 7     | Follow-ups     | A reminder is due the day before; a job that runs twice sends once                | Next        |
| 8     | First products | An AI assistant books a lash appointment and obeys the patch test rule            | Not started |

Already built before this plan: exact percentages, the settings check, and quote totals.

### Stage 1: Contracts

- Scenario files: the format, the first demo business (a lash studio), and one test that runs every file. The other three demo businesses arrive with their first case.
- The operation shape: each public function takes one input object, with the settings and the request. Facts join it in the stage that first needs them.
- Every error has a stable code, a path and a plain message.
- One list of operations, and a way to run one by its name.
- The public API: one entry file, and a test that fails when the list of exports changes by accident.
- The import order between modules, enforced by the linter.

Done: the homepage quote runs from `scenarios/lash/full-set-with-lash-bath.json`.

### Stage 2: Money

- Deposit: none, percentage, fixed or full. The service rule wins over the business default. The answer names the rule it used.
- Tax: added on top or included in the price; paid with each payment or with the balance. Several taxes show separately. Rounding happens once.
- Fees, such as travel, due today or later.
- Prices by the hour, with minimum and maximum hours.

Done: these run as scenarios. The homepage example; a Montreal salon with two taxes; a UK photographer with VAT in the price and a travel fee; a Toronto studio hired by the hour with a backdrop.

### Stage 3: Time

- One time module. It is the only code that touches `Temporal`, and the linter enforces that.
- Settings: the time zone, opening hours per weekday for each resource, closures, the step between start times, the notice a booking needs, how far ahead a client can book, and the gaps before and after a booking.
- A lunch break is the space between two opening windows.
- Free start times: the length comes from the services and add-ons; gaps, notice, the booking window, closures and busy times all apply.
- "Why not this time?": `slots.check` gives the reasons a time is not free.
- Resources (a staff member or a room) from the start. With several, each start time lists who is free.
- Days when the clocks change, in London and in Toronto.
- A speed test with 10,000 busy times.

Done: the studio hire case, both clock-change days and the two-stylist cases run as scenarios, and the speed test passes.

### Stage 4: Bookings

- `decideBooking`: the engine checks the time, prices the booking and returns the record to save, its quote and the events.
- A hold while the client pays, for the minutes the owner sets. The booking is confirmed when the deposit is paid. A booking with nothing to pay today is confirmed at once.
- `applyBookingAction`: deposit paid, hold run out, cancel, complete, no-show. Each move is checked against a table.
- A new package, `packages/store`: the three promises a store must keep, an in-memory store, and two workflows (`bookSlot`, `changeBooking`) that read, decide and save.
- A repeated request with the same booking id returns the first booking.
- Two businesses in one store never see each other's bookings.

Done: the photographer case runs as scenarios, and 20 requests at the same moment give exactly one booking.

Not built here: money rules for a cancellation (built in stage 6), and the Postgres store (after stage 8, when a client build needs it).

### Stage 5: Rules

- Five rule kinds in the settings: `prerequisite`, `consent`, `book-alone`, `fill-window` and `new-client-deposit`.
- Facts about the client: past visits, prerequisites done or booked, and consents signed.
- Patch test before a service, with a waiting time in hours and a validity in days. The slot list only offers times that satisfy it.
- Consultation before a service: the same rule kind, with no waiting time.
- Consent form signed before the booking, by form version. The client can see times first.
- A service that must be booked alone.
- Fill or full set: a fill past its window is refused, and the answer names the full set.
- A deposit rule for new clients.
- Staff levels, with a price for each level.

Done: each promise on the lash, salon and studio hire pages of demolastudio.com runs as a scenario.

Not built here: the photographer promises that are not rules of this kind (a newborn date held on the due date, a reschedule for weather). The reschedule limit is stage 6.

### Stage 6: Policies

- Cancellation: a notice period, and how much of the deposit is kept.
- Refund amounts, with the tax inside a kept deposit.
- Reschedule: a notice period and a limit on moves.
- Each booking keeps a copy of the policy it was made with.
- The store moves a booking with the same no-overlap promise as a new booking.

Done: "Non-refundable. Moves once." runs as scenarios: the US$30 deposit is kept, the first move is accepted and a second move is refused. A late photo cancel, a late salon cancel with two taxes and a late studio hire cancel run too.

Not built here: a policy for each service, a fee for a move, a move to another staff member, and a copy of the tax rates on the booking.

### Stage 7: Follow-ups

- What is due and when: the reminder the day before, the balance link, the top-up reminder, the end of a hold.
- Each follow-up has a key, so it is done once.

Done when: a scenario runs the same job twice and gets each message once.

### Stage 8: First products

1. A guide for AI coding tools, and JSON Schema files for the settings and for every operation. They are generated from the operations list, so they cannot go out of date.
2. An AI agent tool server (MCP) over the operations, with a short demo.
3. A page of scenarios in the docs, generated from the scenario files.

After that, the next product depends on the next real opportunity:

| If the next opportunity is        | Build next                                    |
| --------------------------------- | --------------------------------------------- |
| A client build on the engine      | The Postgres store                            |
| Leads from demolastudio.com       | The policy simulator                          |
| A job in AI evaluation            | The scenarios as a benchmark, with a write-up |
| Other developers using the engine | A release on npm and two example apps         |

## How each stage is built

1. Research first: competitor help pages, official rules, and how open-source projects write that kind of code.
2. Scenarios and tests first, then code.
3. One pull request per stage, with one small commit per step. All four checks green. `PROGRESS.md` updated in the same pull request.
4. The reading guide gets a section for each new module.
5. A stage starts only after the pull request of the stage before it is merged.

## Practice

Practice starts when the foundation is set, after stage 7. Each challenge is a real case from a competitor's help page. The work is to write the owner's settings, work the answer by hand, write the scenario file, and extend the engine if it cannot do the case yet. Every finished challenge stays in the repo as a scenario.

| Stage      | Interview topics it covers                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Contracts  | Generic types, JSON at the edge and types inside, compile time and runtime                                   |
| Money      | Discriminated unions, exact arithmetic, rounding                                                             |
| Time       | Time zones, daylight saving, overlapping ranges, binary search                                               |
| Bookings   | `implements` and `extends`, `this` and `bind`, `Promise.all` and `Promise.allSettled`, retries, transactions |
| Rules      | Plug-in design, open and closed sets of types                                                                |
| Policies   | State machines, edge cases at a boundary                                                                     |
| Follow-ups | Jobs that are safe to run twice                                                                              |
| Products   | Tools for AI agents, versioned public APIs                                                                   |

## Not planned yet

A hosted API, a kit for agencies, a paid audit service, packages and memberships, waitlists, recurring bookings, calendar sync. Each needs a real customer or a second real case first.

## Risks

| Risk                                        | What we do about it                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| Too many paths at once                      | One core. A product starts only when the stage list reaches it.        |
| Structure added before it is needed         | Each contract is as small as it can be. Stage 1 is three small steps.  |
| The code grows faster than my understanding | Practice after each stage, the reading guide, and regular code style.  |
| A contract turns out wrong                  | Versions stay below 1.0 until a real client build has used the engine. |
| Limited time and power cuts                 | Every pull request leaves `main` working.                              |
