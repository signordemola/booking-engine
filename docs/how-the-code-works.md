# How the code works

A reading guide. Read the files in this order. Each one has one job.

## 1. `packages/core/src/money/money.ts`

One job: exact arithmetic on money, rounded the same way every time.

- Money is a whole number of minor units (cents, pence). US$120 is `12000`.
- `percentageOf(12000, 25)` returns `3000`. That is 25% of US$120: US$30.
- `includedTaxOf(27000, 20, 20)` returns `4500`. A price of £270 that already includes 20% VAT holds £45 of VAT.
- Both round half-up. Half a cent or more goes up.

Read each function from left to right: take the amount, multiply, divide, round to a whole number, and give back a normal number. The `big.js` library does the arithmetic, because normal JavaScript decimals are sometimes wrong by one cent.

## 2. `packages/core/src/settings/settings-schema.ts`

One job: describe the shape of the owner's settings.

- It is a list of small descriptions, built from the bottom up: an id, a name, an amount, then a price, a deposit rule, a service, an add-on, a fee, the tax, and at the end the whole settings document.
- Each description also holds the message an owner sees when a value is wrong.
- The time part: the time zone, the schedule (step, notice, booking window, gaps), the resources with their opening hours for each weekday, and the closures.
- Where a setting has several forms, a `kind` field says which one:
  - a price is `fixed` or `hourly`;
  - a deposit rule is `none`, `percentage`, `fixed` or `full`;
  - the tax is `none`, `added` or `included`.
- The last lines make the TypeScript types from the same descriptions, so the check and the types cannot disagree.

## 3. `packages/core/src/settings/check-settings.ts`

One job: find mistakes that need more than one field to see.

- `findRepeatedIds`: two services, add-ons, fees or tax rates with the same id.
- `findMissingAddOns`: a service lists an add-on that does not exist.
- `findWrongHourRanges`: an hourly service whose minimum hours are above its maximum.
- `findFixedDepositsAbovePrice`: a fixed deposit that is more than the lowest price of the service.
- `findWrongOpenWindows`: opening hours that end before they start, or that overlap.
- `findMissingServices`: a resource lists a service that does not exist.
- `findWrongClosures`: a closure that ends before it starts.
- `findSettingsProblems` runs them all and joins their results into one list.

Each function goes through a list with `forEach` and adds a problem when it finds a mistake.

## 4. `packages/core/src/settings/parse-settings.ts`

One job: the public function, `parseSettings`.

- `settingsSchema` is the shape from file 2 plus the rules from file 3. `superRefine` is the Zod way to add rules that compare more than one field.
- `parseSettings` runs that schema on the input. If it passes, it returns `{ ok: true, value }`. If not, it returns `{ ok: false, errors }`.

## 5. `packages/core/src/lib/`

Two small files that the settings code and the quote code share.

- `result.ts`: the shape every public function returns. It is `{ ok: true, value }` or `{ ok: false, errors }`. Each error is a `Problem`: a stable code such as `quote.unknown-service`, a path, and a plain message.
- `zod-problems.ts`: `toProblems` turns the problems Zod reports into that plain shape. For example, the location `["request", "services", 0, "serviceId"]` becomes the text `request.services[0].serviceId`.

## 6. `packages/core/src/quotes/quote-request-schema.ts`

One job: describe the shape of a quote request. A request is what the client picked: a list of services, each with its add-ons and, for an hourly service, the number of hours. It can also list fees, such as a home visit.

## 7. `packages/core/src/quotes/find-requested-items.ts`

One job: look up what the client picked in the owner's settings. It has one small function for each kind of thing.

- `findPrice`: the price of a service. A fixed price takes no hours. An hourly price needs hours inside the owner's range, and costs the hourly price times the hours.
- `findAddOns`: each add-on must be offered by the service, listed once, and not above the owner's maximum.
- `findFees`: each fee must exist and be listed once.
- `findRequestedItems` runs them for every picked service and returns the real items, or the list of problems.

## 8. The quote, in four small files

`calculate-deposit.ts`. One job: the deposit of one service.

- The service's own rule wins. Without one, the business rule applies.
- `none` is 0. `percentage` is that share of the service price. `fixed` is the set amount. `full` is the service and its add-ons.

`calculate-tax.ts`. One job: the tax of the whole quote, and today's share of it.

- With tax `added`, each rate is a percentage of the subtotal. With tax `included`, the tax is already inside the prices, and the function works out how much.
- With the timing `with-each-payment`, today's payment carries its share. With `with-balance`, today's share is 0.

