import { expect, test } from "vitest";
import {
  hireStudio,
  lashStudio,
  photographer,
  salon,
} from "../testing/demo-businesses.js";
import { parseSettings } from "./parse-settings.js";

const lashByNadia = {
  ...lashStudio,
  services: lashStudio.services.slice(0, 2),
  resources: [],
  rules: [],
};
const nadia = {
  ...lashStudio.resources[0],
  serviceIds: ["hybrid-full-set", "lash-removal"],
};

const hybridFullSet = lashByNadia.services[0];
const lashRemoval = lashByNadia.services[1];
const lashBath = lashByNadia.addOns[0];
const homeVisit = lashByNadia.fees[0];
const aftercareKit = lashByNadia.addOns[1];

const errorsFor = (input: unknown) => {
  const result = parseSettings(input);
  return result.ok ? [] : result.errors;
};

test.each([
  { business: "the lash studio", settings: lashStudio },
  { business: "the salon", settings: salon },
  { business: "the studio hire", settings: hireStudio },
  { business: "the photographer", settings: photographer },
])("accepts the settings of $business", ({ settings }) => {
  expect(parseSettings(settings)).toEqual({ ok: true, value: settings });
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

test("accepts hours that run until midnight", () => {
  const input = {
    ...lashByNadia,
    resources: [
      {
        ...nadia,
        hours: { ...nadia?.hours, friday: [{ start: "18:00", end: "24:00" }] },
      },
    ],
  };
  expect(parseSettings(input).ok).toBe(true);
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
    services: [
      {
        ...lashRemoval,
        price: { kind: "fixed", amountMinor: 0, durationMinutes: 30 },
      },
    ],
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
        {
          ...hybridFullSet,
          price: { kind: "fixed", amountMinor: 120.5, durationMinutes: 30 },
        },
      ],
    },
    path: "services[0].price.amountMinor",
    message:
      "Enter the amount as a whole number of minor units, for example 12000 for 120.00.",
  },
  {
    problem: "a negative price",
    code: "input.invalid",
    input: {
      ...lashByNadia,
      addOns: [{ ...lashBath, priceMinor: -1000 }, aftercareKit],
    },
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
    input: {
      ...lashByNadia,
      addOns: [{ ...lashBath, maxQuantity: 0 }, aftercareKit],
    },
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
      addOns: [lashBath, { ...lashBath, name: "Lash shampoo" }, aftercareKit],
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
    input: { ...lashByNadia, fees: [homeVisit, homeVisit] },
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
  {
    problem: "a time zone that does not exist",
    code: "input.invalid",
    input: { ...lashByNadia, timeZone: "Eastern" },
    path: "timeZone",
    message: "Use a time zone name such as Europe/London or America/Toronto.",
  },
  {
    problem: "opening hours in a 12-hour format",
    code: "input.invalid",
    input: {
      ...lashByNadia,
      resources: [
        {
          ...nadia,
          hours: { ...nadia?.hours, monday: [{ start: "9am", end: "17:00" }] },
        },
      ],
    },
    path: "resources[0].hours.monday[0].start",
    message: "Use a 24-hour time such as 09:00 or 17:30.",
  },
  {
    problem: "opening hours that end before they start",
    code: "settings.window-ends-before-start",
    input: {
      ...lashByNadia,
      resources: [
        {
          ...nadia,
          hours: {
            ...nadia?.hours,
            monday: [{ start: "18:00", end: "10:00" }],
          },
        },
      ],
    },
    path: "resources[0].hours.monday[0]",
    message: 'On monday, "Nadia" has hours that end before they start.',
  },
  {
    problem: "opening hours that overlap",
    code: "settings.windows-overlap",
    input: {
      ...lashByNadia,
      resources: [
        {
          ...nadia,
          hours: {
            ...nadia?.hours,
            monday: [
              { start: "09:00", end: "13:00" },
              { start: "12:00", end: "17:00" },
            ],
          },
        },
      ],
    },
    path: "resources[0].hours.monday[1]",
    message: 'On monday, "Nadia" has hours that overlap or are out of order.',
  },
  {
    problem: "a resource that lists a service that does not exist",
    code: "settings.missing-service",
    input: {
      ...lashByNadia,
      resources: [{ ...nadia, serviceIds: ["brow-tint"] }],
    },
    path: "resources[0].serviceIds[0]",
    message: '"Nadia" lists the service "brow-tint", which does not exist.',
  },
  {
    problem: "two resources with the same id",
    code: "settings.repeated-id",
    input: { ...lashByNadia, resources: [nadia, nadia] },
    path: "resources[1].id",
    message:
      'The id "nadia" is used more than once. Each id must be different.',
  },
  {
    problem: "a closure on a date that does not exist",
    code: "input.invalid",
    input: {
      ...lashByNadia,
      closures: [{ from: "2027-02-29", to: "2027-03-01", reason: "Holiday" }],
    },
    path: "closures[0].from",
    message: "Use a date such as 2026-12-25.",
  },
  {
    problem: "a closure that ends before it starts",
    code: "settings.closure-ends-before-start",
    input: {
      ...lashByNadia,
      closures: [{ from: "2026-12-26", to: "2026-12-25", reason: "Christmas" }],
    },
    path: "closures[0]",
    message: 'The closure "Christmas" ends before it starts.',
  },
  {
    problem: "a negative gap between bookings",
    code: "input.invalid",
    input: {
      ...lashByNadia,
      schedule: {
        ...lashByNadia.schedule,
        gaps: { beforeMinutes: 0, afterMinutes: -15 },
      },
    },
    path: "schedule.gaps.afterMinutes",
    message: "Enter a whole number of minutes, 0 or more.",
  },
  {
    problem: "a rule kind that does not exist",
    code: "input.invalid",
    input: { ...lashByNadia, rules: [{ kind: "vip-only", id: "vip" }] },
    path: "rules[0].kind",
    message:
      "Choose a rule kind: prerequisite, consent, book-alone, fill-window or new-client-deposit.",
  },
  {
    problem: "a rule that names a service that does not exist",
    code: "settings.missing-service",
    input: {
      ...lashByNadia,
      rules: [
        { kind: "book-alone", id: "tests-alone", serviceIds: ["patch-test"] },
      ],
    },
    path: "rules[0]",
    message:
      'The rule "tests-alone" names the service "patch-test", which does not exist.',
  },
  {
    problem: "two rules with the same id",
    code: "settings.repeated-id",
    input: {
      ...lashByNadia,
      rules: [
        { kind: "book-alone", id: "alone", serviceIds: ["lash-removal"] },
        { kind: "book-alone", id: "alone", serviceIds: ["hybrid-full-set"] },
      ],
    },
    path: "rules[1].id",
    message:
      'The id "alone" is used more than once. Each id must be different.',
  },
  {
    problem: "a stylist with a level that does not exist",
    code: "settings.missing-level",
    input: { ...lashByNadia, resources: [{ ...nadia, levelId: "master" }] },
    path: "resources[0].levelId",
    message: '"Nadia" has the level "master", which does not exist.',
  },
  {
    problem: "a price for a level that does not exist",
    code: "settings.missing-level",
    input: {
      ...lashByNadia,
      services: [
        {
          ...hybridFullSet,
          price: {
            kind: "fixed",
            amountMinor: 12000,
            durationMinutes: 150,
            levelPrices: [{ levelId: "master", amountMinor: 15000 }],
          },
        },
        lashRemoval,
      ],
    },
    path: "services[0].price.levelPrices[0].levelId",
    message:
      '"Hybrid full set" has a price for the level "master", which does not exist.',
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
        price: { kind: "fixed", amountMinor: 120.5, durationMinutes: 30 },
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
