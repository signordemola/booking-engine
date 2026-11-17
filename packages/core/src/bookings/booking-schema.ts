import { z } from "zod";
import { requestedServicesSchema } from "../quotes/quote-request-schema.js";
import { settingsSchema } from "../settings/parse-settings.js";
import { slotFactsSchema } from "../slots/slot-input-schema.js";
import { isInstantText } from "../time/time.js";

const instantMessage = "Use an exact moment such as 2026-11-21T15:00:00Z.";
const amountMessage = "Enter the amount as a whole number of minor units.";
const actionMessage =
  "Choose an action: deposit-paid, expire-hold, cancel, complete or mark-no-show.";

const idSchema = z
  .string({ error: "Enter an id." })
  .min(1, { error: "Enter an id." });
const instantSchema = z
  .string({ error: instantMessage })
  .refine(isInstantText, { error: instantMessage });
const amountMinorSchema = z
  .int({ error: amountMessage })
  .nonnegative({ error: amountMessage });

export const bookingStatuses = [
  "pending",
  "confirmed",
  "completed",
  "no-show",
  "cancelled",
  "expired",
] as const;

export const bookingActions = [
  "deposit-paid",
  "expire-hold",
  "cancel",
  "complete",
  "mark-no-show",
] as const;

export const bookingSchema = z.strictObject({
  businessId: idSchema,
  bookingId: idSchema,
  clientId: idSchema,
  resourceId: idSchema,
  status: z.enum(bookingStatuses),
  start: instantSchema,
  end: instantSchema,
  blockedStart: instantSchema,
  blockedEnd: instantSchema,
  holdExpiresAt: instantSchema.nullable(),
  createdAt: instantSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  totalMinor: amountMinorSchema,
  dueTodayMinor: amountMinorSchema,
});

export const decideBookingInputSchema = z.strictObject({
  settings: settingsSchema,
  facts: slotFactsSchema,
  request: z.strictObject({
    bookingId: idSchema,
    clientId: idSchema,
    start: instantSchema,
    services: requestedServicesSchema,
    feeIds: z.array(idSchema).default([]),
    resourceId: idSchema.optional(),
  }),
});

export const applyBookingActionInputSchema = z.strictObject({
  settings: settingsSchema,
  facts: z.strictObject({ now: instantSchema }),
  request: z.strictObject({
    booking: bookingSchema,
    action: z.enum(bookingActions, { error: actionMessage }),
  }),
});

export type Booking = z.infer<typeof bookingSchema>;
export type BookingStatus = (typeof bookingStatuses)[number];
export type BookingAction = (typeof bookingActions)[number];

export type BookingEvent = {
  type:
    | "booking.held"
    | "booking.confirmed"
    | "booking.expired"
    | "booking.cancelled"
    | "booking.completed"
    | "booking.no-show";
  businessId: string;
  bookingId: string;
  at: string;
};

export const occupiesSlot = (status: BookingStatus): boolean =>
  status !== "cancelled" && status !== "expired";
