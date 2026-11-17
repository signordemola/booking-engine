import { z } from "zod";
import type { Reason, Result } from "../lib/result.js";
import { toProblems } from "../lib/zod-problems.js";
import {
  findBookAloneFindings,
  findFillWindowFindings,
} from "../rules/apply-rules.js";
import { clientFactsSchema } from "../rules/client-facts-schema.js";
import { isInstantText, toEpochMs } from "../time/time.js";
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

const depositReasons = {
  "new-client": {
    code: "deposit.new-client-rule",
    text: "uses the deposit rule for new clients",
  },
  service: { code: "deposit.service-rule", text: "has its own deposit rule" },
  default: {
    code: "deposit.default-rule",
    text: "uses the business deposit rule",
  },
};

export const createQuoteInputSchema = z.strictObject({
  settings: settingsSchema,
  facts: z
    .strictObject({
      now: z.string().refine(isInstantText).optional(),
      client: clientFactsSchema.optional(),
    })
    .optional(),
  request: quoteRequestSchema,
});

export const createQuote = (input: unknown): Result<Quote> => {
  const parsed = createQuoteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toProblems(parsed.error.issues) };
  }

  const { settings, facts, request } = parsed.data;
  const requested = findRequestedItems(settings, request);
  if (!requested.ok) {
    return requested;
  }

  const serviceIds = requested.value.services.map(({ service }) => service.id);
  const ruleFindings = [
    ...findBookAloneFindings(settings, serviceIds),
    ...(facts?.now === undefined
      ? []
      : findFillWindowFindings(
          settings,
          serviceIds,
          facts.client,
          toEpochMs(facts.now),
        )),
  ];
  if (ruleFindings.length > 0) {
    return {
      ok: false,
      errors: ruleFindings.map((finding) => ({
        ...finding,
        path: "request.services",
      })),
    };
  }

  const lineItems: LineItem[] = [];
  const reasons: Reason[] = [];

  requested.value.services.forEach((requestedService) => {
    const deposit = calculateDeposit(settings, requestedService, facts?.client);
    const { service, addOns } = requestedService;
    const reason = depositReasons[deposit.source];

    reasons.push({
      code: reason.code,
      path: `lineItems[${lineItems.length}]`,
      message: `"${service.name}" ${reason.text}: ${describeDepositRule(deposit.rule)}.`,
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
