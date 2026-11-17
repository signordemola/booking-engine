import { photographer } from "@booking-engine/core/testing";
import { expect, test } from "vitest";
import { bookSlot } from "./book-slot.js";
import { changeBooking } from "./change-booking.js";
import { findFreeSlots } from "./find-free-slots.js";
import { InMemoryBookingStore } from "./in-memory-booking-store.js";

const tuesday = "2026-11-17T10:00:00Z";
const friday = {
  date: "2026-11-20",
  services: [{ serviceId: "portrait-session", addOns: [] }],
};

const portrait = (number: number) => ({
  bookingId: `booking-${number}`,
  clientId: `client-${number}`,
  start: "2026-11-20T10:00:00Z",
  services: [{ serviceId: "portrait-session", addOns: [] }],
});

const storeWithHeldPortrait = async () => {
  const store = new InMemoryBookingStore();
  await bookSlot({
    store,
    settings: photographer,
    now: tuesday,
    request: portrait(1),
  });
  return store;
};

const localStartsAt = async (
  store: InMemoryBookingStore,
  now: string,
  ownBookingId?: string,
) => {
  const result = await findFreeSlots({
    store,
    settings: photographer,
    now,
    request: friday,
    ...(ownBookingId === undefined ? {} : { ownBookingId }),
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value.slots.map((slot) => slot.localStart);
};

test("a time is held for 30 minutes after a client picks it", async () => {
  const store = await storeWithHeldPortrait();
  const booking = await store.findBooking(photographer.businessId, "booking-1");

  expect(booking).toMatchObject({
    status: "pending",
    holdExpiresAt: "2026-11-17T10:30:00Z",
  });
});

test("other clients do not see a held time, or the times its gaps block", async () => {
  const store = await storeWithHeldPortrait();
  const starts = await localStartsAt(store, "2026-11-17T10:05:00Z");

  expect(starts).not.toContain("10:00");
  expect(starts.slice(0, 2)).toEqual(["12:30", "13:00"]);
});

test("the client who holds a time still sees it when they go back to the calendar", async () => {
  const store = await storeWithHeldPortrait();
  const starts = await localStartsAt(
    store,
    "2026-11-17T10:05:00Z",
    "booking-1",
  );

  expect(starts).toContain("10:00");
  expect(starts[0]).toBe("09:30");
});

test("one minute before the hold runs out, another client still cannot take the time", async () => {
  const store = await storeWithHeldPortrait();
  const second = await bookSlot({
    store,
    settings: photographer,
    now: "2026-11-17T10:29:00Z",
    request: portrait(2),
  });

  expect(second).toMatchObject({ ok: false, errors: [{ code: "slot.busy" }] });
});

test("when the hold runs out, the time is free again with no clean-up job", async () => {
  const store = await storeWithHeldPortrait();

  expect(await localStartsAt(store, "2026-11-17T10:30:00Z")).toContain("10:00");

  const second = await bookSlot({
    store,
    settings: photographer,
    now: "2026-11-17T10:31:00Z",
    request: portrait(2),
  });

  expect(second).toMatchObject({
    ok: true,
    value: { booking: { bookingId: "booking-2" } },
  });
  expect(
    (await store.findBooking(photographer.businessId, "booking-1"))?.status,
  ).toBe("expired");
});

test("a new booking alone is enough to release a hold that ran out", async () => {
  const store = await storeWithHeldPortrait();
  const second = await bookSlot({
    store,
    settings: photographer,
    now: "2026-11-17T10:30:00Z",
    request: portrait(2),
  });

  expect(second).toMatchObject({
    ok: true,
    value: { booking: { status: "pending" } },
  });
});

test("a payment that arrives after the hold ran out does not confirm the booking", async () => {
  const store = await storeWithHeldPortrait();
  await store.expireHolds(photographer.businessId, "2026-11-17T10:30:00Z");

  const paid = await changeBooking({
    store,
    settings: photographer,
    now: "2026-11-17T10:31:00Z",
    bookingId: "booking-1",
    action: "deposit-paid",
  });

  expect(paid).toMatchObject({
    ok: false,
    errors: [{ code: "booking.not-allowed-from-status" }],
  });
});

test("a paid booking never runs out", async () => {
  const store = await storeWithHeldPortrait();
  await changeBooking({
    store,
    settings: photographer,
    now: "2026-11-17T10:12:00Z",
    bookingId: "booking-1",
    action: "deposit-paid",
  });

  const expired = await store.expireHolds(
    photographer.businessId,
    "2026-11-19T10:00:00Z",
  );

  expect(expired).toEqual([]);
  expect(
    (await store.findBooking(photographer.businessId, "booking-1"))?.status,
  ).toBe("confirmed");
});

test("a client who picks another time lets go of the first one", async () => {
  const store = await storeWithHeldPortrait();
  await changeBooking({
    store,
    settings: photographer,
    now: "2026-11-17T10:05:00Z",
    bookingId: "booking-1",
    action: "cancel",
  });

  expect(await localStartsAt(store, "2026-11-17T10:06:00Z")).toContain("10:00");
});
