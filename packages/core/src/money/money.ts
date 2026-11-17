import Big from "big.js";

export const percentageOf = (amountMinor: number, percent: number): number =>
  new Big(amountMinor)
    .times(percent)
    .div(100)
    .round(0, Big.roundHalfUp)
    .toNumber();

export const includedTaxOf = (
  amountWithTaxMinor: number,
  percent: number,
  totalPercent: number,
): number =>
  new Big(amountWithTaxMinor)
    .times(percent)
    .div(new Big(100).plus(totalPercent))
    .round(0, Big.roundHalfUp)
    .toNumber();
