import type { Problem, Result } from "../lib/result.js";
import { toProblems } from "../lib/zod-problems.js";
import { createQuote, type Quote } from "../quotes/create-quote.js";
import { findConsentFindings } from "../rules/apply-rules.js";
import { findBlockers } from "../slots/find-blockers.js";
import { prepareSlotContext } from "../slots/prepare-slot-context.js";
import { addMinutes, toEpochMs, toInstantText } from "../time/time.js";
import {
  decideBookingInputSchema,
  type Booking,
  type BookingEvent,
} from "./booking-schema.js";

export type BookingDecision = {
  booking: Booking;
  quote: Quote;
  events: BookingEvent[];
};

export const decideBooking = (input: unknown): Result<BookingDecision> => {
  const parsed = decideBookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toProblems(parsed.error.issues) };
  }

  const { settings, facts, request } = parsed.data;
  const prepared = prepareSlotContext(settings, facts, request);
  if (!prepared.ok) {
    return prepared;
  }

  const { context, resources } = prepared.value;
  const startMs = toEpochMs(request.start);
  const blockersOfEach = resources.map((resource) =>
    findBlockers(context, resource, startMs),
  );
  const freeResource = resources.find(
    (_, index) => blockersOfEach[index]?.length === 0,
  );

  if (!freeResource) {
    const allBlockers = blockersOfEach.flat();
    const errors: Problem[] = allBlockers
      .filter(
        (blocker, index) =>
          allBlockers.findIndex((other) => other.code === blocker.code) ===
          index,
      )
      .map((blocker) => ({ ...blocker, path: "request.start" }));
    return { ok: false, errors };
  }

  const serviceIds = request.services.map((service) => service.serviceId);
  const consentFindings = findConsentFindings(
    settings,
    serviceIds,
    facts.client,
  );
  if (consentFindings.length > 0) {
    return {
      ok: false,
      errors: consentFindings.map((finding) => ({
        ...finding,
        path: "request.services",
      })),
    };
  }

  const quote = createQuote({
    settings,
    facts: { client: facts.client },
    request: {
      services: request.services,
      feeIds: request.feeIds,
      resourceId: freeResource.id,
    },
  });
  if (!quote.ok) {
    return quote;
  }

  const endMs = addMinutes(startMs, context.durationMinutes);
  const needsPaymentToday = quote.value.dueToday.totalMinor > 0;
  const now = toInstantText(context.nowMs);

  const booking: Booking = {
    businessId: settings.businessId,
    bookingId: request.bookingId,
    clientId: request.clientId,
    resourceId: freeResource.id,
    status: needsPaymentToday ? "pending" : "confirmed",
    start: toInstantText(startMs),
    end: toInstantText(endMs),
    blockedStart: toInstantText(
      addMinutes(startMs, -context.gaps.beforeMinutes),
    ),
    blockedEnd: toInstantText(addMinutes(endMs, context.gaps.afterMinutes)),
    holdExpiresAt: needsPaymentToday
      ? toInstantText(addMinutes(context.nowMs, settings.schedule.holdMinutes))
      : null,
    createdAt: now,
    currency: quote.value.currency,
    totalMinor: quote.value.totalMinor,
    dueTodayMinor: quote.value.dueToday.totalMinor,
    services: request.services,
    moveCount: 0,
    policy: settings.policy,
  };

  return {
    ok: true,
    value: {
      booking,
      quote: quote.value,
      events: [
        {
          type: needsPaymentToday ? "booking.held" : "booking.confirmed",
          businessId: booking.businessId,
          bookingId: booking.bookingId,
          at: now,
        },
      ],
    },
  };
};
