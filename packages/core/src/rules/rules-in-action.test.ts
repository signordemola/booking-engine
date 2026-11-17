import { expect, test } from "vitest";
import { decideBooking } from "../bookings/decide-booking.js";
import { createQuote } from "../quotes/create-quote.js";
import { checkSlot } from "../slots/check-slot.js";
import { listSlots } from "../slots/list-slots.js";
import { hireStudio, lashStudio, salon } from "../testing/demo-businesses.js";

const tuesdayMorning = "2026-11-17T15:00:00Z";
const noHistory = { visits: [], prerequisites: [], consents: [] };
const fullSet = [{ serviceId: "hybrid-full-set", addOns: [] }];
const patchTestOnTuesdayAt11 = {
  ...noHistory,
  prerequisites: [
    { ruleId: "patch-test-for-lashes", at: "2026-11-17T16:00:00Z" },
  ],
};

const localStarts = (facts: unknown, request: unknown) => {
  const result = listSlots({ settings: lashStudio, facts, request });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return {
    starts: result.value.slots.map((slot) => slot.localStart),
    reasons: result.value.reasons,
  };
};

test("after a patch test on Tuesday at 11:00, Thursday offers only times from 11:00", () => {
  const facts = {
    now: tuesdayMorning,
    busy: [],
    client: patchTestOnTuesdayAt11,
  };
  const thursday = localStarts(facts, {
    date: "2026-11-19",
    services: fullSet,
  });

  expect(thursday.starts).toEqual([
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
  ]);
  expect(thursday.reasons).toEqual([]);
});

test("the day after the patch test has no times, and the answer says why", () => {
  const facts = {
    now: tuesdayMorning,
    busy: [],
    client: patchTestOnTuesdayAt11,
  };
  const wednesday = localStarts(facts, {
    date: "2026-11-18",
    services: fullSet,
  });

  expect(wednesday.starts).toEqual([]);
  expect(wednesday.reasons).toEqual([
    {
      code: "rule.prerequisite-too-recent",
      path: "request.date",
      message:
        '"Hybrid full set" must be at least 48 hours after this: Patch test.',
    },
  ]);
});

test("a client with no patch test sees no times for a full set, and the answer says why", () => {
  const facts = { now: tuesdayMorning, busy: [], client: noHistory };
  const saturday = localStarts(facts, {
    date: "2026-11-21",
    services: fullSet,
  });

  expect(saturday.starts).toEqual([]);
  expect(saturday.reasons).toEqual([
    {
      code: "rule.prerequisite-missing",
      path: "request.date",
      message: '"Hybrid full set" needs this first: Patch test.',
    },
  ]);
});

test("the same client can still book the patch test itself", () => {
  const facts = { now: tuesdayMorning, busy: [], client: noHistory };
  const request = {
    date: "2026-11-18",
    services: [{ serviceId: "patch-test", addOns: [] }],
  };

  expect(localStarts(facts, request).starts.length).toBeGreaterThan(0);
});

test("checking one time gives the rule as the reason", () => {
  const facts = {
    now: tuesdayMorning,
    busy: [],
    client: patchTestOnTuesdayAt11,
  };
  const request = { start: "2026-11-19T10:00:00-05:00", services: fullSet };

  expect(checkSlot({ settings: lashStudio, facts, request })).toMatchObject({
    ok: true,
    value: {
      available: false,
      reasons: [
        { code: "rule.prerequisite-too-recent", path: "request.start" },
      ],
    },
  });
});

test("a patch test cannot be put in the same booking as a full set", () => {
  const facts = { now: tuesdayMorning, busy: [], client: noHistory };
  const services = [
    { serviceId: "patch-test", addOns: [] },
    { serviceId: "hybrid-full-set", addOns: [] },
  ];
  const expected = {
    ok: false,
    errors: [
      {
        code: "rule.book-alone",
        path: "request.services",
        message: '"Patch test" must be booked on its own.',
      },
    ],
  };

  expect(createQuote({ settings: lashStudio, request: { services } })).toEqual(
    expected,
  );
  expect(
    listSlots({
      settings: lashStudio,
      facts,
      request: { date: "2026-11-21", services },
    }),
  ).toEqual(expected);
});

