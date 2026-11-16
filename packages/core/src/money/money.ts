import Big from "big.js";

export const percentageOf = (amountMinor: number, percent: number): number =>
  new Big(amountMinor)
    .times(percent)
    .div(100)
    .round(0, Big.roundHalfUp)
    .toNumber();
