import type { Result } from "../lib/result.js";
import { findRequestedItems } from "../quotes/find-requested-items.js";
import type { QuoteRequest } from "../quotes/quote-request-schema.js";
import type {
  BusinessSettings,
  Resource,
} from "../settings/settings-schema.js";
import { toEpochMs } from "../time/time.js";
import { findBookingShape } from "./booking-shape.js";
import { groupBusyTimes } from "./busy-times.js";
import type { SlotContext } from "./find-blockers.js";
import type { SlotFacts } from "./slot-input-schema.js";

export type PreparedSlots = { context: SlotContext; resources: Resource[] };

export const prepareSlotContext = (
  settings: BusinessSettings,
  facts: SlotFacts,
  request: {
    services: QuoteRequest["services"];
    resourceId?: string | undefined;
  },
): Result<PreparedSlots> => {
  const requested = findRequestedItems(settings, {
    services: request.services,
    feeIds: [],
  });
  if (!requested.ok) {
    return requested;
  }

  const shape = findBookingShape(
    settings,
    requested.value.services,
    request.resourceId,
  );
  if (!shape.ok) {
    return shape;
  }

  return {
    ok: true,
    value: {
      resources: shape.value.resources,
      context: {
        settings,
        nowMs: toEpochMs(facts.now),
        durationMinutes: shape.value.durationMinutes,
        gaps: shape.value.gaps,
        busyTimes: groupBusyTimes(facts.busy),
      },
    },
  };
};
