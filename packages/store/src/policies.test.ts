import {
  hireStudio as hireStudioWithRules,
  lashStudio,
} from "@booking-engine/core/testing";
import { expect, test } from "vitest";
import { bookSlot } from "./book-slot.js";
import { cancelBooking } from "./cancel-booking.js";
import { changeBooking } from "./change-booking.js";
import { InMemoryBookingStore } from "./in-memory-booking-store.js";
import { rescheduleBooking } from "./reschedule-booking.js";

const tuesdayMorning = "2026-11-17T15:00:00Z";
const hireStudio = { ...hireStudioWithRules, rules: [] };
const patchTestOnTuesdayAt11 = {
  visits: [],
  prerequisites: [
    { ruleId: "patch-test-for-lashes", at: "2026-11-17T16:00:00Z" },
  ],
  consents: [],
};

const confirmedHire = async (
  store: InMemoryBookingStore,
  number: number,
  start: string,
) => {
  const bookingId = `booking-${number}`;
  await bookSlot({
    store,
    settings: hireStudio,
    now: tuesdayMorning,
    request: {
      bookingId,
      clientId: `client-${number}`,
      start,
      services: [{ serviceId: "daylight-studio", hours: 2, addOns: [] }],
    },
  });
  await changeBooking({
    store,
    settings: hireStudio,
    now: tuesdayMorning,
    bookingId,
    action: "deposit-paid",
  });
  return bookingId;
};

test("the homepage booking end to end: held, paid, moved once, a second move refused, cancelled with the deposit kept", async () => {
  const store = new InMemoryBookingStore();
  const settings = lashStudio;
  const client = patchTestOnTuesdayAt11;

  const held = await bookSlot({
    store,
    settings,
    now: tuesdayMorning,
    client,
    request: {
      bookingId: "booking-1",
      clientId: "client-maya",
      start: "2026-11-21T16:00:00Z",
      services: [
        {
          serviceId: "hybrid-full-set",
          addOns: [{ addOnId: "lash-bath", quantity: 1 }],
        },
      ],
    },
  });
  const paid = await changeBooking({
    store,
    settings,
    now: "2026-11-17T15:05:00Z",
    bookingId: "booking-1",
    action: "deposit-paid",
  });
  const firstMove = await rescheduleBooking({
    store,
    settings,
    now: "2026-11-17T16:00:00Z",
    client,
    bookingId: "booking-1",
    start: "2026-11-20T19:00:00Z",
  });
  const secondMove = await rescheduleBooking({
    store,
    settings,
    now: "2026-11-17T17:00:00Z",
    client,
    bookingId: "booking-1",
    start: "2026-11-21T16:00:00Z",
  });
  const cancelled = await cancelBooking({
    store,
    settings,
    now: "2026-11-18T15:00:00Z",
    paidMinor: 3000,
    bookingId: "booking-1",
    kind: "client-cancel",
  });

  expect(held).toMatchObject({
    ok: true,
    value: { booking: { status: "pending", totalMinor: 13000 } },
  });
  expect(paid).toMatchObject({
    ok: true,
    value: { booking: { status: "confirmed" } },
  });
  expect(firstMove).toMatchObject({
    ok: true,
    value: { booking: { start: "2026-11-20T19:00:00Z", moveCount: 1 } },
  });
  expect(secondMove).toMatchObject({
    ok: false,
    errors: [{ code: "reschedule.limit-reached" }],
  });
  expect(cancelled).toMatchObject({
    ok: true,
    value: {
      booking: { status: "cancelled", start: "2026-11-20T19:00:00Z" },
      money: { keptMinor: 3000, refundMinor: 0, chargeMinor: 0 },
    },
  });
  expect(await store.findBusyTimes(settings.businessId)).toEqual([]);
});

test("a booking can move to a time that overlaps its own old time", async () => {
  const store = new InMemoryBookingStore();
  const bookingId = await confirmedHire(store, 1, "2026-11-21T15:00:00Z");

  const moved = await rescheduleBooking({
    store,
    settings: hireStudio,
    now: tuesdayMorning,
    bookingId,
    start: "2026-11-21T16:00:00Z",
  });

  expect(moved).toMatchObject({
    ok: true,
    value: { booking: { start: "2026-11-21T16:00:00Z" } },
  });
  expect(await store.findBusyTimes(hireStudio.businessId)).toEqual([
    {
      resourceId: "daylight-room",
      start: "2026-11-21T16:00:00Z",
      end: "2026-11-21T18:30:00Z",
    },
  ]);
});

test("two clients move into the same free time at the same moment: exactly one gets it", async () => {
  const store = new InMemoryBookingStore();
  const first = await confirmedHire(store, 1, "2026-11-21T15:00:00Z");
  const second = await confirmedHire(store, 2, "2026-11-21T19:00:00Z");

  const results = await Promise.all(
    [first, second].map((bookingId) =>
      rescheduleBooking({
        store,
        settings: hireStudio,
        now: tuesdayMorning,
        bookingId,
        start: "2026-11-22T15:00:00Z",
      }),
    ),
  );
  const refusedCodes = results.flatMap((result) =>
    result.ok ? [] : result.errors.map((error) => error.code),
  );
  const busyOnSunday = (
    await store.findBusyTimes(hireStudio.businessId)
  ).filter((busy) => busy.start.startsWith("2026-11-22"));

  expect(results.filter((result) => result.ok).length).toBe(1);
  expect(refusedCodes).toEqual(["booking.slot-taken"]);
  expect(busyOnSunday.length).toBe(1);
});

test("cancelling a booking that does not exist is refused", async () => {
  const store = new InMemoryBookingStore();
  const result = await cancelBooking({
    store,
    settings: hireStudio,
    now: tuesdayMorning,
    paidMinor: 0,
    bookingId: "booking-404",
    kind: "client-cancel",
  });

  expect(result).toMatchObject({
    ok: false,
    errors: [{ code: "booking.not-found" }],
  });
});
