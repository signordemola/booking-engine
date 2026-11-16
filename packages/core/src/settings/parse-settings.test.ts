import { expect, test } from "vitest";
import { parseSettings } from "./parse-settings.js";

const lashByNadia = {
  version: 1,
  businessId: "lash-by-nadia",
  currency: "USD",
  defaultDeposit: { kind: "none" },
  services: [
    {
      id: "hybrid-full-set",
      name: "Hybrid full set",
      priceMinor: 12000,
      deposit: { kind: "percentage", percent: 25 },
      addOnIds: ["lash-bath"],
    },
    {
      id: "lash-removal",
      name: "Lash removal",
      priceMinor: 2500,
      addOnIds: [],
    },
  ],
  addOns: [
    { id: "lash-bath", name: "Lash bath", priceMinor: 1000, maxQuantity: 1 },
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

test("accepts a free service", () => {
  const input = {
    ...lashByNadia,
    services: [{ ...lashRemoval, priceMinor: 0 }],
  };
  expect(parseSettings(input).ok).toBe(true);
});

test.each([
  {
    problem: "a version this engine cannot read",
    input: { ...lashByNadia, version: 2 },
    path: "version",
    message: "This engine reads settings version 1.",
  },
  {
    problem: "a currency in small letters",
    input: { ...lashByNadia, currency: "usd" },
    path: "currency",
    message: "Use a 3-letter currency code in capitals, for example USD.",
  },
  {
    problem: "a price with decimals",
    input: {
      ...lashByNadia,
      services: [{ ...hybridFullSet, priceMinor: 120.5 }],
    },
    path: "services[0].priceMinor",
    message:
      "Enter the amount as a whole number of minor units, for example 12000 for 120.00.",
  },
  {
    problem: "a negative price",
    input: { ...lashByNadia, addOns: [{ ...lashBath, priceMinor: -1000 }] },
    path: "addOns[0].priceMinor",
    message:
      "Enter the amount as a whole number of minor units, for example 12000 for 120.00.",
  },
  {
    problem: "a service with no name",
    input: { ...lashByNadia, services: [{ ...hybridFullSet, name: "" }] },
    path: "services[0].name",
    message: "Enter a name.",
  },
  {
    problem: "a deposit of 0%",
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
    input: {
      ...lashByNadia,
      defaultDeposit: { kind: "percentage", percent: 101 },
    },
    path: "defaultDeposit.percent",
    message: "Enter a percentage above 0, up to 100.",
  },
  {
    problem: "a deposit kind that does not exist",
    input: { ...lashByNadia, defaultDeposit: { kind: "half" } },
    path: "defaultDeposit.kind",
    message: "Choose a deposit kind: none, percentage, fixed or full.",
  },
  {
    problem: "an add-on that can never be picked",
    input: { ...lashByNadia, addOns: [{ ...lashBath, maxQuantity: 0 }] },
    path: "addOns[0].maxQuantity",
    message: "Enter a whole number, 1 or more.",
  },
  {
    problem: "a setting this engine does not know",
    input: { ...lashByNadia, depositt: { kind: "none" } },
    path: "",
    message: 'Remove the setting "depositt". This engine does not know it.',
  },
  {
    problem: "a fixed deposit above the price of the service",
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
    input: {
      ...lashByNadia,
      addOns: [lashBath, { ...lashBath, name: "Lash shampoo" }],
    },
    path: "addOns[1].id",
    message:
      'The id "lash-bath" is used more than once. Each id must be different.',
  },
])("rejects $problem", ({ input, path, message }) => {
  expect(errorsFor(input)).toEqual([{ path, message }]);
});

test("reports every problem at once, so the owner can fix them in one pass", () => {
  const input = {
    ...lashByNadia,
    currency: "dollars",
    services: [{ ...hybridFullSet, name: "", priceMinor: 120.5 }],
  };
  expect(errorsFor(input).map((error) => error.path)).toEqual([
    "currency",
    "services[0].name",
    "services[0].priceMinor",
  ]);
});

test("rejects a value that is not a settings document", () => {
  expect(parseSettings("lash-by-nadia").ok).toBe(false);
  expect(parseSettings(null).ok).toBe(false);
});
