import { expect, test } from "vitest";
import { lashStudio, photographer, salon } from "../testing/demo-businesses.js";
import type { Booking } from "./booking-schema.js";
import { decideCancellation } from "./decide-cancellation.js";

const portraitOnFriday = (overrides: Partial<Booking> = {}): Booking => ({
  businessId: "clara-monet-photography",
  bookingId: "booking-1001",
  clientId: "client-amelia",
  resourceId: "clara",
  status: "confirmed",
  start: "2026-12-18T10:00:00Z",
  end: "2026-12-18T11:30:00Z",
  blockedStart: "2026-12-18T09:30:00Z",
  blockedEnd: "2026-12-18T12:00:00Z",
  holdExpiresAt: null,
  createdAt: "2026-11-17T10:00:00Z",
  currency: "GBP",
  totalMinor: 25000,
  dueTodayMinor: 7500,
  services: [{ serviceId: "portrait-session", addOns: [] }],
  moveCount: 0,
  policy: photographer.policy,
  ...overrides,
});

const fullSetOnSaturday = (overrides: Partial<Booking> = {}): Booking => ({
  businessId: "lash-by-nadia",
  bookingId: "booking-2001",
  clientId: "client-maya",
  resourceId: "nadia",
  status: "confirmed",
  start: "2026-11-21T16:00:00Z",
  end: "2026-11-21T18:45:00Z",
  blockedStart: "2026-11-21T16:00:00Z",
  blockedEnd: "2026-11-21T19:00:00Z",
  holdExpiresAt: null,
  createdAt: "2026-11-17T15:00:00Z",
  currency: "USD",
  totalMinor: 13000,
  dueTodayMinor: 3000,
  services: [
    {
      serviceId: "hybrid-full-set",
      addOns: [{ addOnId: "lash-bath", quantity: 1 }],
    },
  ],
  moveCount: 0,
  policy: lashStudio.policy,
  ...overrides,
});

test("the homepage booking is non-refundable: the client cancels days ahead and the US$30 deposit is kept", () => {
  const result = decideCancellation({
    settings: lashStudio,
    facts: { now: "2026-11-18T15:00:00Z", paidMinor: 3000 },
    request: { booking: fullSetOnSaturday(), kind: "client-cancel" },
  });

  expect(result).toEqual({
    ok: true,
    value: {
      booking: fullSetOnSaturday({ status: "cancelled" }),
      money: {
        paidMinor: 3000,
        keptMinor: 3000,
        refundMinor: 0,
        chargeMinor: 0,
        taxInKept: [],
      },
      reasons: [
        {
          code: "cancellation.non-refundable",
          path: "request.kind",
          message: "The deposit is non-refundable, so the business keeps it.",
        },
      ],
      events: [
        {
          type: "booking.cancelled",
          businessId: "lash-by-nadia",
          bookingId: "booking-2001",
          at: "2026-11-18T15:00:00Z",
        },
      ],
    },
  });
});

test("a hold that was never paid is released and nothing is kept", () => {
  const held = fullSetOnSaturday({
    status: "pending",
    holdExpiresAt: "2026-11-17T15:15:00Z",
  });
  const result = decideCancellation({
    settings: lashStudio,
    facts: { now: "2026-11-17T15:05:00Z", paidMinor: 0 },
    request: { booking: held, kind: "client-cancel" },
  });

  expect(result).toMatchObject({
    ok: true,
    value: {
      booking: { status: "cancelled", holdExpiresAt: null },
      money: { keptMinor: 0, refundMinor: 0, chargeMinor: 0 },
      reasons: [{ code: "cancellation.hold-released" }],
    },
  });
});

test("when the business cancels, the client gets back all they paid, even with a non-refundable deposit", () => {
  const result = decideCancellation({
    settings: lashStudio,
    facts: { now: "2026-11-20T15:00:00Z", paidMinor: 3000 },
    request: { booking: fullSetOnSaturday(), kind: "business-cancel" },
  });

  expect(result).toMatchObject({
    ok: true,
    value: {
      money: { keptMinor: 0, refundMinor: 3000, chargeMinor: 0 },
      reasons: [{ code: "cancellation.by-business" }],
    },
  });
});

test("a photo client who cancels 15 days ahead gets the £75 retainer back", () => {
  const result = decideCancellation({
    settings: photographer,
    facts: { now: "2026-12-03T10:00:00Z", paidMinor: 7500 },
    request: { booking: portraitOnFriday(), kind: "client-cancel" },
  });

  expect(result).toMatchObject({
    ok: true,
    value: {
      money: {
        keptMinor: 0,
        refundMinor: 7500,
        chargeMinor: 0,
        taxInKept: [],
      },
      reasons: [
        {
          code: "cancellation.in-time",
          message:
            "The client cancelled at least 336 hours before, so nothing is kept.",
        },
      ],
    },
  });
});

test("a cancel exactly 336 hours before is still in time", () => {
  const result = decideCancellation({
    settings: photographer,
    facts: { now: "2026-12-04T10:00:00Z", paidMinor: 7500 },
    request: { booking: portraitOnFriday(), kind: "client-cancel" },
  });

  expect(result).toMatchObject({
    ok: true,
    value: { reasons: [{ code: "cancellation.in-time" }] },
  });
});

