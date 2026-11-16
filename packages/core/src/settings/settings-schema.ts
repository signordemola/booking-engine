import { z } from "zod";

const amountMessage =
  "Enter the amount as a whole number of minor units, for example 12000 for 120.00.";
const percentMessage = "Enter a percentage above 0, up to 100.";
const quantityMessage = "Enter a whole number, 1 or more.";
const currencyMessage =
  "Use a 3-letter currency code in capitals, for example USD.";
const depositKindMessage =
  "Choose a deposit kind: none, percentage, fixed or full.";

const idSchema = z
  .string({ error: "Enter an id." })
  .min(1, { error: "Enter an id." });
const nameSchema = z
  .string({ error: "Enter a name." })
  .min(1, { error: "Enter a name." });
const amountMinorSchema = z
  .int({ error: amountMessage })
  .nonnegative({ error: amountMessage });
const percentSchema = z
  .number({ error: percentMessage })
  .gt(0, { error: percentMessage })
  .lte(100, { error: percentMessage });
const quantitySchema = z
  .int({ error: quantityMessage })
  .min(1, { error: quantityMessage });

const noDepositSchema = z.strictObject({ kind: z.literal("none") });
const percentageDepositSchema = z.strictObject({
  kind: z.literal("percentage"),
  percent: percentSchema,
});
const fixedDepositSchema = z.strictObject({
  kind: z.literal("fixed"),
  amountMinor: amountMinorSchema,
});
const fullDepositSchema = z.strictObject({ kind: z.literal("full") });

const depositRuleSchema = z.discriminatedUnion(
  "kind",
  [
    noDepositSchema,
    percentageDepositSchema,
    fixedDepositSchema,
    fullDepositSchema,
  ],
  { error: depositKindMessage },
);

const serviceSchema = z.strictObject({
  id: idSchema,
  name: nameSchema,
  priceMinor: amountMinorSchema,
  deposit: depositRuleSchema.optional(),
  addOnIds: z.array(idSchema),
});

const addOnSchema = z.strictObject({
  id: idSchema,
  name: nameSchema,
  priceMinor: amountMinorSchema,
  maxQuantity: quantitySchema,
});

export const settingsShapeSchema = z.strictObject({
  version: z.literal(1, { error: "This engine reads settings version 1." }),
  businessId: idSchema,
  currency: z.string().regex(/^[A-Z]{3}$/, { error: currencyMessage }),
  defaultDeposit: depositRuleSchema,
  services: z.array(serviceSchema),
  addOns: z.array(addOnSchema),
});

export type DepositRule = z.infer<typeof depositRuleSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type AddOn = z.infer<typeof addOnSchema>;
export type BusinessSettings = z.infer<typeof settingsShapeSchema>;
