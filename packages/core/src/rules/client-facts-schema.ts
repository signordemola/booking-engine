import { z } from "zod";
import { isInstantText } from "../time/time.js";

const instantMessage = "Use an exact moment such as 2026-11-21T15:00:00Z.";

const idSchema = z
  .string({ error: "Enter an id." })
  .min(1, { error: "Enter an id." });
const instantSchema = z
  .string({ error: instantMessage })
  .refine(isInstantText, { error: instantMessage });

export const clientFactsSchema = z.strictObject({
  visits: z.array(z.strictObject({ serviceId: idSchema, at: instantSchema })),
  prerequisites: z.array(
    z.strictObject({ ruleId: idSchema, at: instantSchema }),
  ),
  consents: z.array(
    z.strictObject({
      ruleId: idSchema,
      formVersion: z.string(),
      signedAt: instantSchema,
    }),
  ),
});

export type ClientFacts = z.infer<typeof clientFactsSchema>;
