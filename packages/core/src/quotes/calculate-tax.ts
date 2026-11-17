import { includedTaxOf, percentageOf } from "../money/money.js";
import type { TaxSettings } from "../settings/settings-schema.js";

export type TaxLine = {
  taxId: string;
  name: string;
  percent: number;
  amountMinor: number;
};

export type TaxSplit = {
  pricesIncludeTax: boolean;
  taxLines: TaxLine[];
  taxMinor: number;
  taxDueTodayMinor: number;
};

const sumOf = (amounts: number[]) =>
  amounts.reduce((sum, amount) => sum + amount, 0);

export const calculateTax = (
  tax: TaxSettings,
  subtotalMinor: number,
  dueTodayBeforeTaxMinor: number,
): TaxSplit => {
  if (tax.kind === "none") {
    return {
      pricesIncludeTax: false,
      taxLines: [],
      taxMinor: 0,
      taxDueTodayMinor: 0,
    };
  }

  const totalPercent = sumOf(tax.rates.map((rate) => rate.percent));
  const taxOf = (amountMinor: number, percent: number) =>
    tax.kind === "added"
      ? percentageOf(amountMinor, percent)
      : includedTaxOf(amountMinor, percent, totalPercent);

  const taxLines = tax.rates.map((rate) => ({
    taxId: rate.id,
    name: rate.name,
    percent: rate.percent,
    amountMinor: taxOf(subtotalMinor, rate.percent),
  }));
  const taxDueTodayMinor =
    tax.timing === "with-balance"
      ? 0
      : sumOf(
          tax.rates.map((rate) => taxOf(dueTodayBeforeTaxMinor, rate.percent)),
        );

  return {
    pricesIncludeTax: tax.kind === "included",
    taxLines,
    taxMinor: sumOf(taxLines.map((line) => line.amountMinor)),
    taxDueTodayMinor,
  };
};

export const describeTax = (
  tax: TaxSettings,
): { code: string; message: string }[] => {
  if (tax.kind === "none") {
    return [{ code: "tax.none", message: "This business charges no tax." }];
  }

  const mode =
    tax.kind === "added"
      ? { code: "tax.added", message: "Tax is added on top of the prices." }
      : { code: "tax.included", message: "The prices already include tax." };
  const timing =
    tax.timing === "with-each-payment"
      ? {
          code: "tax.with-each-payment",
          message: "Each payment carries its share of the tax.",
        }
      : {
          code: "tax.with-balance",
          message: "All tax is counted with the balance.",
        };

  return [mode, timing];
};
