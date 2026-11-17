import { photographer } from "@booking-engine/core/testing";
import { expect, test } from "vitest";
import { bookSlot } from "./book-slot.js";
import { changeBooking } from "./change-booking.js";
import { InMemoryBookingStore } from "./in-memory-booking-store.js";

const tuesday = "2026-11-17T10:00:00Z";
const friday10 = "2026-11-20T10:00:00Z";

const portrait = (number: number) => ({
  bookingId: `booking-${number}`,
  clientId: `client-${number}`,
  start: friday10,
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

test("the date is held while the client pays, and confirmed when the retainer is paid", async () => {
  const store = await storeWithHeldPortrait();

  expect(
    (await store.findBooking(photographer.businessId, "booking-1"))?.status,
  ).toBe("pending");

  const paid = await changeBooking({
    store,
    settings: photographer,
    now: "2026-11-17T10:12:00Z",
    bookingId: "booking-1",
    action: "deposit-paid",
  });

  expect(paid).toMatchObject({
    ok: true,
    value: { events: [{ type: "booking.confirmed" }] },
  });
  expect(
    (await store.findBooking(photographer.businessId, "booking-1"))?.status,
  ).toBe("confirmed");
});

test("while a date is held, another client cannot take it", async () => {
  const store = await storeWithHeldPortrait();
  const second = await bookSlot({
    store,
    settings: photographer,
    now: "2026-11-17T10:05:00Z",
    request: portrait(2),
  });

  expect(second).toMatchObject({ ok: false, errors: [{ code: "slot.busy" }] });
});

test("when the hold runs out unpaid, the date is free for the next client", async () => {
  const store = await storeWithHeldPortrait();

  const expired = await changeBooking({
    store,
    settings: photographer,
    now: "2026-11-17T10:30:00Z",
    bookingId: "booking-1",
    action: "expire-hold",
  });
  const second = await bookSlot({
    store,
    settings: photographer,
    now: "2026-11-17T10:31:00Z",
    request: portrait(2),
  });

  expect(expired).toMatchObject({
    ok: true,
    value: { booking: { status: "expired" } },
  });
  expect(second).toMatchObject({
    ok: true,
    value: { booking: { bookingId: "booking-2" } },
  });
});

test("the payment and the end of the hold arrive at the same moment: only one wins", async () => {
  const store = await storeWithHeldPortrait();
  const change = (action: "deposit-paid" | "expire-hold") =>
    changeBooking({
      store,
      settings: photographer,
      now: "2026-11-17T10:30:00Z",
      bookingId: "booking-1",
      action,
    });

  const results = await Promise.all([
    change("deposit-paid"),
    change("expire-hold"),
  ]);
  const refusedCodes = results.flatMap((result) =>
    result.ok ? [] : result.errors.map((error) => error.code),
  );

  expect(results.filter((result) => result.ok).length).toBe(1);
  expect(refusedCodes).toEqual(["booking.changed-meanwhile"]);
});

test("a payment notice that arrives twice confirms the booking once", async () => {
  const store = await storeWithHeldPortrait();
  const confirm = () =>
    changeBooking({
      store,
      settings: photographer,
      now: "2026-11-17T10:12:00Z",
      bookingId: "booking-1",
      action: "deposit-paid",
    });

  const first = await confirm();
  const second = await confirm();

  expect(first.ok).toBe(true);
  expect(second).toMatchObject({
    ok: false,
    errors: [{ code: "booking.not-allowed-from-status" }],
  });
  expect(
    (await store.findBooking(photographer.businessId, "booking-1"))?.status,
  ).toBe("confirmed");
});

test("refuses a booking that does not exist", async () => {
  const store = new InMemoryBookingStore();
  const result = await changeBooking({
    store,
    settings: photographer,
    now: tuesday,
    bookingId: "booking-404",
    action: "cancel",
  });

  expect(result).toEqual({
    ok: false,
    errors: [
      {
        code: "booking.not-found",
        path: "bookingId",
        message: 'The booking "booking-404" does not exist.',
      },
    ],
  });
});
