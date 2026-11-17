import type { Booking } from "@booking-engine/core";
import { hireStudio, photographer } from "@booking-engine/core/testing";
import { expect, test } from "vitest";
import { bookSlot } from "./book-slot.js";
import { InMemoryBookingStore } from "./in-memory-booking-store.js";

const tuesday = "2026-11-17T15:00:00Z";

const hireRequest = (number: number, start: string, hours: number) => ({
  bookingId: `booking-${number}`,
  clientId: `client-${number}`,
  start,
  services: [{ serviceId: "daylight-studio", hours, addOns: [] }],
});

const savedBookingsOf = async (
  store: InMemoryBookingStore,
  businessId: string,
) => store.findBusyTimes(businessId);

test("a booking is saved, and its time becomes busy with its gap", async () => {
  const store = new InMemoryBookingStore();
  const request = hireRequest(1, "2026-11-21T10:00:00-05:00", 4);
  const result = await bookSlot({
    store,
    settings: hireStudio,
    now: tuesday,
    request,
  });

  expect(result).toMatchObject({
    ok: true,
    value: {
      booking: {
        bookingId: "booking-1",
        status: "pending",
        resourceId: "daylight-room",
      },
      events: [{ type: "booking.held" }],
      repeated: false,
    },
  });
  expect(await store.findBusyTimes("northlight-studio")).toEqual([
    {
      resourceId: "daylight-room",
      start: "2026-11-21T15:00:00Z",
      end: "2026-11-21T19:30:00Z",
    },
  ]);
});

test("20 clients ask for the same time at the same moment: exactly 1 gets it", async () => {
  const store = new InMemoryBookingStore();
  const requests = Array.from({ length: 20 }, (_, index) =>
    bookSlot({
      store,
      settings: hireStudio,
      now: tuesday,
      request: hireRequest(index, "2026-11-21T10:00:00-05:00", 4),
    }),
  );

  const outcomes = await Promise.allSettled(requests);
  const results = outcomes.map((outcome) => {
    if (outcome.status === "rejected") throw new Error("a request crashed");
    return outcome.value;
  });
  const refusedCodes = results.flatMap((result) =>
    result.ok ? [] : result.errors.map((error) => error.code),
  );

  expect(results.filter((result) => result.ok).length).toBe(1);
  expect(refusedCodes).toEqual(
    Array.from({ length: 19 }, () => "booking.slot-taken"),
  );
  expect((await savedBookingsOf(store, "northlight-studio")).length).toBe(1);
});

test("many clients ask for overlapping times at once: no two saved bookings overlap", async () => {
  const store = new InMemoryBookingStore();
  const startHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const requests = Array.from({ length: 40 }, (_, index) => {
    const hour = String(startHours[index % startHours.length]).padStart(2, "0");
    return bookSlot({
      store,
      settings: hireStudio,
      now: tuesday,
      request: hireRequest(index, `2026-11-21T${hour}:00:00-05:00`, 2),
    });
  });

  const results = await Promise.all(requests);
  const saved = results.flatMap((result) =>
    result.ok ? [result.value.booking] : [],
  );
  const overlap = (left: Booking, right: Booking) =>
    Date.parse(left.blockedStart) < Date.parse(right.blockedEnd) &&
    Date.parse(right.blockedStart) < Date.parse(left.blockedEnd);
  const overlappingPairs = saved.flatMap((left, index) =>
    saved.slice(index + 1).filter((right) => overlap(left, right)),
  );

  expect(saved.length).toBeGreaterThan(1);
  expect(overlappingPairs).toEqual([]);
});

test("a retry with the same booking id returns the first booking and makes no second one", async () => {
  const store = new InMemoryBookingStore();
  const request = hireRequest(1, "2026-11-21T10:00:00-05:00", 4);

  const first = await bookSlot({
    store,
    settings: hireStudio,
    now: tuesday,
    request,
  });
  const retry = await bookSlot({
    store,
    settings: hireStudio,
    now: tuesday,
    request,
  });

  expect(retry).toMatchObject({
    ok: true,
    value: { repeated: true, events: [] },
  });
  expect(retry.ok && first.ok && retry.value.booking).toEqual(
    first.ok && first.value.booking,
  );
  expect((await savedBookingsOf(store, "northlight-studio")).length).toBe(1);
});

test("a double click sends the same request twice at once: 1 booking, and both get it back", async () => {
  const store = new InMemoryBookingStore();
  const request = hireRequest(1, "2026-11-21T10:00:00-05:00", 4);

  const [first, second] = await Promise.all([
    bookSlot({ store, settings: hireStudio, now: tuesday, request }),
    bookSlot({ store, settings: hireStudio, now: tuesday, request }),
  ]);

  expect(first.ok && second.ok).toBe(true);
  expect(
    [first, second].filter((result) => result.ok && result.value.repeated)
      .length,
  ).toBe(1);
  expect((await savedBookingsOf(store, "northlight-studio")).length).toBe(1);
});

test("two businesses never see each other's bookings, even with the same ids", async () => {
  const store = new InMemoryBookingStore();
  const otherStudio = { ...hireStudio, businessId: "harbour-studio" };
  const request = hireRequest(1, "2026-11-21T10:00:00-05:00", 4);

  const first = await bookSlot({
    store,
    settings: hireStudio,
    now: tuesday,
    request,
  });
  const second = await bookSlot({
    store,
    settings: otherStudio,
    now: tuesday,
    request,
  });

  expect(first.ok && second.ok).toBe(true);
  expect(second).toMatchObject({ ok: true, value: { repeated: false } });
  expect((await store.findBusyTimes("northlight-studio")).length).toBe(1);
  expect((await store.findBusyTimes("harbour-studio")).length).toBe(1);
  expect(
    await store.findBooking("clara-monet-photography", "booking-1"),
  ).toBeUndefined();
  expect((await store.findBusyTimes(photographer.businessId)).length).toBe(0);
});

test("a time the engine refuses is not saved", async () => {
  const store = new InMemoryBookingStore();
  const request = hireRequest(1, "2026-11-21T07:00:00-05:00", 2);
  const result = await bookSlot({
    store,
    settings: hireStudio,
    now: tuesday,
    request,
  });

  expect(result).toMatchObject({
    ok: false,
    errors: [{ code: "slot.outside-hours" }],
  });
  expect((await savedBookingsOf(store, "northlight-studio")).length).toBe(0);
});
