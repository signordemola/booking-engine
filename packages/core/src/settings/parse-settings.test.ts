import { expect, test } from "vitest";
import { parseSettings } from "./parse-settings.js";

const lashByNadia = {
  version: 1,
  businessId: "lash-by-nadia",
  currency: "USD",
  tax: { kind: "none" },
  defaultDeposit: { kind: "none" },
  services: [
    {
      id: "hybrid-full-set",
      name: "Hybrid full set",
      price: { kind: "fixed", amountMinor: 12000 },
      deposit: { kind: "percentage", percent: 25 },
      addOnIds: ["lash-bath"],
    },
    {
      id: "lash-removal",
      name: "Lash removal",
      price: { kind: "fixed", amountMinor: 2500 },
      addOnIds: [],
    },
  ],
  addOns: [
    { id: "lash-bath", name: "Lash bath", priceMinor: 1000, maxQuantity: 1 },
  ],
  fees: [
    { id: "home-visit", name: "Home visit", amountMinor: 2000, due: "today" },
  ],
};

const hybridFullSet = lashByNadia.services[0];
const lashRemoval = lashByNadia.services[1];
const lashBath = lashByNadia.addOns[0];

const errorsFor = (input: unknown) => {
  const result = parseSettings(input);
  return result.ok ? [] : result.errors;
};

test("accepts the settings of a lash studio", () => {
  expect(parseSettings(lashByNadia)).toEqual({ ok: true, value: lashByNadia });
});

test.each([
  { kind: "none" },
  { kind: "percentage", percent: 12.5 },
  { kind: "percentage", percent: 100 },
  { kind: "fixed", amountMinor: 3000 },
  { kind: "fixed", amountMinor: 12000 },
  { kind: "full" },
])("accepts the deposit rule $kind", (deposit) => {
  const input = { ...lashByNadia, services: [{ ...hybridFullSet, deposit }] };
  expect(parseSettings(input).ok).toBe(true);
});

test.each([
  { kind: "none" },
  {
    kind: "added",
    rates: [{ id: "hst", name: "HST", percent: 13 }],
    timing: "with-balance",
  },
  {
    kind: "included",
    rates: [{ id: "vat", name: "VAT", percent: 20 }],
    timing: "with-each-payment",
  },
])("accepts the tax kind $kind", (tax) => {
  expect(parseSettings({ ...lashByNadia, tax }).ok).toBe(true);
});

test("accepts a service priced by the hour", () => {
  const input = {
    ...lashByNadia,
    services: [
      {
        ...lashRemoval,
        price: { kind: "hourly", hourlyMinor: 8500, minHours: 2, maxHours: 8 },
      },
    ],
  };
  expect(parseSettings(input).ok).toBe(true);
});

test("accepts a free service", () => {
  const input = {
    ...lashByNadia,
    services: [{ ...lashRemoval, price: { kind: "fixed", amountMinor: 0 } }],
  };
  expect(parseSettings(input).ok).toBe(true);
});

