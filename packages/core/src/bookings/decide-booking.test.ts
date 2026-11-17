import { expect, test } from "vitest";
import { photographer, salon } from "../testing/demo-businesses.js";
import { decideBooking } from "./decide-booking.js";

const tuesday = "2026-11-17T10:00:00Z";
const portraitOnFriday = {
  bookingId: "booking-1001",
  clientId: "client-amelia",
  start: "2026-11-20T10:00:00Z",
  services: [{ serviceId: "portrait-session", addOns: [] }],
};

test("a portrait session with a retainer is held, not confirmed, until the retainer is paid", () => {
  const facts = { now: tuesday, busy: [] };
  const result = decideBooking({
    settings: photographer,
    facts,
    request: portraitOnFriday,
  });

  expect(result).toMatchObject({
    ok: true,
    value: {
      booking: {
        businessId: "clara-monet-photography",
        bookingId: "booking-1001",
        clientId: "client-amelia",
        resourceId: "clara",
        status: "pending",
        start: "2026-11-20T10:00:00Z",
        end: "2026-11-20T11:30:00Z",
        blockedStart: "2026-11-20T09:30:00Z",
        blockedEnd: "2026-11-20T12:00:00Z",
        holdExpiresAt: "2026-11-17T10:30:00Z",
        createdAt: tuesday,
        currency: "GBP",
        totalMinor: 25000,
        dueTodayMinor: 7500,
        services: [{ serviceId: "portrait-session", addOns: [] }],
        moveCount: 0,
        policy: photographer.policy,
      },
      quote: {
        totalMinor: 25000,
        dueToday: { totalMinor: 7500 },
        balance: { totalMinor: 17500 },
      },
      events: [
        {
          type: "booking.held",
          businessId: "clara-monet-photography",
          bookingId: "booking-1001",
          at: tuesday,
        },
      ],
    },
  });
});

test("a travel fee is part of the booking's amounts", () => {
  const facts = { now: tuesday, busy: [] };
  const request = { ...portraitOnFriday, feeIds: ["travel"] };
  const result = decideBooking({ settings: photographer, facts, request });

  expect(result).toMatchObject({
    ok: true,
    value: { booking: { totalMinor: 27000, dueTodayMinor: 9500 } },
  });
});

test("a service with nothing to pay today is confirmed at once, with no hold", () => {
  const facts = { now: "2026-11-10T15:00:00Z", busy: [] };
  const request = {
    bookingId: "booking-2001",
    clientId: "client-jules",
    start: "2026-11-18T11:15:00-05:00",
    services: [{ serviceId: "fringe-trim", addOns: [] }],
  };
  const result = decideBooking({ settings: salon, facts, request });

  expect(result).toMatchObject({
    ok: true,
    value: {
      booking: {
        resourceId: "camille",
        status: "confirmed",
        start: "2026-11-18T16:15:00Z",
        end: "2026-11-18T16:30:00Z",
        blockedStart: "2026-11-18T16:15:00Z",
        blockedEnd: "2026-11-18T16:40:00Z",
        holdExpiresAt: null,
        dueTodayMinor: 0,
      },
      events: [{ type: "booking.confirmed" }],
    },
  });
});

test("when the first stylist is busy, the booking goes to the next one who is free", () => {
  const facts = {
    now: "2026-11-10T15:00:00Z",
    busy: [
      {
        resourceId: "camille",
        start: "2026-11-18T16:00:00Z",
        end: "2026-11-18T17:00:00Z",
      },
    ],
  };
  const request = {
    bookingId: "booking-2002",
    clientId: "client-jules",
    start: "2026-11-18T11:15:00-05:00",
    services: [{ serviceId: "fringe-trim", addOns: [] }],
  };
  const result = decideBooking({ settings: salon, facts, request });

  expect(result).toMatchObject({
    ok: true,
    value: { booking: { resourceId: "noah" } },
  });
});

test.each([
  {
    problem: "a time that is already taken",
    facts: {
      now: tuesday,
      busy: [
        {
          resourceId: "clara",
          start: "2026-11-20T11:00:00Z",
          end: "2026-11-20T13:00:00Z",
        },
      ],
    },
    request: portraitOnFriday,
    errors: [
      {
        code: "slot.busy",
        path: "request.start",
        message: "This time is already taken.",
      },
    ],
  },
  {
    problem: "a time with too little notice",
    facts: { now: "2026-11-19T10:00:00Z", busy: [] },
    request: portraitOnFriday,
    errors: [
      {
        code: "slot.too-soon",
        path: "request.start",
        message: "Bookings need at least 2 days of notice.",
      },
    ],
  },
  {
    problem: "a booking with no client",
    facts: { now: tuesday, busy: [] },
    request: { ...portraitOnFriday, clientId: "" },
    errors: [
      {
        code: "input.invalid",
        path: "request.clientId",
        message: "Enter an id.",
      },
    ],
  },
  {
    problem: "a fee that does not exist",
    facts: { now: tuesday, busy: [] },
    request: { ...portraitOnFriday, feeIds: ["parking"] },
    errors: [
      {
        code: "quote.unknown-fee",
        path: "request.feeIds[0]",
        message: 'The fee "parking" does not exist.',
      },
    ],
  },
])("refuses $problem", ({ facts, request, errors }) => {
  expect(decideBooking({ settings: photographer, facts, request })).toEqual({
    ok: false,
    errors,
  });
});
