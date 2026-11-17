import type { Booking, BookingStatus, BusyTime } from "@booking-engine/core";

export type SaveNewResult =
  | { kind: "saved"; booking: Booking }
  | { kind: "repeated"; booking: Booking }
  | { kind: "conflict" };

export type SaveChangeResult = { kind: "saved" } | { kind: "conflict" };

export interface BookingStore {
  findBusyTimes(businessId: string): Promise<BusyTime[]>;
  findBooking(
    businessId: string,
    bookingId: string,
  ): Promise<Booking | undefined>;
  saveNewBooking(booking: Booking): Promise<SaveNewResult>;
  saveBookingChange(
    booking: Booking,
    expectedStatus: BookingStatus,
  ): Promise<SaveChangeResult>;
}
