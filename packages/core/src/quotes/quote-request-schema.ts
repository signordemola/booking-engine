import { z } from "zod";

const wholeNumberMessage = "Enter a whole number, 1 or more.";

const idSchema = z
  .string({ error: "Enter an id." })
  .min(1, { error: "Enter an id." });
const wholeNumberSchema = z
  .int({ error: wholeNumberMessage })
  .min(1, { error: wholeNumberMessage });

const requestedAddOnSchema = z.strictObject({
  addOnId: idSchema,
  quantity: wholeNumberSchema,
});

const requestedServiceSchema = z.strictObject({
  serviceId: idSchema,
  hours: wholeNumberSchema.optional(),
  addOns: z.array(requestedAddOnSchema),
});

export const requestedServicesSchema = z
  .array(requestedServiceSchema)
  .min(1, { error: "Choose at least one service." });

export const quoteRequestSchema = z.strictObject({
  services: requestedServicesSchema,
  feeIds: z.array(idSchema).default([]),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type RequestedServiceInput = QuoteRequest["services"][number];