test("a fill inside the window is priced as a fill", () => {
  const client = {
    ...noHistory,
    visits: [{ serviceId: "hybrid-full-set", at: "2026-11-03T15:00:00Z" }],
  };
  const request = { services: [{ serviceId: "hybrid-fill", addOns: [] }] };
  const result = createQuote({
    settings: lashStudio,
    facts: { now: tuesdayMorning, client },
    request,
  });

  expect(result).toMatchObject({ ok: true, value: { totalMinor: 6500 } });
});

test("a fill past the window is refused, and the answer names the service to book", () => {
  const client = {
    ...noHistory,
    visits: [{ serviceId: "hybrid-full-set", at: "2026-10-20T15:00:00Z" }],
  };
  const request = { services: [{ serviceId: "hybrid-fill", addOns: [] }] };
  const result = createQuote({
    settings: lashStudio,
    facts: { now: tuesdayMorning, client },
    request,
  });

  expect(result).toEqual({
    ok: false,
    errors: [
      {
        code: "rule.fill-window-passed",
        path: "request.services",
        message:
          '"Hybrid fill" is for visits within 21 days of the last one. Book "Hybrid full set" instead.',
      },
    ],
  });
});

test("a fill is offered on dates inside the window and not on dates after it", () => {
  const client = {
    ...noHistory,
    visits: [{ serviceId: "hybrid-full-set", at: "2026-11-03T17:00:00Z" }],
  };
  const facts = { now: tuesdayMorning, busy: [], client };
  const fill = [{ serviceId: "hybrid-fill", addOns: [] }];
  const lastDay = localStarts(facts, { date: "2026-11-24", services: fill });
  const dayAfter = localStarts(facts, { date: "2026-11-25", services: fill });

  expect(lastDay.starts).toEqual(["10:00", "10:30", "11:00", "11:30", "12:00"]);
  expect(dayAfter.starts).toEqual([]);
  expect(dayAfter.reasons).toMatchObject([{ code: "rule.fill-window-passed" }]);
});

const browClient = (
  consents: { ruleId: string; formVersion: string; signedAt: string }[],
) => ({
  visits: [],
  prerequisites: [
    { ruleId: "consultation-for-brows", at: "2026-11-14T16:00:00Z" },
  ],
  consents,
});

const ombreBrows = {
  bookingId: "booking-5001",
  clientId: "client-sofia",
  start: "2026-11-20T10:00:00-05:00",
  services: [{ serviceId: "ombre-brows", addOns: [] }],
};

test("ombre brows cannot be booked, so cannot be paid, before the consent form is signed", () => {
  const facts = { now: tuesdayMorning, busy: [], client: browClient([]) };

  expect(
    decideBooking({ settings: lashStudio, facts, request: ombreBrows }),
  ).toEqual({
    ok: false,
    errors: [
      {
        code: "rule.consent-required",
        path: "request.services",
        message: 'Sign this before you book "Ombre brows": PMU consent form.',
      },
    ],
  });
});

test("with the consultation done and the consent signed, ombre brows are held for payment", () => {
  const signed = [
    {
      ruleId: "pmu-consent",
      formVersion: "2026-01",
      signedAt: "2026-11-17T14:55:00Z",
    },
  ];
  const facts = { now: tuesdayMorning, busy: [], client: browClient(signed) };

  expect(
    decideBooking({ settings: lashStudio, facts, request: ombreBrows }),
  ).toMatchObject({
    ok: true,
    value: {
      booking: { status: "pending", totalMinor: 35000, dueTodayMinor: 10000 },
      events: [{ type: "booking.held" }],
    },
  });
});

