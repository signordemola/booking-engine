import {
  applyBookingAction,
  type BookingAction,
  type BookingChange,
  type BusinessSettings,
  type Result,
} from "@booking-engine/core";
import type { BookingStore } from "./booking-store.js";

type ChangeBookingInput = {
  store: BookingStore;
  settings: BusinessSettings;
  now: string;
  bookingId: string;
  action: BookingAction;
};

const refuse = (code: string, message: string): Result<BookingChange> => ({
  ok: false,
  errors: [{ code, path: "bookingId", message }],
});

export const changeBooking = async ({
  store,
  settings,
  now,
  bookingId,
  action,
}: ChangeBookingInput): Promise<Result<BookingChange>> => {
  const booking = await store.findBooking(settings.businessId, bookingId);
  if (!booking) {
    return refuse(
      "booking.not-found",
      `The booking "${bookingId}" does not exist.`,
    );
  }

  const change = applyBookingAction({
    settings,
    facts: { now },
    request: { booking, action },
  });
  if (!change.ok) {
    return change;
  }

  const saved = await store.saveBookingChange(
    change.value.booking,
    booking.status,
  );
  if (saved.kind === "conflict") {
    return refuse(
      "booking.changed-meanwhile",
      "This booking changed a moment ago. Load it again and retry.",
    );
  }

  return change;
};
