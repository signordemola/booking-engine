# big.js does the percentage arithmetic

`percentageOf` uses the big.js library for exact decimal arithmetic. The usual one-line way, `Math.round(amount * percent / 100)`, is wrong by one cent in rare cases: in a test of 2.6 million cases with 13 real tax rates it was wrong 50 times (1.15% of 3000 gave 34; the answer is 35). Real projects do not write this arithmetic by hand; Medusa, an open-source commerce engine, sends its money maths through a big-number library too.

We rejected Dinero.js: it is a full money library with its own money objects and currency tables, and the engine needs one function. We rejected our own whole-number rounding code: it was exact, but hard to read.

`percentageOf` does not check its inputs. Amounts and percentages come from settings that `parseSettings` has already checked.
