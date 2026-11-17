import { expect, test } from "vitest";
import { includedTaxOf, percentageOf } from "./money.js";

test.each([
  { amountMinor: 12000, percent: 25, expected: 3000 },
  { amountMinor: 1050, percent: 25, expected: 263 },
  { amountMinor: 12990, percent: 5, expected: 650 },
  { amountMinor: 12990, percent: 7, expected: 909 },
  { amountMinor: 10000, percent: 8.875, expected: 888 },
  { amountMinor: 3000, percent: 1.15, expected: 35 },
  { amountMinor: 12000, percent: 0, expected: 0 },
  { amountMinor: 12000, percent: 100, expected: 12000 },
  { amountMinor: 1, percent: 33, expected: 0 },
  { amountMinor: 0, percent: 25, expected: 0 },
])(
  "$percent% of $amountMinor is $expected",
  ({ amountMinor, percent, expected }) => {
    expect(percentageOf(amountMinor, percent)).toBe(expected);
  },
);

test.each([
  { amountWithTaxMinor: 27000, percent: 20, totalPercent: 20, expected: 4500 },
  { amountWithTaxMinor: 9500, percent: 20, totalPercent: 20, expected: 1583 },
  { amountWithTaxMinor: 12000, percent: 20, totalPercent: 20, expected: 2000 },
  {
    amountWithTaxMinor: 1000,
    percent: 13.5,
    totalPercent: 13.5,
    expected: 119,
  },
  { amountWithTaxMinor: 11500, percent: 5, totalPercent: 15, expected: 500 },
  { amountWithTaxMinor: 11500, percent: 10, totalPercent: 15, expected: 1000 },
  { amountWithTaxMinor: 0, percent: 20, totalPercent: 20, expected: 0 },
])(
  "a price of $amountWithTaxMinor that includes $totalPercent% tax holds $expected at $percent%",
  ({ amountWithTaxMinor, percent, totalPercent, expected }) => {
    expect(includedTaxOf(amountWithTaxMinor, percent, totalPercent)).toBe(
      expected,
    );
  },
);
