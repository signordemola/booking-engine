import {
  isHoldOver,
  occupiesSlot,
  type Booking,
  type BookingStatus,
  type BusyTime,
} from "@booking-engine/core";
import type {
  BookingStore,
  SaveChangeResult,
  SaveNewResult,
} from "./booking-store.js";

const overlaps = (left: Booking, right: Booking) =>
  Date.parse(left.blockedStart) < Date.parse(right.blockedEnd) &&
  Date.parse(right.blockedStart) < Date.parse(left.blockedEnd);

export class InMemoryBookingStore implements BookingStore {
  readonly #bookingsByBusiness = new Map<string, Map<string, Booking>>();

  #bookingsOf(businessId: string): Map<string, Booking> {
    const bookings =
      this.#bookingsByBusiness.get(businessId) ?? new Map<string, Booking>();
    this.#bookingsByBusiness.set(businessId, bookings);
    return bookings;
  }

  async findBusyTimes(
    businessId: string,
    exceptBookingId?: string,
  ): Promise<BusyTime[]> {
    return [...this.#bookingsOf(businessId).values()]
      .filter((booking) => occupiesSlot(booking.status))
      .filter((booking) => booking.bookingId !== exceptBookingId)
      .map((booking) => ({
        resourceId: booking.resourceId,
        start: booking.blockedStart,
        end: booking.blockedEnd,
      }));
  }

  async expireHolds(businessId: string, now: string): Promise<Booking[]> {
    const bookings = this.#bookingsOf(businessId);
    const expired = [...bookings.values()]
      .filter((booking) => isHoldOver(booking, now))
      .map((booking): Booking => ({
        ...booking,
        status: "expired",
        holdExpiresAt: null,
      }));

    expired.forEach((booking) => bookings.set(booking.bookingId, booking));
    return expired;
  }

  async findBooking(
    businessId: string,
    bookingId: string,
  ): Promise<Booking | undefined> {
    return this.#bookingsOf(businessId).get(bookingId);
  }

  async saveNewBooking(booking: Booking): Promise<SaveNewResult> {
    const bookings = this.#bookingsOf(booking.businessId);
    const sameRequest = bookings.get(booking.bookingId);

    if (sameRequest) {
      return { kind: "repeated", booking: sameRequest };
    }

    const taken = [...bookings.values()].some(
      (other) =>
        other.resourceId === booking.resourceId &&
        occupiesSlot(other.status) &&
        overlaps(other, booking),
    );
    if (taken) {
      return { kind: "conflict" };
    }

    bookings.set(booking.bookingId, booking);
    return { kind: "saved", booking };
  }

  async saveBookingChange(
    booking: Booking,
    expectedStatus: BookingStatus,
  ): Promise<SaveChangeResult> {
    const bookings = this.#bookingsOf(booking.businessId);
    const stored = bookings.get(booking.bookingId);

    if (!stored || stored.status !== expectedStatus) {
      return { kind: "conflict" };
    }

    bookings.set(booking.bookingId, booking);
    return { kind: "saved" };
  }
}
