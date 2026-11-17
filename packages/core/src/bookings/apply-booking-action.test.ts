import { expect, test } from "vitest";
import { photographer, salon } from "../testing/demo-businesses.js";
import { applyBookingAction } from "./apply-booking-action.js";
import {
  occupiesSlot,
  type Booking,
  type BookingStatus,
} from "./booking-schema.js";

const heldBooking: Booking = {
  businessId: "clara-monet-photography",
  bookingId: "booking-1001",
  clientId: "client-amelia",
  resourceId: "clara",
  status: "pending",
  start: "2026-11-20T10:00:00Z",
  end: "2026-11-20T11:30:00Z",
  blockedStart: "2026-11-20T09:30:00Z",
  blockedEnd: "2026-11-20T12:00:00Z",
  holdExpiresAt: "2026-11-17T10:30:00Z",
  createdAt: "2026-11-17T10:00:00Z",
  currency: "GBP",
  totalMinor: 25000,
  dueTodayMinor: 7500,
};

const withStatus = (status: BookingStatus): Booking => ({
  ...heldBooking,
  status,
  holdExpiresAt: status === "pending" ? heldBooking.holdExpiresAt : null,
});

const apply = (booking: Booking, action: string, now: string) =>
  applyBookingAction({
    settings: photographer,
    facts: { now },
    request: { booking, action },
  });

test("paying the retainer confirms the booking and ends the hold", () => {
  expect(apply(heldBooking, "deposit-paid", "2026-11-17T10:12:00Z")).toEqual({
    ok: true,
    value: {
      booking: { ...heldBooking, status: "confirmed", holdExpiresAt: null },
      events: [
        {
          type: "booking.confirmed",
          businessId: "clara-monet-photography",
          bookingId: "booking-1001",
          at: "2026-11-17T10:12:00Z",
        },
      ],
    },
  });
});

test.each([
  {
    from: "pending",
    action: "deposit-paid",
    now: "2026-11-17T10:12:00Z",
    to: "confirmed",
    event: "booking.confirmed",
  },
  {
    from: "pending",
    action: "expire-hold",
    now: "2026-11-17T10:30:00Z",
    to: "expired",
    event: "booking.expired",
  },
  {
    from: "pending",
    action: "cancel",
    now: "2026-11-17T10:05:00Z",
    to: "cancelled",
    event: "booking.cancelled",
  },
  {
    from: "confirmed",
    action: "cancel",
    now: "2026-11-18T09:00:00Z",
    to: "cancelled",
    event: "booking.cancelled",
  },
  {
    from: "confirmed",
    action: "complete",
    now: "2026-11-20T11:30:00Z",
    to: "completed",
    event: "booking.completed",
  },
  {
    from: "confirmed",
    action: "mark-no-show",
    now: "2026-11-20T10:00:00Z",
    to: "no-show",
    event: "booking.no-show",
  },
] satisfies {
  from: BookingStatus;
  action: string;
  now: string;
  to: BookingStatus;
  event: string;
}[])(
  "a $from booking with the action $action becomes $to",
  ({ from, action, now, to, event }) => {
    expect(apply(withStatus(from), action, now)).toMatchObject({
      ok: true,
      value: {
        booking: { status: to, holdExpiresAt: null },
        events: [{ type: event, at: now }],
      },
    });
  },
);

test.each([
  {
    problem: "a hold that has not run out",
    from: "pending",
    action: "expire-hold",
    now: "2026-11-17T10:29:00Z",
    code: "booking.hold-still-active",
    message: "The hold has not run out yet.",
  },
  {
    problem: "completing an appointment that has not ended",
    from: "confirmed",
    action: "complete",
    now: "2026-11-20T11:29:00Z",
    code: "booking.not-ended",
    message: "The appointment has not ended yet.",
  },
  {
    problem: "a no-show before the appointment starts",
    from: "confirmed",
    action: "mark-no-show",
    now: "2026-11-20T09:59:00Z",
    code: "booking.not-started",
    message: "The appointment has not started yet.",
  },
  {
    problem: "a retainer paid after the hold ran out and the booking expired",
    from: "expired",
    action: "deposit-paid",
    now: "2026-11-17T10:45:00Z",
    code: "booking.not-allowed-from-status",
    message: 'A booking that is expired cannot take the action "deposit-paid".',
  },
  {
    problem: "cancelling a booking twice",
    from: "cancelled",
    action: "cancel",
    now: "2026-11-18T09:00:00Z",
    code: "booking.not-allowed-from-status",
    message: 'A booking that is cancelled cannot take the action "cancel".',
  },
  {
    problem: "completing a booking that was never confirmed",
    from: "pending",
    action: "complete",
    now: "2026-11-20T12:00:00Z",
    code: "booking.not-allowed-from-status",
    message: 'A booking that is pending cannot take the action "complete".',
  },
] satisfies {
  problem: string;
  from: BookingStatus;
  action: string;
  now: string;
  code: string;
  message: string;
}[])("refuses $problem", ({ from, action, now, code, message }) => {
  expect(apply(withStatus(from), action, now)).toEqual({
    ok: false,
    errors: [{ code, path: "request.action", message }],
  });
});

test("refuses an action that does not exist", () => {
  expect(apply(heldBooking, "delete", "2026-11-17T10:12:00Z")).toEqual({
    ok: false,
    errors: [
      {
        code: "input.invalid",
        path: "request.action",
        message:
          "Choose an action: deposit-paid, expire-hold, cancel, complete or mark-no-show.",
      },
    ],
  });
});

test("refuses a booking that belongs to another business", () => {
  const result = applyBookingAction({
    settings: salon,
    facts: { now: "2026-11-17T10:12:00Z" },
    request: { booking: heldBooking, action: "deposit-paid" },
  });

  expect(result).toEqual({
    ok: false,
    errors: [
      {
        code: "booking.other-business",
        path: "request.booking.businessId",
        message: "This booking belongs to another business.",
      },
    ],
  });
});

test.each([
  { status: "pending", occupies: true },
  { status: "confirmed", occupies: true },
  { status: "completed", occupies: true },
  { status: "no-show", occupies: true },
  { status: "cancelled", occupies: false },
  { status: "expired", occupies: false },
] satisfies { status: BookingStatus; occupies: boolean }[])(
  "a $status booking keeps its time: $occupies",
  ({ status, occupies }) => {
    expect(occupiesSlot(status)).toBe(occupies);
  },
);
