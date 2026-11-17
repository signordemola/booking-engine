# How a quote splits the deposit and the tax

A percentage deposit is taken on the price of the service, not on its add-ons. The add-ons are paid with the balance. This matches a deposit that is set per service, and the example on demolastudio.com (US$30 is 25% of the US$120 service, on a US$130 booking). Fresha takes the percentage on the whole booking; we add that as a setting when a real case needs it. A `full` deposit is the one exception: the service and its add-ons are paid today.

Tax is calculated once, on the whole quote, one amount per tax rate. A business chooses two things, and the engine has no default for either. Price mode: tax is `added` on top (Canada, the US) or `included` in the price (the UK). Timing: `with-each-payment`, where today's payment carries its share, or `with-balance`. Official rules differ: in the UK a deposit creates a tax point when it is received; in Canada a deposit is not payment for the service until the business applies it.

Rounding happens once per number, half-up. Today's share of each tax is rounded, and the balance gets the remainder, so the two parts always add up to the total tax. The engine does not know tax law. It applies the rates and the modes a business sets.
