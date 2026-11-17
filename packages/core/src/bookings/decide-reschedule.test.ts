import { expect, test } from "vitest";
import { lashStudio, salon } from "../testing/demo-businesses.js";
import type { Booking } from "./booking-schema.js";
import { decideReschedule } from "./decide-reschedule.js";

const tuesdayMorning = "2026-11-17T15:00:00Z";
const patchTestOnTuesdayAt11 = {
  visits: [],
  prerequisites: [
    { ruleId: "patch-test-for-lashes", at: "2026-11-17T16:00:00Z" },
  ],
  consents: [],
};

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

const moveTo = (
  start: string,
  booking: Booking,
  now = tuesdayMorning,
  busy: unknown[] = [],
) =>
  decideReschedule({
    settings: lashStudio,
    facts: { now, busy, client: patchTestOnTuesdayAt11 },
    request: { booking, start },
  });

test("the homepage booking moves once: Saturday 11:00 to Friday 14:00, same price, move count 1", () => {
  const result = moveTo("2026-11-20T19:00:00Z", fullSetOnSaturday());

  expect(result).toEqual({
    ok: true,
    value: {
      booking: fullSetOnSaturday({
        start: "2026-11-20T19:00:00Z",
        end: "2026-11-20T21:45:00Z",
        blockedStart: "2026-11-20T19:00:00Z",
        blockedEnd: "2026-11-20T22:00:00Z",
        moveCount: 1,
      }),
      events: [
        {
          type: "booking.moved",
          businessId: "lash-by-nadia",
          bookingId: "booking-2001",
          at: tuesdayMorning,
        },
      ],
    },
  });
});

test("a second move is refused: the policy says it moves once", () => {
  const movedOnce = fullSetOnSaturday({ moveCount: 1 });
  const result = moveTo("2026-11-20T19:00:00Z", movedOnce);

  expect(result).toEqual({
    ok: false,
    errors: [
      {
        code: "reschedule.limit-reached",
        path: "request.booking.moveCount",
        message: "This booking can move 1 time(s), and it has moved 1.",
      },
    ],
  });
});

test("a move 47 hours before the start is refused: the notice is 48 hours", () => {
  const result = moveTo(
    "2026-11-28T16:00:00Z",
    fullSetOnSaturday(),
    "2026-11-19T17:00:00Z",
  );

  expect(result).toMatchObject({
    ok: false,
    errors: [
      {
        code: "reschedule.too-late",
        message: "A booking can move only up to 48 hours before it starts.",
      },
    ],
  });
});

test("a move exactly 48 hours before the start is allowed", () => {
  const result = moveTo(
    "2026-11-28T16:00:00Z",
    fullSetOnSaturday(),
    "2026-11-19T16:00:00Z",
  );

  expect(result).toMatchObject({
    ok: true,
    value: { booking: { start: "2026-11-28T16:00:00Z", moveCount: 1 } },
  });
});

test("the new time must be free", () => {
  const otherClient = {
    resourceId: "nadia",
    start: "2026-11-20T20:00:00Z",
    end: "2026-11-20T21:00:00Z",
  };
  const result = moveTo(
    "2026-11-20T19:00:00Z",
    fullSetOnSaturday(),
    tuesdayMorning,
    [otherClient],
  );

  expect(result).toMatchObject({
    ok: false,
    errors: [{ code: "slot.busy", path: "request.start" }],
  });
});

test("the patch test rule still applies: a move to the day after the patch test is refused", () => {
  const result = moveTo("2026-11-18T19:00:00Z", fullSetOnSaturday());

  expect(result).toMatchObject({
    ok: false,
    errors: [{ code: "rule.prerequisite-too-recent" }],
  });
});

test("a held booking cannot move until it is confirmed", () => {
  const held = fullSetOnSaturday({
    status: "pending",
    holdExpiresAt: "2026-11-17T15:15:00Z",
  });
  const result = moveTo("2026-11-20T19:00:00Z", held);

  expect(result).toMatchObject({
    ok: false,
    errors: [{ code: "booking.not-allowed-from-status" }],
  });
});

test("a salon booking moves twice, and a third move is refused", () => {
  const balayage = fullSetOnSaturday({
    businessId: "atelier-rosa",
    resourceId: "camille",
    services: [{ serviceId: "balayage", addOns: [] }],
    moveCount: 2,
    policy: salon.policy,
  });
  const result = decideReschedule({
    settings: salon,
    facts: { now: tuesdayMorning, busy: [] },
    request: { booking: balayage, start: "2026-11-27T15:00:00Z" },
  });

  expect(result).toMatchObject({
    ok: false,
    errors: [
      {
        code: "reschedule.limit-reached",
        message: "This booking can move 2 time(s), and it has moved 2.",
      },
    ],
  });
});

test("a booking from another business is refused", () => {
  const result = decideReschedule({
    settings: salon,
    facts: { now: tuesdayMorning, busy: [] },
    request: { booking: fullSetOnSaturday(), start: "2026-11-20T19:00:00Z" },
  });

  expect(result).toMatchObject({
    ok: false,
    errors: [{ code: "booking.other-business" }],
  });
});

test("a booking stays with its stylist: a time when Camille is busy is refused, even though Noah is free", () => {
  const fringeWithCamille = fullSetOnSaturday({
    businessId: "atelier-rosa",
    resourceId: "camille",
    start: "2026-11-27T14:00:00Z",
    end: "2026-11-27T14:15:00Z",
    blockedStart: "2026-11-27T14:00:00Z",
    blockedEnd: "2026-11-27T14:25:00Z",
    services: [{ serviceId: "fringe-trim", addOns: [] }],
    policy: salon.policy,
  });
  const camilleBusy = {
    resourceId: "camille",
    start: "2026-11-27T16:00:00Z",
    end: "2026-11-27T16:30:00Z",
  };
  const result = decideReschedule({
    settings: salon,
    facts: { now: tuesdayMorning, busy: [camilleBusy] },
    request: { booking: fringeWithCamille, start: "2026-11-27T16:00:00Z" },
  });

  expect(result).toMatchObject({
    ok: false,
    errors: [{ code: "slot.busy" }],
  });
});
