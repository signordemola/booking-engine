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
- `toPathText` turns a location such as `["services", 0, "priceMinor"]` into the text `services[0].priceMinor`.
- `toSettingsErrors` turns one Zod problem into the plain error an owner reads.

## The tests

Each code file has a test file next to it, with the same name plus `.test.ts`. A test is a worked example: "for this input, I expect this answer". Read the tests to see what each function must do.
