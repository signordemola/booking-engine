import type { z } from "zod";
import type { Result } from "./lib/result.js";
import { createQuote, createQuoteInputSchema } from "./quotes/create-quote.js";
import { parseSettings, settingsSchema } from "./settings/parse-settings.js";
import { checkSlot } from "./slots/check-slot.js";
import { listSlots } from "./slots/list-slots.js";
import {
  checkSlotInputSchema,
  listSlotsInputSchema,
} from "./slots/slot-input-schema.js";

export type Operation = {
  name: string;
  summary: string;
  inputSchema: z.ZodType;
  run: (input: unknown) => Result<unknown>;
};

export const operations: Operation[] = [
  {
    name: "settings.check",
    summary:
      "Check a business's settings and list every problem in plain words.",
    inputSchema: settingsSchema,
    run: parseSettings,
  },
  {
    name: "quote.create",
    summary:
      "Price what a client picked: line items, tax, the amount due today and the balance.",
    inputSchema: createQuoteInputSchema,
    run: createQuote,
  },
  {
    name: "slots.list",
    summary:
      "List the free start times on one date for the services a client picked.",
    inputSchema: listSlotsInputSchema,
    run: listSlots,
  },
  {
    name: "slots.check",
    summary:
      "Say if one start time is free, and give the reasons when it is not.",
    inputSchema: checkSlotInputSchema,
    run: checkSlot,
  },
];

export const runOperation = (name: string, input: unknown): Result<unknown> => {
  const operation = operations.find((item) => item.name === name);

  if (!operation) {
    return {
      ok: false,
      errors: [
        {
          code: "operation.unknown",
          path: "",
          message: `The operation "${name}" does not exist.`,
        },
      ],
    };
  }

  return operation.run(input);
};
