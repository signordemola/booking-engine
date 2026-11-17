import {
  decideReschedule,
  type BusinessSettings,
  type ClientFacts,
  type Reschedule,
  type Result,
} from "@booking-engine/core";
import type { BookingStore } from "./booking-store.js";

type RescheduleBookingInput = {
  store: BookingStore;
  settings: BusinessSettings;
  now: string;
  client?: ClientFacts;
  bookingId: string;
  start: string;
};

const refuse = (code: string, message: string): Result<Reschedule> => ({
  ok: false,
  errors: [{ code, path: "bookingId", message }],
});

export const rescheduleBooking = async ({
  store,
  settings,
  now,
  client,
  bookingId,
  start,
}: RescheduleBookingInput): Promise<Result<Reschedule>> => {
  const booking = await store.findBooking(settings.businessId, bookingId);
  if (!booking) {
    return refuse(
      "booking.not-found",
      `The booking "${bookingId}" does not exist.`,
    );
  }

  await store.expireHolds(settings.businessId, now);
  const busy = await store.findBusyTimes(settings.businessId, bookingId);
  const reschedule = decideReschedule({
    settings,
    facts: { now, busy, client },
    request: { booking, start },
  });
  if (!reschedule.ok) {
    return reschedule;
  }

  const saved = await store.saveBookingChange(
    reschedule.value.booking,
    booking.status,
  );
  if (saved.kind === "conflict") {
    return refuse(
      "booking.slot-taken",
      "Someone else booked this time a moment ago, or the booking changed. Load it again and choose a time.",
    );
  }

  return reschedule;
};
