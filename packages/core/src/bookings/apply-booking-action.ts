import type { Problem, Result } from "../lib/result.js";
import { toProblems } from "../lib/zod-problems.js";
import { toEpochMs, toInstantText } from "../time/time.js";
import {
  applyBookingActionInputSchema,
  type Booking,
  type BookingAction,
  type BookingEvent,
  type BookingStatus,
} from "./booking-schema.js";

export type BookingChange = { booking: Booking; events: BookingEvent[] };

type Transition = {
  from: BookingStatus[];
  to: BookingStatus;
  event: BookingEvent["type"];
};

const transitions: Record<BookingAction, Transition> = {
  "deposit-paid": {
    from: ["pending"],
    to: "confirmed",
    event: "booking.confirmed",
  },
  "expire-hold": { from: ["pending"], to: "expired", event: "booking.expired" },
  cancel: {
    from: ["pending", "confirmed"],
    to: "cancelled",
    event: "booking.cancelled",
  },
  complete: {
    from: ["confirmed"],
    to: "completed",
    event: "booking.completed",
  },
  "mark-no-show": {
    from: ["confirmed"],
    to: "no-show",
    event: "booking.no-show",
  },
};

const refuse = (
  code: string,
  path: string,
  message: string,
): Result<BookingChange> => ({
  ok: false,
  errors: [{ code, path, message } satisfies Problem],
});

const findTimingProblem = (
  booking: Booking,
  action: BookingAction,
  nowMs: number,
): { code: string; message: string } | undefined => {
  if (
    action === "expire-hold" &&
    booking.holdExpiresAt &&
    nowMs < toEpochMs(booking.holdExpiresAt)
  ) {
    return {
      code: "booking.hold-still-active",
      message: "The hold has not run out yet.",
    };
  }
  if (action === "complete" && nowMs < toEpochMs(booking.end)) {
    return {
      code: "booking.not-ended",
      message: "The appointment has not ended yet.",
    };
  }
  if (action === "mark-no-show" && nowMs < toEpochMs(booking.start)) {
    return {
      code: "booking.not-started",
      message: "The appointment has not started yet.",
    };
  }
  return undefined;
};

export const applyBookingAction = (input: unknown): Result<BookingChange> => {
  const parsed = applyBookingActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toProblems(parsed.error.issues) };
  }

  const { settings, facts, request } = parsed.data;
  const { booking, action } = request;
  const transition = transitions[action];
  const nowMs = toEpochMs(facts.now);

  if (booking.businessId !== settings.businessId) {
    return refuse(
      "booking.other-business",
      "request.booking.businessId",
      "This booking belongs to another business.",
    );
  }

  if (!transition.from.includes(booking.status)) {
    return refuse(
      "booking.not-allowed-from-status",
      "request.action",
      `A booking that is ${booking.status} cannot take the action "${action}".`,
    );
  }

  const timingProblem = findTimingProblem(booking, action, nowMs);
  if (timingProblem) {
    return refuse(timingProblem.code, "request.action", timingProblem.message);
  }

  return {
    ok: true,
    value: {
      booking: { ...booking, status: transition.to, holdExpiresAt: null },
      events: [
        {
          type: transition.event,
          businessId: booking.businessId,
          bookingId: booking.bookingId,
          at: toInstantText(nowMs),
        },
      ],
    },
  };
};
