# Money is a whole number of minor units, with one currency per business

Every amount is a whole number of the smallest unit of the currency (cents, pence), so US$120 is `12000`. Decimal numbers cannot hold money exactly in JavaScript: `0.1 + 0.2` is `0.30000000000000004`. A business has one currency, so the currency is stated once in its settings and in each quote, not on every amount. Fields end in `Minor` (for example `priceMinor`), because "cents" is the wrong word for pounds.

Every percentage (deposit, tax) goes through one function, `percentageOf`, so the whole engine rounds the same way: half-up, to the minor unit. A percentage can have up to 4 decimal places, because real tax rates do (8.875% in New York City).
