import { expect, test } from "vitest";
import type { BusinessSettings } from "../settings/settings-schema.js";
import { createQuote } from "./create-quote.js";

const lashStudio: BusinessSettings = {
  version: 1,
  businessId: "lash-by-nadia",
  currency: "USD",
  defaultDeposit: { kind: "none" },
  services: [
    {
      id: "hybrid-full-set",
      name: "Hybrid full set",
      priceMinor: 12000,
      addOnIds: ["lash-bath", "aftercare-kit"],
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
    {
      id: "aftercare-kit",
      name: "Aftercare kit",
      priceMinor: 1800,
      maxQuantity: 3,
    },
  ],
};

const errorsFor = (request: unknown) => {
  const result = createQuote({ settings: lashStudio, request });
  return result.ok ? [] : result.errors;
};

test("a hybrid full set with a lash bath costs US$130", () => {
  const request = {
    services: [
      {
        serviceId: "hybrid-full-set",
        addOns: [{ addOnId: "lash-bath", quantity: 1 }],
      },
    ],
  };

  expect(createQuote({ settings: lashStudio, request })).toEqual({
    ok: true,
    value: {
      currency: "USD",
      lineItems: [
        {
          kind: "service",
          serviceId: "hybrid-full-set",
          name: "Hybrid full set",
          amountMinor: 12000,
        },
        {
          kind: "add-on",
          serviceId: "hybrid-full-set",
          addOnId: "lash-bath",
          name: "Lash bath",
          unitPriceMinor: 1000,
          quantity: 1,
          amountMinor: 1000,
        },
      ],
      totalMinor: 13000,
    },
  });
});

test.each([
  {
    booking: "one service with no add-ons",
    services: [{ serviceId: "hybrid-full-set", addOns: [] }],
    totalMinor: 12000,
  },
  {
    booking: "three aftercare kits with a full set",
    services: [
      {
        serviceId: "hybrid-full-set",
        addOns: [{ addOnId: "aftercare-kit", quantity: 3 }],
      },
    ],
    totalMinor: 17400,
  },
  {
    booking: "two services in one booking",
    services: [
      { serviceId: "lash-removal", addOns: [] },
      {
        serviceId: "hybrid-full-set",
        addOns: [
          { addOnId: "lash-bath", quantity: 1 },
          { addOnId: "aftercare-kit", quantity: 2 },
        ],
      },
    ],
    totalMinor: 19100,
  },
])("the total of $booking is $totalMinor", ({ services, totalMinor }) => {
  const result = createQuote({ settings: lashStudio, request: { services } });
  expect(result.ok && result.value.totalMinor).toBe(totalMinor);
});

test.each([
  {
    problem: "a booking with no service",
    code: "input.invalid",
    request: { services: [] },
    path: "request.services",
    message: "Choose at least one service.",
  },
  {
    problem: "a service that does not exist",
    code: "quote.unknown-service",
    request: { services: [{ serviceId: "brow-lamination", addOns: [] }] },
    path: "request.services[0].serviceId",
    message: 'The service "brow-lamination" does not exist.',
  },
  {
    problem: "an add-on the service does not offer",
    code: "quote.add-on-not-offered",
    request: {
      services: [
        {
          serviceId: "lash-removal",
          addOns: [{ addOnId: "lash-bath", quantity: 1 }],
        },
      ],
    },
    path: "request.services[0].addOns[0].addOnId",
    message: '"Lash removal" does not offer the add-on "lash-bath".',
  },
  {
    problem: "more of an add-on than the owner allows",
    code: "quote.quantity-above-maximum",
    request: {
      services: [
        {
          serviceId: "hybrid-full-set",
          addOns: [{ addOnId: "lash-bath", quantity: 2 }],
        },
      ],
    },
    path: "request.services[0].addOns[0].quantity",
    message: 'The most you can add of "Lash bath" is 1.',
  },
  {
    problem: "a quantity of zero",
    code: "input.invalid",
    request: {
      services: [
        {
          serviceId: "hybrid-full-set",
          addOns: [{ addOnId: "lash-bath", quantity: 0 }],
        },
      ],
    },
    path: "request.services[0].addOns[0].quantity",
    message: "Enter a whole number, 1 or more.",
  },
  {
    problem: "a quantity with decimals",
    code: "input.invalid",
    request: {
      services: [
        {
          serviceId: "hybrid-full-set",
          addOns: [{ addOnId: "aftercare-kit", quantity: 1.5 }],
        },
      ],
    },
    path: "request.services[0].addOns[0].quantity",
    message: "Enter a whole number, 1 or more.",
  },
  {
    problem: "the same add-on listed twice for one service",
    code: "quote.add-on-repeated",
    request: {
      services: [
        {
          serviceId: "hybrid-full-set",
          addOns: [
            { addOnId: "aftercare-kit", quantity: 1 },
            { addOnId: "aftercare-kit", quantity: 1 },
          ],
        },
      ],
    },
    path: "request.services[0].addOns[1].addOnId",
    message:
      'The add-on "aftercare-kit" is listed more than once. Use the quantity.',
  },
  {
    problem: "a field this engine does not know",
    code: "input.unknown-field",
    request: {
      services: [{ serviceId: "lash-removal", addOns: [], discount: 50 }],
    },
    path: "request.services[0]",
    message: 'Remove "discount". This engine does not know that field.',
  },
])("rejects $problem", ({ request, code, path, message }) => {
  expect(errorsFor(request)).toEqual([{ code, path, message }]);
});

test("rejects settings with a mistake, and says where", () => {
  const settings = { ...lashStudio, currency: "dollars" };
  const request = { services: [{ serviceId: "lash-removal", addOns: [] }] };

  expect(createQuote({ settings, request })).toEqual({
    ok: false,
    errors: [
      {
        code: "input.invalid",
        path: "settings.currency",
        message: "Use a 3-letter currency code in capitals, for example USD.",
      },
    ],
  });
});

test("rejects a value that is not a quote input", () => {
  expect(createQuote("hybrid-full-set").ok).toBe(false);
  expect(createQuote(null).ok).toBe(false);
  expect(createQuote({ settings: lashStudio }).ok).toBe(false);
});