test("the client can see times for ombre brows before the consent is signed", () => {
  const facts = { now: tuesdayMorning, busy: [], client: browClient([]) };
  const request = { date: "2026-11-20", services: ombreBrows.services };

  expect(localStarts(facts, request).starts.length).toBeGreaterThan(0);
});

test("a hirer must sign the studio hire rules before the hire is booked", () => {
  const facts = { now: tuesdayMorning, busy: [], client: noHistory };
  const request = {
    bookingId: "booking-3001",
    clientId: "client-priya",
    start: "2026-11-21T10:00:00-05:00",
    services: [{ serviceId: "daylight-studio", hours: 4, addOns: [] }],
  };

  expect(decideBooking({ settings: hireStudio, facts, request })).toMatchObject(
    {
      ok: false,
      errors: [{ code: "rule.consent-required" }],
    },
  );
});

const balayage = { services: [{ serviceId: "balayage", addOns: [] }] };

test.each([
  {
    who: "a new client",
    client: noHistory,
    depositMinor: 12000,
    code: "deposit.new-client-rule",
  },
  {
    who: "a returning client",
    client: {
      ...noHistory,
      visits: [{ serviceId: "fringe-trim", at: "2026-09-01T15:00:00Z" }],
    },
    depositMinor: 6000,
    code: "deposit.default-rule",
  },
  {
    who: "a client the platform knows nothing about",
    client: undefined,
    depositMinor: 6000,
    code: "deposit.default-rule",
  },
])(
  "$who pays a deposit of $depositMinor on a balayage",
  ({ client, depositMinor, code }) => {
    const result = createQuote({
      settings: salon,
      facts: { client },
      request: balayage,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        dueToday: { depositMinor },
        reasons: [
          { code },
          { code: "tax.added" },
          { code: "tax.with-each-payment" },
        ],
      },
    });
  },
);

test("the new-client reason says which rule set the deposit", () => {
  const result = createQuote({
    settings: salon,
    facts: { client: noHistory },
    request: balayage,
  });

  expect(result.ok && result.value.reasons[0]?.message).toBe(
    '"Balayage" uses the deposit rule for new clients: 50% of its price.',
  );
});

test.each([
  { stylist: "the senior stylist", resourceId: "camille", amountMinor: 28000 },
  {
    stylist: "a stylist with no level",
    resourceId: "noah",
    amountMinor: 24000,
  },
  {
    stylist: "no stylist chosen yet",
    resourceId: undefined,
    amountMinor: 24000,
  },
])(
  "a balayage with $stylist costs $amountMinor",
  ({ resourceId, amountMinor }) => {
    const request = {
      ...balayage,
      ...(resourceId === undefined ? {} : { resourceId }),
    };
    const result = createQuote({ settings: salon, request });

    expect(result).toMatchObject({
      ok: true,
      value: { lineItems: [{ amountMinor }] },
    });
  },
);

test("a booking with the senior stylist is priced at her level", () => {
  const facts = { now: "2026-11-10T15:00:00Z", busy: [] };
  const request = {
    bookingId: "booking-2003",
    clientId: "client-jules",
    start: "2026-11-18T13:00:00-05:00",
    services: [{ serviceId: "balayage", addOns: [] }],
  };
  const result = decideBooking({ settings: salon, facts, request });

  expect(result).toMatchObject({
    ok: true,
    value: {
      booking: { resourceId: "camille" },
      quote: { subtotalMinor: 28000 },
    },
  });
});

test("a quote refuses a stylist who does not exist", () => {
  const result = createQuote({
    settings: salon,
    request: { ...balayage, resourceId: "mia" },
  });

  expect(result).toEqual({
    ok: false,
    errors: [
      {
        code: "quote.unknown-resource",
        path: "request.resourceId",
        message: 'The resource "mia" does not exist.',
      },
    ],
  });
});
