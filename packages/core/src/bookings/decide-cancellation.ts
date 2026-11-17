import type { Reason, Result } from "../lib/result.js";
import { toProblems } from "../lib/zod-problems.js";
import { percentageOf } from "../money/money.js";
import { taxInside, type TaxLine } from "../quotes/calculate-tax.js";
import type { KeepRule } from "../settings/settings-schema.js";
import { addMinutes, toEpochMs } from "../time/time.js";
import { applyBookingAction } from "./apply-booking-action.js";
import {
  decideCancellationInputSchema,
  type Booking,
  type BookingEvent,
  type CancellationKind,
} from "./booking-schema.js";

export type CancellationMoney = {
  paidMinor: number;
  keptMinor: number;
  refundMinor: number;
  chargeMinor: number;
  taxInKept: TaxLine[];
};

export type Cancellation = {
  booking: Booking;
  money: CancellationMoney;
  reasons: Reason[];
  events: BookingEvent[];
};

type WhatIsKept = { keep: KeepRule | null; reason: Reason };

const reasonPath = "request.kind";

const decideWhatIsKept = (
  booking: Booking,
  kind: CancellationKind,
  nowMs: number,
): WhatIsKept => {
  if (booking.status === "pending") {
    return {
      keep: null,
      reason: {
        code: "cancellation.hold-released",
        path: reasonPath,
        message: "The time was only held and not paid, so nothing is kept.",
      },
    };
  }
  if (kind === "business-cancel") {
    return {
      keep: null,
      reason: {
        code: "cancellation.by-business",
        path: reasonPath,
        message:
          "The business cancelled, so the client gets back all they paid.",
      },
    };
  }
  if (kind === "no-show") {
    return {
      keep: booking.policy.noShowKeeps,
      reason: {
        code: "cancellation.no-show",
        path: reasonPath,
        message: "The client did not come, so the no-show rule applies.",
      },
    };
  }

  const { cancellation } = booking.policy;
  if (cancellation.kind === "non-refundable") {
    return {
      keep: { kind: "paid" },
      reason: {
        code: "cancellation.non-refundable",
        path: reasonPath,
        message: "The deposit is non-refundable, so the business keeps it.",
      },
    };
  }

  const noticeEndsMs = addMinutes(
    toEpochMs(booking.start),
    -cancellation.noticeHours * 60,
  );
  if (nowMs <= noticeEndsMs) {
    return {
      keep: null,
      reason: {
        code: "cancellation.in-time",
        path: reasonPath,
        message: `The client cancelled at least ${cancellation.noticeHours} hours before, so nothing is kept.`,
      },
    };
  }

  return {
    keep: cancellation.lateCancelKeeps,
    reason: {
      code: "cancellation.late",
      path: reasonPath,
      message: `The client cancelled less than ${cancellation.noticeHours} hours before, so the late rule applies.`,
    },
  };
};

const amountKept = (
  keep: KeepRule | null,
  booking: Booking,
  paidMinor: number,
): number => {
  if (keep === null) {
    return 0;
  }
  if (keep.kind === "paid") {
    return paidMinor;
  }
  if (keep.kind === "percentage") {
    return percentageOf(booking.totalMinor, keep.percent);
  }
  return Math.min(keep.amountMinor, booking.totalMinor);
};

export const decideCancellation = (input: unknown): Result<Cancellation> => {
  const parsed = decideCancellationInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toProblems(parsed.error.issues) };
  }

  const { settings, facts, request } = parsed.data;
  const { booking, kind } = request;

  const change = applyBookingAction({
    settings,
    facts: { now: facts.now },
    request: {
      booking,
      action: kind === "no-show" ? "mark-no-show" : "cancel",
    },
  });
  if (!change.ok) {
    return change;
  }

  const { keep, reason } = decideWhatIsKept(
    booking,
    kind,
    toEpochMs(facts.now),
  );
  const keptMinor = amountKept(keep, booking, facts.paidMinor);

  return {
    ok: true,
    value: {
      booking: change.value.booking,
      money: {
        paidMinor: facts.paidMinor,
        keptMinor,
        refundMinor: Math.max(facts.paidMinor - keptMinor, 0),
        chargeMinor: Math.max(keptMinor - facts.paidMinor, 0),
        taxInKept: keptMinor > 0 ? taxInside(settings.tax, keptMinor) : [],
      },
      reasons: [reason],
      events: change.value.events,
    },
  };
};