`quote-line-items.ts`. One job: the shapes of the three kinds of line (service, add-on, fee), and a small function that builds each one.

`create-quote.ts`. One job: the public function, `createQuote({ settings, request })`. It runs these steps:

1. Check the shape of the whole input: the settings and the request together.
2. Look up the picked items in the settings (file 7).
3. Make the lines: one for each service with its deposit, one for each add-on, one for each fee. Add a reason for each deposit rule used.
4. Add up the subtotal, the deposits and the fees due today.
5. Calculate the tax, then the total, the amount due today and the balance.

The balance is the total minus the amount due today. So the two always add up to the total, to the cent.

Example: a hybrid full set (US$120, deposit 25%) with a lash bath (US$10) gives a total of `13000`, `3000` due today and a balance of `10000`.

## Time: `packages/core/src/time/time.ts`

One job: everything about dates, clock times and time zones. It is the only file that uses `Temporal`, the built-in date and time API. The linter stops any other file from using it.

- Inside the engine, an exact moment is a plain number: milliseconds since 1970. Plain numbers are easy to compare and to add minutes to.
- At the edge, a moment is text such as `2026-11-21T15:00:00Z`. `toEpochMs` and `toInstantText` convert between the two.
- `localTimeToEpochMs("2027-03-14", "10:00", "America/Toronto")` answers "which exact moment is 10:00 on the clock in Toronto on that date?". It returns `null` for a clock time that does not exist, such as 02:30 on the night the clocks go forward.
- `localDateOf` and `localTimeOf` go the other way: from an exact moment to the date and the clock time in a time zone.

## Rules: `packages/core/src/rules/`

The question: "does a rule of this business change this price, this time or this booking?".

`client-facts-schema.ts`. The shape of what the platform tells the engine about a client: past visits, prerequisites done or booked (a patch test, a consultation), and consent forms signed.

`apply-rules.ts`. One small function per rule kind. Each returns a list of findings; an empty list means the rule is satisfied.

- `findBookAloneFindings`: a service that must be booked alone is in a booking with another service.
- `findPrerequisiteFindings`: for a start time, is the prerequisite missing, too recent (inside the waiting hours) or out of date (past its valid days)?
- `findFillWindowFindings`: is the last full set or fill more than the window before this time?
- `findConsentFindings`: has the client signed the current version of the form?
- `findNewClientDeposit`: the deposit rule for a client with no visits, if the business has one.

Where each one is used:

| Rule kind          | Quote                    | Slot list and slot check | Booking decision |
| ------------------ | ------------------------ | ------------------------ | ---------------- |
| Book-alone         | Refuses                  | Refuses                  | Refuses          |
| Prerequisite       | -                        | Blocks times             | Blocks the time  |
| Fill window        | Refuses, at the time now | Blocks times             | Blocks the time  |
| Consent            | -                        | -                        | Refuses          |
| New-client deposit | Sets the deposit         | -                        | Sets the deposit |

A staff level is not a rule. It is a field on the resource, and a service can have a price for each level. The quote uses the level of the chosen resource.

## Slots: `packages/core/src/slots/`

The question: "which start times are free?". Read the files in this order.

`slot-input-schema.ts`. The shape of the input. Besides the settings and the request, slots need **facts**: the time now, and the busy times of each resource. The platform loads the busy times from its database and passes them in.

`busy-times.ts`. One job: answer "is this resource busy in this time range?" fast.

- `groupBusyTimes` sorts the busy times of each resource and joins the ones that overlap.
- `isBusy` uses a binary search: it halves the list again and again until it finds the first busy time that ends after the wanted start. A list of 10,000 needs about 14 steps.

`booking-shape.ts`. One job: the size of the booking.

- Its length: the minutes of each service (or the hours picked), plus the extra minutes of each add-on.
- Its gaps: the service's own gaps, or the business gaps.
- Who can do it: the resources that offer every picked service, or the one resource the client asked for.

`find-blockers.ts`. One job: the reasons a start time is not free, for one resource. No reasons means the time is free. It checks, in order: the date has passed, the date is too far ahead, the business is closed, the notice is too short, the time is outside the opening hours, the time is not on a step, and the time is busy.

`prepare-slot-context.ts`. Gathers what both public functions need: the picked items, the booking size and the grouped busy times.

`list-slots.ts`. The public function `listSlots({ settings, facts, request })`. For each resource and each opening window of the date, it steps from the opening time and keeps every start that has no blockers. Each start time lists who is free.

`check-slot.ts`. The public function `checkSlot({ settings, facts, request })`. It checks one start time and returns `available`, who is free, and the reasons when nobody is.

