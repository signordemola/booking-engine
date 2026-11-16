import { z } from "zod";

const quantityMessage = "Enter a whole number, 1 or more.";

const idSchema = z
  .string({ error: "Enter an id." })
  .min(1, { error: "Enter an id." });
const quantitySchema = z
  .int({ error: quantityMessage })
  .min(1, { error: quantityMessage });

const requestedAddOnSchema = z.strictObject({
  addOnId: idSchema,
  quantity: quantitySchema,
});

const requestedServiceSchema = z.strictObject({
  serviceId: idSchema,
  addOns: z.array(requestedAddOnSchema),
});

export const quoteRequestSchema = z.strictObject({
  services: z
    .array(requestedServiceSchema)
    .min(1, { error: "Choose at least one service." }),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
