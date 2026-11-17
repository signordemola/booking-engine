import { z } from "zod";
import { isClockTime, isDateText, isTimeZone, weekdays } from "../time/time.js";

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
const minutesMessage = "Enter a whole number of minutes, 0 or more.";
const timeZoneMessage =
  "Use a time zone name such as Europe/London or America/Toronto.";
const clockTimeMessage = "Use a 24-hour time such as 09:00 or 17:30.";
const closingTimeMessage =
  "Use a 24-hour time such as 17:30, or 24:00 for midnight.";
const dateMessage = "Use a date such as 2026-12-25.";

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

const minutesSchema = z
  .int({ error: minutesMessage })
  .nonnegative({ error: minutesMessage });
const clockTimeSchema = z
  .string({ error: clockTimeMessage })
  .refine(isClockTime, {
    error: clockTimeMessage,
  });
const closingTimeSchema = z
  .string({ error: closingTimeMessage })
  .refine((text) => text === "24:00" || isClockTime(text), {
    error: closingTimeMessage,
  });
const dateSchema = z
  .string({ error: dateMessage })
  .refine(isDateText, { error: dateMessage });

const levelPriceSchema = z.strictObject({
  levelId: idSchema,
  amountMinor: amountMinorSchema,
});

const fixedPriceSchema = z.strictObject({
  kind: z.literal("fixed"),
  amountMinor: amountMinorSchema,
  durationMinutes: wholeNumberSchema,
  levelPrices: z.array(levelPriceSchema).optional(),
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

const gapsSchema = z.strictObject({
  beforeMinutes: minutesSchema,
  afterMinutes: minutesSchema,
});

const serviceSchema = z.strictObject({
  id: idSchema,
  name: nameSchema,
  price: priceSchema,
  deposit: depositRuleSchema.optional(),
  gaps: gapsSchema.optional(),
  addOnIds: z.array(idSchema),
});

const addOnSchema = z.strictObject({
  id: idSchema,
  name: nameSchema,
  priceMinor: amountMinorSchema,
  extraMinutes: minutesSchema,
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

const openWindowSchema = z.strictObject({
  start: clockTimeSchema,
  end: closingTimeSchema,
});
const openWindowsSchema = z.array(openWindowSchema);
const weeklyHoursSchema = z.strictObject({
  monday: openWindowsSchema,
  tuesday: openWindowsSchema,
  wednesday: openWindowsSchema,
  thursday: openWindowsSchema,
  friday: openWindowsSchema,
  saturday: openWindowsSchema,
  sunday: openWindowsSchema,
});

const levelSchema = z.strictObject({ id: idSchema, name: nameSchema });

const resourceSchema = z.strictObject({
  id: idSchema,
  name: nameSchema,
  levelId: idSchema.optional(),
  serviceIds: z.array(idSchema),
  hours: weeklyHoursSchema,
});

const closureSchema = z.strictObject({
  from: dateSchema,
  to: dateSchema,
  reason: nameSchema,
});

const ruleKindMessage =
  "Choose a rule kind: prerequisite, consent, book-alone, fill-window or new-client-deposit.";

const prerequisiteRuleSchema = z.strictObject({
  kind: z.literal("prerequisite"),
  id: idSchema,
  name: nameSchema,
  serviceIds: z.array(idSchema),
  minHoursBefore: minutesSchema,
  validDays: wholeNumberSchema,
});
const consentRuleSchema = z.strictObject({
  kind: z.literal("consent"),
  id: idSchema,
  name: nameSchema,
  serviceIds: z.array(idSchema),
  formVersion: nameSchema,
});
const bookAloneRuleSchema = z.strictObject({
  kind: z.literal("book-alone"),
  id: idSchema,
  serviceIds: z.array(idSchema),
});
const fillWindowRuleSchema = z.strictObject({
  kind: z.literal("fill-window"),
  id: idSchema,
  fillServiceId: idSchema,
  fullSetServiceId: idSchema,
  maxDays: wholeNumberSchema,
});
const newClientDepositRuleSchema = z.strictObject({
  kind: z.literal("new-client-deposit"),
  id: idSchema,
  deposit: depositRuleSchema,
});
const ruleSchema = z.discriminatedUnion(
  "kind",
  [
    prerequisiteRuleSchema,
    consentRuleSchema,
    bookAloneRuleSchema,
    fillWindowRuleSchema,
    newClientDepositRuleSchema,
  ],
  { error: ruleKindMessage },
);

const countMessage = "Enter a whole number, 0 or more.";
const countSchema = z
  .int({ error: countMessage })
  .nonnegative({ error: countMessage });
const keepKindMessage = "Choose what is kept: paid, percentage or fixed.";
const cancellationKindMessage =
  "Choose a cancellation kind: non-refundable or notice.";

const keepRuleSchema = z.discriminatedUnion(
  "kind",
  [
    z.strictObject({ kind: z.literal("paid") }),
    z.strictObject({ kind: z.literal("percentage"), percent: percentSchema }),
    z.strictObject({
      kind: z.literal("fixed"),
      amountMinor: amountMinorSchema,
    }),
  ],
  { error: keepKindMessage },
);
const cancellationSchema = z.discriminatedUnion(
  "kind",
  [
    z.strictObject({ kind: z.literal("non-refundable") }),
    z.strictObject({
      kind: z.literal("notice"),
      noticeHours: countSchema,
      lateCancelKeeps: keepRuleSchema,
    }),
  ],
  { error: cancellationKindMessage },
);
export const policySchema = z.strictObject({
  cancellation: cancellationSchema,
  noShowKeeps: keepRuleSchema,
  reschedule: z.strictObject({
    noticeHours: countSchema,
    maxMoves: countSchema,
  }),
});

const scheduleSchema = z.strictObject({
  slotStepMinutes: wholeNumberSchema,
  minNoticeMinutes: minutesSchema,
  maxAdvanceDays: wholeNumberSchema,
  holdMinutes: wholeNumberSchema,
  gaps: gapsSchema,
});

export const settingsShapeSchema = z.strictObject({
  version: z.literal(1, { error: "This engine reads settings version 1." }),
  businessId: idSchema,
  currency: z.string().regex(/^[A-Z]{3}$/, { error: currencyMessage }),
  timeZone: z
    .string({ error: timeZoneMessage })
    .refine(isTimeZone, { error: timeZoneMessage }),
  tax: taxSchema,
  defaultDeposit: depositRuleSchema,
  services: z.array(serviceSchema),
  addOns: z.array(addOnSchema),
  fees: z.array(feeSchema),
  schedule: scheduleSchema,
  levels: z.array(levelSchema),
  resources: z.array(resourceSchema),
  closures: z.array(closureSchema),
  rules: z.array(ruleSchema),
  policy: policySchema,
});

export { weekdays };

export type Price = z.infer<typeof priceSchema>;
export type DepositRule = z.infer<typeof depositRuleSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type AddOn = z.infer<typeof addOnSchema>;
export type Fee = z.infer<typeof feeSchema>;
export type TaxRate = z.infer<typeof taxRateSchema>;
export type TaxSettings = z.infer<typeof taxSchema>;
export type Gaps = z.infer<typeof gapsSchema>;
export type OpenWindow = z.infer<typeof openWindowSchema>;
export type Resource = z.infer<typeof resourceSchema>;
export type Closure = z.infer<typeof closureSchema>;
export type Level = z.infer<typeof levelSchema>;
export type Rule = z.infer<typeof ruleSchema>;
export type PrerequisiteRule = z.infer<typeof prerequisiteRuleSchema>;
export type ConsentRule = z.infer<typeof consentRuleSchema>;
export type FillWindowRule = z.infer<typeof fillWindowRuleSchema>;
export type KeepRule = z.infer<typeof keepRuleSchema>;
export type Policy = z.infer<typeof policySchema>;
export type BusinessSettings = z.infer<typeof settingsShapeSchema>;
