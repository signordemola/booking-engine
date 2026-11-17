import type { Problem, Result } from "../lib/result.js";
import { toProblems } from "../lib/zod-problems.js";
import { checkSlot } from "../slots/check-slot.js";
import { addMinutes, toEpochMs, toInstantText } from "../time/time.js";
import {
  decideRescheduleInputSchema,
  type Booking,
  type BookingEvent,
} from "./booking-schema.js";

export type Reschedule = { booking: Booking; events: BookingEvent[] };

const refuse = (
  code: string,
  path: string,
  message: string,
): Result<Reschedule> => ({
  ok: false,
  errors: [{ code, path, message } satisfies Problem],
});

export const decideReschedule = (input: unknown): Result<Reschedule> => {
  const parsed = decideRescheduleInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toProblems(parsed.error.issues) };
  }

  const { settings, facts, request } = parsed.data;
  const { booking } = request;
  const { maxMoves, noticeHours } = booking.policy.reschedule;
  const nowMs = toEpochMs(facts.now);

  if (booking.businessId !== settings.businessId) {
    return refuse(
      "booking.other-business",
      "request.booking.businessId",
      "This booking belongs to another business.",
    );
  }
  if (booking.status !== "confirmed") {
    return refuse(
      "booking.not-allowed-from-status",
      "request.booking.status",
      `A booking that is ${booking.status} cannot move. Only a confirmed booking can move.`,
    );
  }
  if (booking.moveCount >= maxMoves) {
    return refuse(
      "reschedule.limit-reached",
      "request.booking.moveCount",
      `This booking can move ${maxMoves} time(s), and it has moved ${booking.moveCount}.`,
    );
  }
  if (addMinutes(nowMs, noticeHours * 60) > toEpochMs(booking.start)) {
    return refuse(
      "reschedule.too-late",
      "request.start",
      `A booking can move only up to ${noticeHours} hours before it starts.`,
    );
  }

  const check = checkSlot({
    settings,
    facts,
    request: {
      start: request.start,
      services: booking.services,
      resourceId: booking.resourceId,
    },
  });
  if (!check.ok) {
    return check;
  }
  if (!check.value.available) {
    return { ok: false, errors: check.value.reasons };
  }

  const shiftMs = toEpochMs(request.start) - toEpochMs(booking.start);
  const shifted = (instant: string) =>
    toInstantText(toEpochMs(instant) + shiftMs);

  return {
    ok: true,
    value: {
      booking: {
        ...booking,
        start: shifted(booking.start),
        end: shifted(booking.end),
        blockedStart: shifted(booking.blockedStart),
        blockedEnd: shifted(booking.blockedEnd),
        moveCount: booking.moveCount + 1,
      },
      events: [
        {
          type: "booking.moved",
          businessId: booking.businessId,
          bookingId: booking.bookingId,
          at: toInstantText(nowMs),
        },
      ],
    },
  };
};
