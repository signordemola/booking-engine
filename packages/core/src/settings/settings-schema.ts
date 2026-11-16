import { z } from "zod";

const amountMessage =
  "Enter the amount as a whole number of minor units, for example 12000 for 120.00.";
const percentMessage = "Enter a percentage above 0, up to 100.";
const quantityMessage = "Enter a whole number, 1 or more.";

const idSchema = z
  .string({ error: "Enter an id." })
  .min(1, { error: "Enter an id." });
const nameSchema = z
  .string({ error: "Enter a name." })
  .min(1, { error: "Enter a name." });
const amountMinorSchema = z
  .int({ error: amountMessage })
  .nonnegative({ error: amountMessage });

const depositRuleSchema = z.discriminatedUnion(
  "kind",
  [
    z.strictObject({ kind: z.literal("none") }),
    z.strictObject({
      kind: z.literal("percentage"),
      percent: z
        .number({ error: percentMessage })
        .gt(0, { error: percentMessage })
        .lte(100, { error: percentMessage }),
    }),
    z.strictObject({
      kind: z.literal("fixed"),
      amountMinor: amountMinorSchema,
    }),
    z.strictObject({ kind: z.literal("full") }),
  ],
  { error: "Choose a deposit kind: none, percentage, fixed or full." },
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
  maxQuantity: z
    .int({ error: quantityMessage })
    .min(1, { error: quantityMessage }),
});

const settingsShapeSchema = z.strictObject({
  version: z.literal(1, { error: "This engine reads settings version 1." }),
  businessId: idSchema,
  currency: z.string().regex(/^[A-Z]{3}$/, {
    error: "Use a 3-letter currency code in capitals, for example USD.",
  }),
  defaultDeposit: depositRuleSchema,
  services: z.array(serviceSchema),
  addOns: z.array(addOnSchema),
});

export type DepositRule = z.infer<typeof depositRuleSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type AddOn = z.infer<typeof addOnSchema>;
export type BusinessSettings = z.infer<typeof settingsShapeSchema>;

export type SettingsError = { path: string; message: string };

export type ParseSettingsResult =
  | { ok: true; value: BusinessSettings }
  | { ok: false; errors: SettingsError[] };

type Problem = { path: (string | number)[]; message: string };

const repeatedIds = (
  list: "services" | "addOns",
  items: readonly { id: string }[],
): Problem[] =>
  items.flatMap((item, index) =>
    items.findIndex((other) => other.id === item.id) < index
      ? [
          {
            path: [list, index, "id"],
            message: `The id "${item.id}" is used more than once. Each id must be different.`,
          },
        ]
      : [],
  );

const missingAddOns = (settings: BusinessSettings): Problem[] => {
  const addOnIds = new Set(settings.addOns.map((addOn) => addOn.id));
  return settings.services.flatMap((service, serviceIndex) =>
    service.addOnIds.flatMap((addOnId, addOnIndex) =>
      addOnIds.has(addOnId)
        ? []
        : [
            {
              path: ["services", serviceIndex, "addOnIds", addOnIndex],
              message: `"${service.name}" lists the add-on "${addOnId}", which does not exist.`,
            },
          ],
    ),
  );
};

const fixedDepositsAbovePrice = (settings: BusinessSettings): Problem[] =>
  settings.services.flatMap((service, index) => {
    if (
      service.deposit?.kind === "fixed" &&
      service.deposit.amountMinor > service.priceMinor
    ) {
      return [
        {
          path: ["services", index, "deposit"],
          message: `The fixed deposit of "${service.name}" is more than its price.`,
        },
      ];
    }
    if (
      service.deposit === undefined &&
      settings.defaultDeposit.kind === "fixed" &&
      settings.defaultDeposit.amountMinor > service.priceMinor
    ) {
      return [
        {
          path: ["services", index],
          message: `The default fixed deposit is more than the price of "${service.name}".`,
        },
      ];
    }
    return [];
  });

const settingsSchema = settingsShapeSchema.superRefine((settings, context) => {
  const problems = [
    ...repeatedIds("services", settings.services),
    ...repeatedIds("addOns", settings.addOns),
    ...missingAddOns(settings),
    ...fixedDepositsAbovePrice(settings),
  ];
  for (const problem of problems) {
    context.addIssue({
      code: "custom",
      path: problem.path,
      message: problem.message,
    });
  }
});

const pathText = (path: readonly PropertyKey[]) =>
  path.reduce<string>((text, part) => {
    if (typeof part === "number") return `${text}[${part}]`;
    return text === "" ? String(part) : `${text}.${String(part)}`;
  }, "");

const toSettingsErrors = (issue: z.core.$ZodIssue): SettingsError[] => {
  const path = pathText(issue.path);
  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((key) => ({
      path,
      message: `Remove the setting "${key}". This engine does not know it.`,
    }));
  }
  return [{ path, message: issue.message }];
};

export const parseSettings = (input: unknown): ParseSettingsResult => {
  const result = settingsSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, errors: result.error.issues.flatMap(toSettingsErrors) };
};
