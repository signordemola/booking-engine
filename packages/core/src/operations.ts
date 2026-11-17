import type { z } from "zod";
import type { Result } from "./lib/result.js";
import { createQuote, createQuoteInputSchema } from "./quotes/create-quote.js";
import { parseSettings, settingsSchema } from "./settings/parse-settings.js";

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
      "Price the services and add-ons a client picked: line items and a total.",
    inputSchema: createQuoteInputSchema,
    run: createQuote,
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
