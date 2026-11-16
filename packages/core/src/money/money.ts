const percentScale = 10_000;
const divisor = 100 * percentScale;

const isMinorUnits = (value: number) =>
  Number.isSafeInteger(value) && value >= 0;

export const percentageOf = (amountMinor: number, percent: number): number => {
  if (!isMinorUnits(amountMinor)) {
    throw new RangeError(
      `${amountMinor} is not a whole, non-negative amount in minor units`,
    );
  }
  if (!(percent >= 0 && percent <= 100)) {
    throw new RangeError(`${percent} is not a percentage from 0 to 100`);
  }

  const scaledPercent = Math.round(percent * percentScale);
  const numerator = amountMinor * scaledPercent + divisor / 2;
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError(`${amountMinor} is too large to take a percentage of`);
  }

  return (numerator - (numerator % divisor)) / divisor;
};
