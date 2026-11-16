import { expect, test } from "vitest";
import { operations, runOperation } from "./operations.js";

const lashStudio = {
  version: 1,
  businessId: "lash-by-nadia",
  currency: "USD",
  defaultDeposit: { kind: "none" },
  services: [
    {
      id: "lash-removal",
      name: "Lash removal",
      priceMinor: 2500,
      addOnIds: [],
    },
  ],
  addOns: [],
};

test("every operation has a different name and a summary", () => {
  const names = operations.map((operation) => operation.name);

  expect(new Set(names).size).toBe(names.length);
  expect(operations.every((operation) => operation.summary.length > 0)).toBe(
    true,
  );
});

test("runs an operation by its name", () => {
  const request = { services: [{ serviceId: "lash-removal", addOns: [] }] };
  const result = runOperation("quote.create", {
    settings: lashStudio,
    request,
  });

  expect(result).toMatchObject({
    ok: true,
    value: { currency: "USD", totalMinor: 2500 },
  });
});

test("refuses an operation that does not exist", () => {
  expect(runOperation("quote.delete", {})).toEqual({
    ok: false,
    errors: [
      {
        code: "operation.unknown",
        path: "",
        message: 'The operation "quote.delete" does not exist.',
      },
    ],
  });
});
