import { z } from "zod";

const amountMessage =
  "Enter the amount as a whole number of minor units, for example 12000 for 120.00.";
const percentMessage = "Enter a percentage above 0, up to 100.";
const wholeNumberMessage = "Enter a whole number, 1 or more.";
const currencyMessage =
  "Use a 3-letter currency code in capitals, for example USD.";
const priceKindMessage = "Choose a price kind: fixed or hourly.";
const depositKindMessage =
  "Choose a deposit kind: none, percentage, fixed or full.";
const feeDueMessage = "Choose when the fee is due: today or later.";
const taxKindMessage = "Choose a tax kind: none, added or included.";
const taxTimingMessage =
  "Choose when tax is paid: with-each-payment or with-balance.";
const taxRatesMessage = "Add at least one tax rate.";

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
const wholeNumberSchema = z
  .int({ error: wholeNumberMessage })
  .min(1, { error: wholeNumberMessage });

const fixedPriceSchema = z.strictObject({
  kind: z.literal("fixed"),
  amountMinor: amountMinorSchema,
});
const hourlyPriceSchema = z.strictObject({
  kind: z.literal("hourly"),
  hourlyMinor: amountMinorSchema,
  minHours: wholeNumberSchema,
  maxHours: wholeNumberSchema,
});
const priceSchema = z.discriminatedUnion(
  "kind",
  [fixedPriceSchema, hourlyPriceSchema],
  {
    error: priceKindMessage,
  },
);

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
  price: priceSchema,
  deposit: depositRuleSchema.optional(),
  addOnIds: z.array(idSchema),
});

const addOnSchema = z.strictObject({
  id: idSchema,
  name: nameSchema,
  priceMinor: amountMinorSchema,
  maxQuantity: wholeNumberSchema,
});

const feeSchema = z.strictObject({
  id: idSchema,
  name: nameSchema,
  amountMinor: amountMinorSchema,
  due: z.enum(["today", "later"], { error: feeDueMessage }),
});

const taxRateSchema = z.strictObject({
  id: idSchema,
  name: nameSchema,
  percent: percentSchema,
});
const taxRatesSchema = z
  .array(taxRateSchema)
  .min(1, { error: taxRatesMessage });
const taxTimingSchema = z.enum(["with-each-payment", "with-balance"], {
  error: taxTimingMessage,
});
const noTaxSchema = z.strictObject({ kind: z.literal("none") });
const addedTaxSchema = z.strictObject({
  kind: z.literal("added"),
  rates: taxRatesSchema,
  timing: taxTimingSchema,
});
const includedTaxSchema = z.strictObject({
  kind: z.literal("included"),
  rates: taxRatesSchema,
  timing: taxTimingSchema,
});
const taxSchema = z.discriminatedUnion(
  "kind",
  [noTaxSchema, addedTaxSchema, includedTaxSchema],
  {
    error: taxKindMessage,
  },
);

export const settingsShapeSchema = z.strictObject({
  version: z.literal(1, { error: "This engine reads settings version 1." }),
  businessId: idSchema,
  currency: z.string().regex(/^[A-Z]{3}$/, { error: currencyMessage }),
  tax: taxSchema,
  defaultDeposit: depositRuleSchema,
  services: z.array(serviceSchema),
  addOns: z.array(addOnSchema),
  fees: z.array(feeSchema),
});

export type Price = z.infer<typeof priceSchema>;
export type DepositRule = z.infer<typeof depositRuleSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type AddOn = z.infer<typeof addOnSchema>;
export type Fee = z.infer<typeof feeSchema>;
export type TaxRate = z.infer<typeof taxRateSchema>;
export type TaxSettings = z.infer<typeof taxSchema>;
export type BusinessSettings = z.infer<typeof settingsShapeSchema>;
