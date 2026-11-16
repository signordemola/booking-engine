# How the code works

A reading guide. Read the files in this order. Each one has one job.

## 1. `packages/core/src/money/money.ts`

One job: take a percentage of an amount of money, and round the same way every time.

- Money is a whole number of minor units (cents, pence). US$120 is `12000`.
- `percentageOf(12000, 25)` returns `3000`. That is 25% of US$120: US$30.
- The result is rounded half-up. Half a cent or more goes up. `percentageOf(1050, 25)` is 262.5 cents, so it returns `263`.

Read the one line from left to right: take the amount, multiply by the percent, divide by 100, round to a whole number (half-up), and give back a normal number. The `big.js` library does the arithmetic, because normal JavaScript decimals are sometimes wrong by one cent.

## 2. `packages/core/src/settings/settings-schema.ts`

One job: describe the shape of the owner's settings.

- It is a list of small descriptions, built from the bottom up: an id, a name, an amount, then a deposit rule, a service, an add-on, and at the end the whole settings document.
- Each description also holds the message an owner sees when a value is wrong.
- A deposit rule is one of four kinds: `none`, `percentage`, `fixed` or `full`. The `kind` field says which one.
- The last four lines make the TypeScript types from the same descriptions, so the check and the types cannot disagree.

## 3. `packages/core/src/settings/check-settings.ts`

One job: find mistakes that need more than one field to see.

- `findRepeatedIds`: two services, or two add-ons, with the same id.
- `findMissingAddOns`: a service lists an add-on that does not exist.
- `findFixedDepositsAbovePrice`: a fixed deposit that is more than the price of the service.
- `findSettingsProblems` runs all three and joins their results into one list.

Each function goes through a list with `forEach` and adds a problem when it finds a mistake.

## 4. `packages/core/src/settings/parse-settings.ts`

One job: the public function, `parseSettings`.

- `settingsSchema` is the shape from file 2 plus the rules from file 3. `superRefine` is the Zod way to add rules that compare more than one field.
- `parseSettings` runs that schema on the input. If it passes, it returns `{ ok: true, value }`. If not, it returns `{ ok: false, errors }`.

## 5. `packages/core/src/lib/`

Two small files that the settings code and the quote code share.

- `result.ts`: the shape every public function returns. It is `{ ok: true, value }` or `{ ok: false, errors }`. Each error is a `Problem`: a path and a plain message.
- `zod-problems.ts`: `toProblems` turns the problems Zod reports into that plain shape. For example, the location `["services", 0, "priceMinor"]` becomes the text `services[0].priceMinor`.

## 6. `packages/core/src/quotes/quote-request-schema.ts`

One job: describe the shape of a quote request. A request is what the client picked: a list of services, and for each service a list of add-ons with a quantity.

## 7. `packages/core/src/quotes/find-requested-items.ts`

One job: look up what the client picked in the owner's settings.

- For each requested service, it finds the service in the settings. If it does not exist, it adds a problem.
- For each requested add-on, it checks three things: the service offers it, it is listed once, and the quantity is not above the owner's maximum.
- It returns the real services and add-ons, or the list of problems.

## 8. `packages/core/src/quotes/create-quote.ts`

One job: the public function, `createQuote(settings, request)`. It runs three steps.

1. Check the shape of the request (file 6).
2. Look up the picked items in the settings (file 7).
3. Make one line item for each service and each add-on, then add the amounts to get the total.

An add-on line costs its price times its quantity. Example: a hybrid full set (US$120) with a lash bath (US$10) gives two line items and a total of `13000`, which is US$130.

## The tests

Each code file has a test file next to it, with the same name plus `.test.ts`. A test is a worked example: "for this input, I expect this answer". Read the tests to see what each function must do.