test("one minute later it is late: half of £250 is kept, £50 more is charged, and £20.83 VAT is inside the kept amount", () => {
  const result = decideCancellation({
    settings: photographer,
    facts: { now: "2026-12-04T10:01:00Z", paidMinor: 7500 },
    request: { booking: portraitOnFriday(), kind: "client-cancel" },
  });

  expect(result).toMatchObject({
    ok: true,
    value: {
      money: {
        paidMinor: 7500,
        keptMinor: 12500,
        refundMinor: 0,
        chargeMinor: 5000,
        taxInKept: [
          { taxId: "vat", name: "VAT", percent: 20, amountMinor: 2083 },
        ],
      },
      reasons: [{ code: "cancellation.late" }],
    },
  });
});

test("a no-show keeps the full £250, charges £175 more, and has £41.67 VAT inside", () => {
  const result = decideCancellation({
    settings: photographer,
    facts: { now: "2026-12-18T10:20:00Z", paidMinor: 7500 },
    request: { booking: portraitOnFriday(), kind: "no-show" },
  });

  expect(result).toMatchObject({
    ok: true,
    value: {
      booking: { status: "no-show" },
      money: {
        keptMinor: 25000,
        refundMinor: 0,
        chargeMinor: 17500,
        taxInKept: [{ amountMinor: 4167 }],
      },
      reasons: [{ code: "cancellation.no-show" }],
      events: [{ type: "booking.no-show" }],
    },
  });
});

test("a no-show cannot be marked before the appointment starts", () => {
  const result = decideCancellation({
    settings: photographer,
    facts: { now: "2026-12-18T09:59:00Z", paidMinor: 7500 },
    request: { booking: portraitOnFriday(), kind: "no-show" },
  });

  expect(result).toMatchObject({
    ok: false,
    errors: [{ code: "booking.not-started" }],
  });
});

test("a late salon cancel keeps half of CA$275.94, with GST and QST shown inside the kept amount", () => {
  const balayage: Booking = {
    ...portraitOnFriday(),
    businessId: "atelier-rosa",
    resourceId: "camille",
    currency: "CAD",
    totalMinor: 27594,
    dueTodayMinor: 6899,
    services: [{ serviceId: "balayage", addOns: [] }],
    policy: salon.policy,
  };
  const result = decideCancellation({
    settings: salon,
    facts: { now: "2026-12-17T12:00:00Z", paidMinor: 6899 },
    request: { booking: balayage, kind: "client-cancel" },
  });

  expect(result).toMatchObject({
    ok: true,
    value: {
      money: {
        keptMinor: 13797,
        refundMinor: 0,
        chargeMinor: 6898,
        taxInKept: [
          { taxId: "gst", amountMinor: 600 },
          { taxId: "qst", amountMinor: 1197 },
        ],
      },
    },
  });
});

test("a fixed late fee is never more than the booking total", () => {
  const booking = portraitOnFriday({
    policy: {
      ...photographer.policy,
      cancellation: {
        kind: "notice",
        noticeHours: 48,
        lateCancelKeeps: { kind: "fixed", amountMinor: 99900 },
      },
    },
  });
  const result = decideCancellation({
    settings: photographer,
    facts: { now: "2026-12-17T10:00:00Z", paidMinor: 7500 },
    request: { booking, kind: "client-cancel" },
  });

  expect(result).toMatchObject({
    ok: true,
    value: { money: { keptMinor: 25000, chargeMinor: 17500 } },
  });
});

test("the booking keeps the policy it was made with, so a later settings change does not change it", () => {
  const relaxedSettings = {
    ...lashStudio,
    policy: {
      ...lashStudio.policy,
      cancellation: {
        kind: "notice",
        noticeHours: 24,
        lateCancelKeeps: { kind: "paid" },
      },
    },
  };
  const result = decideCancellation({
    settings: relaxedSettings,
    facts: { now: "2026-11-18T15:00:00Z", paidMinor: 3000 },
    request: { booking: fullSetOnSaturday(), kind: "client-cancel" },
  });

  expect(result).toMatchObject({
    ok: true,
    value: {
      money: { keptMinor: 3000, refundMinor: 0 },
      reasons: [{ code: "cancellation.non-refundable" }],
    },
  });
});

test("a completed booking cannot be cancelled", () => {
  const result = decideCancellation({
    settings: photographer,
    facts: { now: "2026-12-19T10:00:00Z", paidMinor: 25000 },
    request: {
      booking: portraitOnFriday({ status: "completed" }),
      kind: "client-cancel",
    },
  });

  expect(result).toMatchObject({
    ok: false,
    errors: [{ code: "booking.not-allowed-from-status" }],
  });
});

test("an unknown kind is refused with a plain message", () => {
  const result = decideCancellation({
    settings: photographer,
    facts: { now: "2026-12-03T10:00:00Z", paidMinor: 7500 },
    request: { booking: portraitOnFriday(), kind: "refund-everything" },
  });

  expect(result).toMatchObject({
    ok: false,
    errors: [
      {
        path: "request.kind",
        message:
          "Choose who ends the booking: client-cancel, business-cancel or no-show.",
      },
    ],
  });
});
