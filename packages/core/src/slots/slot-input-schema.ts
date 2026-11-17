import { z } from "zod";
import { requestedServicesSchema } from "../quotes/quote-request-schema.js";
import { settingsSchema } from "../settings/parse-settings.js";
import { isDateText, isInstantText } from "../time/time.js";

const instantMessage = "Use an exact moment such as 2026-11-21T15:00:00Z.";
const dateMessage = "Use a date such as 2026-11-21.";

const idSchema = z
  .string({ error: "Enter an id." })
  .min(1, { error: "Enter an id." });
const instantSchema = z
  .string({ error: instantMessage })
  .refine(isInstantText, { error: instantMessage });
const dateSchema = z
  .string({ error: dateMessage })
  .refine(isDateText, { error: dateMessage });

const busyTimeSchema = z.strictObject({
  resourceId: idSchema,
  start: instantSchema,
  end: instantSchema,
});

export const slotFactsSchema = z.strictObject({
  now: instantSchema,
  busy: z.array(busyTimeSchema),
});

export const listSlotsInputSchema = z.strictObject({
  settings: settingsSchema,
  facts: slotFactsSchema,
  request: z.strictObject({
    date: dateSchema,
    services: requestedServicesSchema,
    resourceId: idSchema.optional(),
  }),
});

export const checkSlotInputSchema = z.strictObject({
  settings: settingsSchema,
  facts: slotFactsSchema,
  request: z.strictObject({
    start: instantSchema,
    services: requestedServicesSchema,
    resourceId: idSchema.optional(),
  }),
});

export type SlotFacts = z.infer<typeof slotFactsSchema>;
export type BusyTime = z.infer<typeof busyTimeSchema>;
