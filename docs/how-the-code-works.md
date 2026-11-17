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

## 9. `packages/core/src/operations.ts`

One job: the list of everything the engine can do. Each entry has a name such as `quote.create`, a one-line summary, the shape of its input, and the function to run.

`runOperation(name, input)` finds an entry by its name and runs it. A tool that only has JSON, such as a scenario file or an AI agent, calls the engine this way.

## 10. `packages/core/src/index.ts`

One job: the public API. Code outside the engine imports from here only. `index.test.ts` fails when the list of exports changes, so the public API never changes by accident.

## 11. `scenarios/`

Real cases as data files. This folder is its own small package, because it reads files from disk and the engine must not.

- `businesses/*.json`: the settings of four demo businesses: a lash studio (US$, no tax), a Montreal salon (two taxes added), a Toronto studio hire (by the hour) and a UK photographer (VAT included).
- `lash/`, `salon/`, `studio-hire/`, `photographer/`: one file per case. Each file names a business, an operation, a request, and the answer it expects. `source` links to where the case comes from.
- `scenario-schema.ts`: the shape of a scenario file.
- `load-scenarios.ts`: reads every file and attaches the settings of its business.
- `run-scenarios.test.ts`: one test that runs every scenario through `runOperation`. The expected answer only has to list the parts that matter; extra fields in the real answer are fine.

To add a case, add one JSON file. No code changes.

## The tests

Each code file has a test file next to it, with the same name plus `.test.ts`. A test is a worked example: "for this input, I expect this answer". Read the tests to see what each function must do.
