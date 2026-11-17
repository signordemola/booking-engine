import {
  listSlots,
  type BusinessSettings,
  type ClientFacts,
  type Result,
  type SlotList,
  type SlotRequest,
} from "@booking-engine/core";
import type { BookingStore } from "./booking-store.js";

type FindFreeSlotsInput = {
  store: BookingStore;
  settings: BusinessSettings;
  now: string;
  client?: ClientFacts;
  request: SlotRequest;
  ownBookingId?: string;
};

export const findFreeSlots = async ({
  store,
  settings,
  now,
  client,
  request,
  ownBookingId,
}: FindFreeSlotsInput): Promise<Result<SlotList>> => {
  await store.expireHolds(settings.businessId, now);
  const busy = await store.findBusyTimes(settings.businessId, ownBookingId);

  return listSlots({ settings, facts: { now, busy, client }, request });
};
