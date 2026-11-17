import {
  decideBooking,
  type Booking,
  type BookingEvent,
  type BookingRequest,
  type BusinessSettings,
  type Result,
} from "@booking-engine/core";
import type { BookingStore } from "./booking-store.js";

export type BookedSlot = {
  booking: Booking;
  events: BookingEvent[];
  repeated: boolean;
};

type BookSlotInput = {
  store: BookingStore;
  settings: BusinessSettings;
  now: string;
  request: BookingRequest;
};

export const bookSlot = async ({
  store,
  settings,
  now,
  request,
}: BookSlotInput): Promise<Result<BookedSlot>> => {
  const earlier = await store.findBooking(
    settings.businessId,
    request.bookingId,
  );
  if (earlier) {
    return {
      ok: true,
      value: { booking: earlier, events: [], repeated: true },
    };
  }

  const busy = await store.findBusyTimes(settings.businessId);
  const decision = decideBooking({ settings, facts: { now, busy }, request });
  if (!decision.ok) {
    return decision;
  }

  const saved = await store.saveNewBooking(decision.value.booking);

  if (saved.kind === "conflict") {
    return {
      ok: false,
      errors: [
        {
          code: "booking.slot-taken",
          path: "request.start",
          message:
            "Someone else booked this time a moment ago. Choose another time.",
        },
      ],
    };
  }
  if (saved.kind === "repeated") {
    return {
      ok: true,
      value: { booking: saved.booking, events: [], repeated: true },
    };
  }

  return {
    ok: true,
    value: {
      booking: saved.booking,
      events: decision.value.events,
      repeated: false,
    },
  };
};