test.each([
  {
    problem: "a version this engine cannot read",
    code: "input.invalid",
    input: { ...lashByNadia, version: 2 },
    path: "version",
    message: "This engine reads settings version 1.",
  },
  {
    problem: "a currency in small letters",
    code: "input.invalid",
    input: { ...lashByNadia, currency: "usd" },
    path: "currency",
    message: "Use a 3-letter currency code in capitals, for example USD.",
  },
  {
    problem: "a price with decimals",
    code: "input.invalid",
    input: {
      ...lashByNadia,
      services: [
        { ...hybridFullSet, price: { kind: "fixed", amountMinor: 120.5 } },
      ],
    },
    path: "services[0].price.amountMinor",
    message:
      "Enter the amount as a whole number of minor units, for example 12000 for 120.00.",
  },
  {
    problem: "a negative price",
    code: "input.invalid",
    input: { ...lashByNadia, addOns: [{ ...lashBath, priceMinor: -1000 }] },
    path: "addOns[0].priceMinor",
    message:
      "Enter the amount as a whole number of minor units, for example 12000 for 120.00.",
  },
  {
    problem: "a service with no name",
    code: "input.invalid",
    input: { ...lashByNadia, services: [{ ...hybridFullSet, name: "" }] },
    path: "services[0].name",
    message: "Enter a name.",
  },
  {
    problem: "a deposit of 0%",
    code: "input.invalid",
    input: {
      ...lashByNadia,
      services: [
        { ...hybridFullSet, deposit: { kind: "percentage", percent: 0 } },
      ],
    },
    path: "services[0].deposit.percent",
    message: "Enter a percentage above 0, up to 100.",
  },
  {
    problem: "a deposit of 101%",
    code: "input.invalid",
    input: {
      ...lashByNadia,
      defaultDeposit: { kind: "percentage", percent: 101 },
    },
    path: "defaultDeposit.percent",
    message: "Enter a percentage above 0, up to 100.",
  },
  {
    problem: "a deposit kind that does not exist",
    code: "input.invalid",
    input: { ...lashByNadia, defaultDeposit: { kind: "half" } },
    path: "defaultDeposit.kind",
    message: "Choose a deposit kind: none, percentage, fixed or full.",
  },
  {
    problem: "an add-on that can never be picked",
    code: "input.invalid",
    input: { ...lashByNadia, addOns: [{ ...lashBath, maxQuantity: 0 }] },
    path: "addOns[0].maxQuantity",
    message: "Enter a whole number, 1 or more.",
  },
  {
    problem: "a setting this engine does not know",
    code: "input.unknown-field",
    input: { ...lashByNadia, depositt: { kind: "none" } },
    path: "",
    message: 'Remove "depositt". This engine does not know that field.',
  },
  {
    problem: "a fixed deposit above the price of the service",
    code: "settings.fixed-deposit-above-price",
    input: {
      ...lashByNadia,
      services: [
        { ...hybridFullSet, deposit: { kind: "fixed", amountMinor: 12001 } },
      ],
    },
    path: "services[0].deposit",
    message: 'The fixed deposit of "Hybrid full set" is more than its price.',
  },
  {
    problem:
      "a default fixed deposit above the price of a service that uses it",
    code: "settings.fixed-deposit-above-price",
    input: {
      ...lashByNadia,
      defaultDeposit: { kind: "fixed", amountMinor: 3000 },
    },
    path: "services[1]",
    message:
      'The default fixed deposit is more than the price of "Lash removal".',
  },
  {
    problem: "a service that lists an add-on that does not exist",
    code: "settings.missing-add-on",
    input: {
      ...lashByNadia,
      services: [{ ...hybridFullSet, addOnIds: ["brow-tint"] }],
    },
    path: "services[0].addOnIds[0]",
    message:
      '"Hybrid full set" lists the add-on "brow-tint", which does not exist.',
  },
  {
    problem: "two services with the same id",
    code: "settings.repeated-id",
    input: {
      ...lashByNadia,
      services: [hybridFullSet, { ...lashRemoval, id: "hybrid-full-set" }],
    },
    path: "services[1].id",
    message:
      'The id "hybrid-full-set" is used more than once. Each id must be different.',
  },
  {
    problem: "two add-ons with the same id",
    code: "settings.repeated-id",
    input: {
      ...lashByNadia,
      addOns: [lashBath, { ...lashBath, name: "Lash shampoo" }],
    },
    path: "addOns[1].id",
    message:
      'The id "lash-bath" is used more than once. Each id must be different.',
  },
  {
    problem: "a price kind that does not exist",
    code: "input.invalid",
    input: {
      ...lashByNadia,
      services: [
        { ...hybridFullSet, price: { kind: "per-day", amountMinor: 12000 } },
      ],
    },
    path: "services[0].price.kind",
    message: "Choose a price kind: fixed or hourly.",
  },
  {
    problem: "minimum hours above the maximum hours",
    code: "settings.hours-range",
    input: {
      ...lashByNadia,
      services: [
        {
          ...lashRemoval,
          name: "Daylight studio",
          price: {
            kind: "hourly",
            hourlyMinor: 8500,
            minHours: 4,
            maxHours: 2,
          },
        },
      ],
    },
    path: "services[0].price",
    message:
      'The minimum hours of "Daylight studio" are more than its maximum hours.',
  },
  {
    problem: "a fixed deposit above the lowest price of an hourly service",
    code: "settings.fixed-deposit-above-price",
    input: {
      ...lashByNadia,
      services: [
        {
          ...lashRemoval,
          name: "Daylight studio",
          price: {
            kind: "hourly",
            hourlyMinor: 8500,
            minHours: 2,
            maxHours: 8,
          },
          deposit: { kind: "fixed", amountMinor: 17001 },
        },
      ],
    },
    path: "services[0].deposit",
    message: 'The fixed deposit of "Daylight studio" is more than its price.',
  },
  {
    problem: "a fee with no clear due time",
    code: "input.invalid",
    input: {
      ...lashByNadia,
      fees: [
        {
          id: "home-visit",
          name: "Home visit",
          amountMinor: 2000,
          due: "tomorrow",
        },
      ],
    },
    path: "fees[0].due",
    message: "Choose when the fee is due: today or later.",
  },
  {
    problem: "two fees with the same id",
    code: "settings.repeated-id",
    input: { ...lashByNadia, fees: [...lashByNadia.fees, ...lashByNadia.fees] },
    path: "fees[1].id",
    message:
      'The id "home-visit" is used more than once. Each id must be different.',
  },
  {
    problem: "a tax kind that does not exist",
    code: "input.invalid",
    input: { ...lashByNadia, tax: { kind: "sometimes" } },
    path: "tax.kind",
    message: "Choose a tax kind: none, added or included.",
  },
  {
    problem: "added tax with no rate",
    code: "input.invalid",
    input: {
      ...lashByNadia,
      tax: { kind: "added", rates: [], timing: "with-each-payment" },
    },
    path: "tax.rates",
    message: "Add at least one tax rate.",
  },
  {
    problem: "tax with no clear timing",
    code: "input.invalid",
    input: {
      ...lashByNadia,
      tax: {
        kind: "included",
        rates: [{ id: "vat", name: "VAT", percent: 20 }],
        timing: "never",
      },
    },
    path: "tax.timing",
    message: "Choose when tax is paid: with-each-payment or with-balance.",
  },
  {
    problem: "two tax rates with the same id",
    code: "settings.repeated-id",
    input: {
      ...lashByNadia,
      tax: {
        kind: "added",
        rates: [
          { id: "gst", name: "GST", percent: 5 },
          { id: "gst", name: "QST", percent: 9.975 },
        ],
        timing: "with-each-payment",
      },
    },
    path: "tax.rates[1].id",
    message: 'The id "gst" is used more than once. Each id must be different.',
  },
])("rejects $problem", ({ input, code, path, message }) => {
  expect(errorsFor(input)).toEqual([{ code, path, message }]);
});

test("reports every problem at once, so the owner can fix them in one pass", () => {
  const input = {
    ...lashByNadia,
    currency: "dollars",
    services: [
      {
        ...hybridFullSet,
        name: "",
        price: { kind: "fixed", amountMinor: 120.5 },
      },
    ],
  };
  expect(errorsFor(input).map((error) => error.path)).toEqual([
    "currency",
    "services[0].name",
    "services[0].price.amountMinor",
  ]);
});

test("rejects a value that is not a settings document", () => {
  expect(parseSettings("lash-by-nadia").ok).toBe(false);
  expect(parseSettings(null).ok).toBe(false);
});
