import { expect, test } from "vitest";
import type {
  BusinessSettings,
  DepositRule,
} from "../settings/settings-schema.js";
import { createQuote } from "./create-quote.js";

const lashStudio: BusinessSettings = {
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
      addOnIds: ["lash-bath", "aftercare-kit"],
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
    {
      id: "aftercare-kit",
      name: "Aftercare kit",
      priceMinor: 1800,
      maxQuantity: 3,
    },
  ],
  fees: [
    { id: "home-visit", name: "Home visit", amountMinor: 2000, due: "today" },
    {
      id: "after-hours",
      name: "After-hours appointment",
      amountMinor: 1500,
      due: "later",
    },
  ],
};

const salon: BusinessSettings = {
  version: 1,
  businessId: "atelier-rosa",
  currency: "CAD",
  tax: {
    kind: "added",
    rates: [
      { id: "gst", name: "GST", percent: 5 },
      { id: "qst", name: "QST", percent: 9.975 },
    ],
    timing: "with-each-payment",
  },
  defaultDeposit: { kind: "percentage", percent: 25 },
  services: [
    {
      id: "balayage",
      name: "Balayage",
      price: { kind: "fixed", amountMinor: 24000 },
      addOnIds: ["bond-treatment"],
    },
  ],
  addOns: [
    {
      id: "bond-treatment",
      name: "Bond treatment",
      priceMinor: 3500,
      maxQuantity: 1,
    },
  ],
  fees: [],
};

const hireStudio: BusinessSettings = {
  version: 1,
  businessId: "northlight-studio",
  currency: "CAD",
  tax: {
    kind: "added",
    rates: [{ id: "hst", name: "HST", percent: 13 }],
    timing: "with-balance",
  },
  defaultDeposit: { kind: "percentage", percent: 50 },
  services: [
    {
      id: "daylight-studio",
      name: "Daylight studio",
      price: { kind: "hourly", hourlyMinor: 8500, minHours: 2, maxHours: 8 },
      addOnIds: ["backdrop"],
    },
  ],
  addOns: [
    {
      id: "backdrop",
      name: "Paper backdrop",
      priceMinor: 2500,
      maxQuantity: 2,
    },
  ],
  fees: [],
};

const photographer: BusinessSettings = {
  version: 1,
  businessId: "clara-monet-photography",
  currency: "GBP",
  tax: {
    kind: "included",
    rates: [{ id: "vat", name: "VAT", percent: 20 }],
    timing: "with-each-payment",
  },
  defaultDeposit: { kind: "none" },
  services: [
    {
      id: "portrait-session",
      name: "Portrait session",
      price: { kind: "fixed", amountMinor: 25000 },
      deposit: { kind: "fixed", amountMinor: 7500 },
      addOnIds: [],
    },
  ],
  addOns: [],
  fees: [{ id: "travel", name: "Travel", amountMinor: 2000, due: "today" }],
};

const fullSetWithLashBath = {
  services: [
    {
      serviceId: "hybrid-full-set",
      addOns: [{ addOnId: "lash-bath", quantity: 1 }],
    },
  ],
};

const quoteFor = (settings: BusinessSettings, request: unknown) => {
  const result = createQuote({ settings, request });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
};

const errorsFor = (settings: BusinessSettings, request: unknown) => {
  const result = createQuote({ settings, request });
  return result.ok ? [] : result.errors;
};

const lashStudioWithDeposit = (deposit: DepositRule): BusinessSettings => ({
  ...lashStudio,
  services: lashStudio.services.map((service) =>
    service.id === "hybrid-full-set" ? { ...service, deposit } : service,
  ),
});

