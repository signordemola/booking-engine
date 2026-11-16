import { expect, test } from "vitest";
import { percentageOf } from "./money.js";

test.each([
  { amountMinor: 12000, percent: 25, expected: 3000 },
  { amountMinor: 1050, percent: 25, expected: 263 },
  { amountMinor: 12990, percent: 5, expected: 650 },
  { amountMinor: 12990, percent: 7, expected: 909 },
  { amountMinor: 10000, percent: 8.875, expected: 888 },
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
  { amountMinor: 10.5, percent: 25 },
  { amountMinor: -100, percent: 25 },
  { amountMinor: Number.NaN, percent: 25 },
  { amountMinor: 12000, percent: -1 },
  { amountMinor: 12000, percent: 101 },
  { amountMinor: 12000, percent: Number.NaN },
  { amountMinor: Number.MAX_SAFE_INTEGER, percent: 50 },
])(
  "rejects amount $amountMinor with percent $percent",
  ({ amountMinor, percent }) => {
    expect(() => percentageOf(amountMinor, percent)).toThrow(RangeError);
  },
);