Both public functions call `findBlockers`, so a time that `listSlots` offers is always a time that `checkSlot` accepts.

## Bookings: `packages/core/src/bookings/`

The question: "may this booking go ahead, and what must be saved?". The engine decides. It never saves.

`booking-schema.ts`. The shape of a booking record: ids, a status, the start and end, the blocked time (the booking plus its gaps), when the hold runs out, and the amounts. It also lists the six statuses and the five actions. `occupiesSlot` says which statuses keep their time: all except `cancelled` and `expired`.

`decide-booking.ts`. The public function `decideBooking({ settings, facts, request })`. It runs these steps:

1. Check the input.
2. Find a resource that is free at the start time, with the same check the slot list uses. If nobody is free, return the reasons.
3. Price the booking with `createQuote`.
4. Build the record. With money due today, the status is `pending` and the hold runs out after the owner's hold minutes. With nothing due, the status is `confirmed`.
5. Return the record, the quote and one event (`booking.held` or `booking.confirmed`).

`apply-booking-action.ts`. The public function `applyBookingAction`. A table lists each action, the statuses it can start from, and the status it leads to. An action from a wrong status is refused. Three actions also check the time: a hold cannot end early, an appointment cannot be completed before it ends, and a no-show cannot be marked before the start.

## The store: `packages/store/`

Saving is a separate package, because the engine must stay pure.

`booking-store.ts`. An **interface**: the list of methods any store must have. It is the contract, with no code. A Postgres store can later implement the same interface.

`in-memory-booking-store.ts`. A class that implements the interface with a `Map` in memory. It is for tests and demos. It keeps the three promises:

- `saveNewBooking` refuses a booking whose blocked time overlaps another booking of the same resource and business.
- `saveNewBooking` returns the first booking when the same booking id comes again.
- `saveBookingChange` saves only if the stored status is still the one the caller read.

Each business has its own `Map`, so one business can never read another's bookings.

`expireHolds` marks every pending booking whose hold is over as `expired`. `findBusyTimes` can leave out one booking: the one the asking client holds.

`book-slot.ts`. The workflow `bookSlot`: look for an earlier booking with the same id, release the holds that ran out, read the busy times, ask the engine to decide, then save. If the store says the time was taken a moment ago, the client gets `booking.slot-taken`.

`find-free-slots.ts`. The workflow `findFreeSlots`: release the holds that ran out, read the busy times (without the client's own hold), then ask the engine for the slot list.

`change-booking.ts`. The workflow `changeBooking`: load the booking, ask the engine to apply the action, then save with the status it read.

Why the store must enforce the overlap rule: when 20 requests arrive together, all 20 read "free" before any of them saves. The engine says yes to all 20. Only the store, at the moment of saving, can let one through and refuse 19. `book-slot.test.ts` proves it.

## 9. `packages/core/src/operations.ts`

One job: the list of everything the engine can do. Each entry has a name such as `quote.create`, a one-line summary, the shape of its input, and the function to run.

`runOperation(name, input)` finds an entry by its name and runs it. A tool that only has JSON, such as a scenario file or an AI agent, calls the engine this way.

## 10. `packages/core/src/index.ts`

One job: the public API. Code outside the engine imports from here only. `index.test.ts` fails when the list of exports changes, so the public API never changes by accident.

## 11. `scenarios/`

Real cases as data files. This folder is its own small package, because it reads files from disk and the engine must not.

- `businesses/*.json`: the settings of four demo businesses: a lash studio (US$, no tax), a Montreal salon (two taxes added), a Toronto studio hire (by the hour) and a UK photographer (VAT included).
- `lash/`, `salon/`, `studio-hire/`, `photographer/`: one file per case. A case about time also has `facts`: the time now and the busy times. A case about a rule also has facts about the client. Each file names a business, an operation, a request, and the answer it expects. `source` links to where the case comes from.
- `scenario-schema.ts`: the shape of a scenario file.
- `load-scenarios.ts`: reads every file and attaches the settings of its business.
- `run-scenarios.test.ts`: one test that runs every scenario through `runOperation`. The expected answer only has to list the parts that matter; extra fields in the real answer are fine.

To add a case, add one JSON file. No code changes.

## Shared test data: `packages/core/src/testing/demo-businesses.ts`

The settings of the four demo businesses, for the tests. They hold the same data as `scenarios/businesses/*.json`.

## The tests

Each code file has a test file next to it, with the same name plus `.test.ts`. A test is a worked example: "for this input, I expect this answer". Read the tests to see what each function must do.