test("a hybrid full set with a lash bath: US$130, US$30 today, US$100 later", () => {
  expect(
    createQuote({ settings: lashStudio, request: fullSetWithLashBath }),
  ).toEqual({
    ok: true,
    value: {
      currency: "USD",
      pricesIncludeTax: false,
      lineItems: [
        {
          kind: "service",
          serviceId: "hybrid-full-set",
          name: "Hybrid full set",
          hours: null,
          amountMinor: 12000,
          depositMinor: 3000,
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
      subtotalMinor: 13000,
      taxLines: [],
      totalMinor: 13000,
      dueToday: {
        depositMinor: 3000,
        feesMinor: 0,
        taxMinor: 0,
        totalMinor: 3000,
      },
      balance: { taxMinor: 0, totalMinor: 10000 },
      reasons: [
        {
          code: "deposit.service-rule",
          path: "lineItems[0]",
          message:
            '"Hybrid full set" has its own deposit rule: 25% of its price.',
        },
        {
          code: "tax.none",
          path: "taxLines",
          message: "This business charges no tax.",
        },
      ],
    },
  });
});

test.each([
  {
    booking: "one service with no add-ons",
    request: { services: [{ serviceId: "hybrid-full-set", addOns: [] }] },
    totalMinor: 12000,
  },
  {
    booking: "three aftercare kits with a full set",
    request: {
      services: [
        {
          serviceId: "hybrid-full-set",
          addOns: [{ addOnId: "aftercare-kit", quantity: 3 }],
        },
      ],
    },
    totalMinor: 17400,
  },
  {
    booking: "two services in one booking",
    request: {
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
    },
    totalMinor: 19100,
  },
])("the total of $booking is $totalMinor", ({ request, totalMinor }) => {
  expect(quoteFor(lashStudio, request).totalMinor).toBe(totalMinor);
});

test.each([
  { rule: { kind: "none" }, dueTodayMinor: 0, balanceMinor: 13000 },
  {
    rule: { kind: "percentage", percent: 25 },
    dueTodayMinor: 3000,
    balanceMinor: 10000,
  },
  {
    rule: { kind: "percentage", percent: 12.5 },
    dueTodayMinor: 1500,
    balanceMinor: 11500,
  },
  {
    rule: { kind: "fixed", amountMinor: 5000 },
    dueTodayMinor: 5000,
    balanceMinor: 8000,
  },
  { rule: { kind: "full" }, dueTodayMinor: 13000, balanceMinor: 0 },
] satisfies {
  rule: DepositRule;
  dueTodayMinor: number;
  balanceMinor: number;
}[])(
  "with the deposit rule $rule.kind, $dueTodayMinor is due today and $balanceMinor later",
  ({ rule, dueTodayMinor, balanceMinor }) => {
    const quote = quoteFor(lashStudioWithDeposit(rule), fullSetWithLashBath);

    expect(quote.dueToday.totalMinor).toBe(dueTodayMinor);
    expect(quote.balance.totalMinor).toBe(balanceMinor);
  },
);

test("a service with no rule of its own uses the business deposit rule", () => {
  const settings: BusinessSettings = {
    ...lashStudio,
    defaultDeposit: { kind: "percentage", percent: 50 },
  };
  const request = {
    services: [
      { serviceId: "lash-removal", addOns: [] },
      { serviceId: "hybrid-full-set", addOns: [] },
    ],
  };
  const quote = quoteFor(settings, request);

  expect(quote.dueToday.depositMinor).toBe(4250);
  expect(quote.balance.totalMinor).toBe(10250);
  expect(quote.reasons.map((reason) => reason.code)).toEqual([
    "deposit.default-rule",
    "deposit.service-rule",
    "tax.none",
  ]);
  expect(quote.reasons[0]?.message).toBe(
    '"Lash removal" uses the business deposit rule: 50% of its price.',
  );
});

test("a fee due today is paid with the deposit", () => {
  const quote = quoteFor(lashStudio, {
    ...fullSetWithLashBath,
    feeIds: ["home-visit"],
  });

  expect(quote.totalMinor).toBe(15000);
  expect(quote.dueToday).toEqual({
    depositMinor: 3000,
    feesMinor: 2000,
    taxMinor: 0,
    totalMinor: 5000,
  });
  expect(quote.balance.totalMinor).toBe(10000);
  expect(quote.lineItems.at(-1)).toEqual({
    kind: "fee",
    feeId: "home-visit",
    name: "Home visit",
    due: "today",
    amountMinor: 2000,
  });
});

test("a fee due later is paid with the balance", () => {
  const quote = quoteFor(lashStudio, {
    ...fullSetWithLashBath,
    feeIds: ["after-hours"],
  });

  expect(quote.totalMinor).toBe(14500);
  expect(quote.dueToday.totalMinor).toBe(3000);
  expect(quote.balance.totalMinor).toBe(11500);
});

test("a studio hired for 4 hours with a backdrop, with all tax counted with the balance", () => {
  const request = {
    services: [
      {
        serviceId: "daylight-studio",
        hours: 4,
        addOns: [{ addOnId: "backdrop", quantity: 1 }],
      },
    ],
  };
  const quote = quoteFor(hireStudio, request);

  expect(quote.lineItems[0]).toMatchObject({
    hours: 4,
    amountMinor: 34000,
    depositMinor: 17000,
  });
  expect(quote.subtotalMinor).toBe(36500);
  expect(quote.taxLines).toEqual([
    { taxId: "hst", name: "HST", percent: 13, amountMinor: 4745 },
  ]);
  expect(quote.totalMinor).toBe(41245);
  expect(quote.dueToday).toEqual({
    depositMinor: 17000,
    feesMinor: 0,
    taxMinor: 0,
    totalMinor: 17000,
  });
  expect(quote.balance).toEqual({ taxMinor: 4745, totalMinor: 24245 });
});

test("two taxes added on top, with a share of each in the deposit payment", () => {
  const request = {
    services: [
      {
        serviceId: "balayage",
        addOns: [{ addOnId: "bond-treatment", quantity: 1 }],
      },
    ],
  };
  const quote = quoteFor(salon, request);

  expect(quote.pricesIncludeTax).toBe(false);
  expect(quote.subtotalMinor).toBe(27500);
  expect(quote.taxLines).toEqual([
    { taxId: "gst", name: "GST", percent: 5, amountMinor: 1375 },
    { taxId: "qst", name: "QST", percent: 9.975, amountMinor: 2743 },
  ]);
  expect(quote.totalMinor).toBe(31618);
  expect(quote.dueToday).toEqual({
    depositMinor: 6000,
    feesMinor: 0,
    taxMinor: 899,
    totalMinor: 6899,
  });
  expect(quote.balance).toEqual({ taxMinor: 3219, totalMinor: 24719 });
  expect(quote.dueToday.totalMinor + quote.balance.totalMinor).toBe(
    quote.totalMinor,
  );
});

test("prices that include VAT: the total does not grow, and the tax inside is shown", () => {
  const request = {
    services: [{ serviceId: "portrait-session", addOns: [] }],
    feeIds: ["travel"],
  };
  const quote = quoteFor(photographer, request);

  expect(quote.pricesIncludeTax).toBe(true);
  expect(quote.subtotalMinor).toBe(27000);
  expect(quote.taxLines).toEqual([
    { taxId: "vat", name: "VAT", percent: 20, amountMinor: 4500 },
  ]);
  expect(quote.totalMinor).toBe(27000);
  expect(quote.dueToday).toEqual({
    depositMinor: 7500,
    feesMinor: 2000,
    taxMinor: 1583,
    totalMinor: 9500,
  });
  expect(quote.balance).toEqual({ taxMinor: 2917, totalMinor: 17500 });
});

test("included tax counted with the balance changes the tax split, not the amounts", () => {
  const settings: BusinessSettings = {
    ...photographer,
    tax: {
      kind: "included",
      rates: [{ id: "vat", name: "VAT", percent: 20 }],
      timing: "with-balance",
    },
  };
  const request = {
    services: [{ serviceId: "portrait-session", addOns: [] }],
    feeIds: ["travel"],
  };
  const quote = quoteFor(settings, request);

  expect(quote.dueToday).toEqual({
    depositMinor: 7500,
    feesMinor: 2000,
    taxMinor: 0,
    totalMinor: 9500,
  });
  expect(quote.balance).toEqual({ taxMinor: 4500, totalMinor: 17500 });
});

test.each([
  {
    problem: "a booking with no service",
    request: { services: [] },
    code: "input.invalid",
    path: "request.services",
    message: "Choose at least one service.",
  },
  {
    problem: "a service that does not exist",
    request: { services: [{ serviceId: "brow-lamination", addOns: [] }] },
    code: "quote.unknown-service",
    path: "request.services[0].serviceId",
    message: 'The service "brow-lamination" does not exist.',
  },
  {
    problem: "an add-on the service does not offer",
    request: {
      services: [
        {
          serviceId: "lash-removal",
          addOns: [{ addOnId: "lash-bath", quantity: 1 }],
        },
      ],
    },
    code: "quote.add-on-not-offered",
    path: "request.services[0].addOns[0].addOnId",
    message: '"Lash removal" does not offer the add-on "lash-bath".',
  },
  {
    problem: "more of an add-on than the owner allows",
    request: {
      services: [
        {
          serviceId: "hybrid-full-set",
          addOns: [{ addOnId: "lash-bath", quantity: 2 }],
        },
      ],
    },
    code: "quote.quantity-above-maximum",
    path: "request.services[0].addOns[0].quantity",
    message: 'The most you can add of "Lash bath" is 1.',
  },
  {
    problem: "a quantity of zero",
    request: {
      services: [
        {
          serviceId: "hybrid-full-set",
          addOns: [{ addOnId: "lash-bath", quantity: 0 }],
        },
      ],
    },
    code: "input.invalid",
    path: "request.services[0].addOns[0].quantity",
    message: "Enter a whole number, 1 or more.",
  },
  {
    problem: "the same add-on listed twice for one service",
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
    code: "quote.add-on-repeated",
    path: "request.services[0].addOns[1].addOnId",
    message:
      'The add-on "aftercare-kit" is listed more than once. Use the quantity.',
  },
  {
    problem: "hours on a service with a fixed price",
    request: {
      services: [{ serviceId: "lash-removal", hours: 2, addOns: [] }],
    },
    code: "quote.hours-not-allowed",
    path: "request.services[0].hours",
    message: '"Lash removal" has a fixed price. Remove the hours.',
  },
  {
    problem: "a fee that does not exist",
    request: { ...fullSetWithLashBath, feeIds: ["parking"] },
    code: "quote.unknown-fee",
    path: "request.feeIds[0]",
    message: 'The fee "parking" does not exist.',
  },
  {
    problem: "the same fee listed twice",
    request: { ...fullSetWithLashBath, feeIds: ["home-visit", "home-visit"] },
    code: "quote.fee-repeated",
    path: "request.feeIds[1]",
    message: 'The fee "home-visit" is listed more than once.',
  },
  {
    problem: "a field this engine does not know",
    request: {
      services: [{ serviceId: "lash-removal", addOns: [], discount: 50 }],
    },
    code: "input.unknown-field",
    path: "request.services[0]",
    message: 'Remove "discount". This engine does not know that field.',
  },
])("rejects $problem", ({ request, code, path, message }) => {
  expect(errorsFor(lashStudio, request)).toEqual([{ code, path, message }]);
});

test.each([
  {
    problem: "an hourly service with no hours",
    hours: undefined,
    code: "quote.hours-required",
    message: 'Choose how many hours of "Daylight studio" you need.',
  },
  {
    problem: "fewer hours than the minimum",
    hours: 1,
    code: "quote.hours-out-of-range",
    message: '"Daylight studio" can be booked for 2 to 8 hours.',
  },
  {
    problem: "more hours than the maximum",
    hours: 9,
    code: "quote.hours-out-of-range",
    message: '"Daylight studio" can be booked for 2 to 8 hours.',
  },
])("rejects $problem", ({ hours, code, message }) => {
  const request = {
    services: [{ serviceId: "daylight-studio", hours, addOns: [] }],
  };

  expect(errorsFor(hireStudio, request)).toEqual([
    { code, path: "request.services[0].hours", message },
  ]);
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
