import {
  decideCancellation,
  type BusinessSettings,
  type Cancellation,
  type CancellationKind,
  type Result,
} from "@booking-engine/core";
import type { BookingStore } from "./booking-store.js";

type CancelBookingInput = {
  store: BookingStore;
  settings: BusinessSettings;
  now: string;
  paidMinor: number;
  bookingId: string;
  kind: CancellationKind;
};

const refuse = (code: string, message: string): Result<Cancellation> => ({
  ok: false,
  errors: [{ code, path: "bookingId", message }],
});

export const cancelBooking = async ({
  store,
  settings,
  now,
  paidMinor,
  bookingId,
  kind,
}: CancelBookingInput): Promise<Result<Cancellation>> => {
  const booking = await store.findBooking(settings.businessId, bookingId);
  if (!booking) {
    return refuse(
      "booking.not-found",
      `The booking "${bookingId}" does not exist.`,
    );
  }

  const cancellation = decideCancellation({
    settings,
    facts: { now, paidMinor },
    request: { booking, kind },
  });
  if (!cancellation.ok) {
    return cancellation;
  }

  const saved = await store.saveBookingChange(
    cancellation.value.booking,
    booking.status,
  );
  if (saved.kind === "conflict") {
    return refuse(
      "booking.changed-meanwhile",
      "This booking changed a moment ago. Load it again and retry.",
    );
  }

  return cancellation;
};
