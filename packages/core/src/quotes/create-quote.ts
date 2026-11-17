import { z } from "zod";
import type { Reason, Result } from "../lib/result.js";
import { toProblems } from "../lib/zod-problems.js";
import { settingsSchema } from "../settings/parse-settings.js";
import { calculateDeposit, describeDepositRule } from "./calculate-deposit.js";
import { calculateTax, describeTax, type TaxLine } from "./calculate-tax.js";
import { findRequestedItems } from "./find-requested-items.js";
import {
  toAddOnLineItem,
  toFeeLineItem,
  toServiceLineItem,
  type LineItem,
} from "./quote-line-items.js";
import { quoteRequestSchema } from "./quote-request-schema.js";

export type Quote = {
  currency: string;
  pricesIncludeTax: boolean;
  lineItems: LineItem[];
  subtotalMinor: number;
  taxLines: TaxLine[];
  totalMinor: number;
  dueToday: {
    depositMinor: number;
    feesMinor: number;
    taxMinor: number;
    totalMinor: number;
  };
  balance: {
    taxMinor: number;
    totalMinor: number;
  };
  reasons: Reason[];
};

const sumOf = (amounts: number[]) =>
  amounts.reduce((sum, amount) => sum + amount, 0);

export const createQuoteInputSchema = z.strictObject({
  settings: settingsSchema,
  request: quoteRequestSchema,
});

export const createQuote = (input: unknown): Result<Quote> => {
  const parsed = createQuoteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toProblems(parsed.error.issues) };
  }

  const { settings, request } = parsed.data;
  const requested = findRequestedItems(settings, request);
  if (!requested.ok) {
    return requested;
  }

  const lineItems: LineItem[] = [];
  const reasons: Reason[] = [];

  requested.value.services.forEach((requestedService) => {
    const deposit = calculateDeposit(settings, requestedService);
    const { service, addOns } = requestedService;

    reasons.push({
      code:
        deposit.source === "service"
          ? "deposit.service-rule"
          : "deposit.default-rule",
      path: `lineItems[${lineItems.length}]`,
      message:
        deposit.source === "service"
          ? `"${service.name}" has its own deposit rule: ${describeDepositRule(deposit.rule)}.`
          : `"${service.name}" uses the business deposit rule: ${describeDepositRule(deposit.rule)}.`,
    });
    lineItems.push(toServiceLineItem(requestedService, deposit.amountMinor));
    lineItems.push(
      ...addOns.map((addOn) => toAddOnLineItem(service.id, addOn)),
    );
  });
  lineItems.push(...requested.value.fees.map(toFeeLineItem));

  const subtotalMinor = sumOf(lineItems.map((item) => item.amountMinor));
  const depositMinor = sumOf(
    lineItems.map((item) => (item.kind === "service" ? item.depositMinor : 0)),
  );
  const feesDueTodayMinor = sumOf(
    lineItems.map((item) =>
      item.kind === "fee" && item.due === "today" ? item.amountMinor : 0,
    ),
  );
  const dueTodayBeforeTaxMinor = depositMinor + feesDueTodayMinor;

  const tax = calculateTax(settings.tax, subtotalMinor, dueTodayBeforeTaxMinor);
  const totalMinor = tax.pricesIncludeTax
    ? subtotalMinor
    : subtotalMinor + tax.taxMinor;
  const dueTodayMinor = tax.pricesIncludeTax
    ? dueTodayBeforeTaxMinor
    : dueTodayBeforeTaxMinor + tax.taxDueTodayMinor;

  reasons.push(
    ...describeTax(settings.tax).map((reason) => ({
      ...reason,
      path: "taxLines",
    })),
  );

  return {
    ok: true,
    value: {
      currency: settings.currency,
      pricesIncludeTax: tax.pricesIncludeTax,
      lineItems,
      subtotalMinor,
      taxLines: tax.taxLines,
      totalMinor,
      dueToday: {
        depositMinor,
        feesMinor: feesDueTodayMinor,
        taxMinor: tax.taxDueTodayMinor,
        totalMinor: dueTodayMinor,
      },
      balance: {
        taxMinor: tax.taxMinor - tax.taxDueTodayMinor,
        totalMinor: totalMinor - dueTodayMinor,
      },
      reasons,
    },
  };
};
