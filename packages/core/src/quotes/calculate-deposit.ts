import { percentageOf } from "../money/money.js";
import { findNewClientDeposit } from "../rules/apply-rules.js";
import type { ClientFacts } from "../rules/client-facts-schema.js";
import type {
  BusinessSettings,
  DepositRule,
} from "../settings/settings-schema.js";
import type { RequestedService } from "./find-requested-items.js";

export type AppliedDeposit = {
  source: "new-client" | "service" | "default";
  rule: DepositRule;
  amountMinor: number;
};

const addOnsTotalOf = (requested: RequestedService) =>
  requested.addOns.reduce(
    (sum, { addOn, quantity }) => sum + addOn.priceMinor * quantity,
    0,
  );

const depositAmount = (
  rule: DepositRule,
  requested: RequestedService,
): number => {
  switch (rule.kind) {
    case "none":
      return 0;
    case "percentage":
      return percentageOf(requested.priceMinor, rule.percent);
    case "fixed":
      return Math.min(rule.amountMinor, requested.priceMinor);
    case "full":
      return requested.priceMinor + addOnsTotalOf(requested);
  }
};

export const calculateDeposit = (
  settings: BusinessSettings,
  requested: RequestedService,
  client: ClientFacts | undefined,
): AppliedDeposit => {
  const newClientRule = findNewClientDeposit(settings, client);
  const ownRule = requested.service.deposit;
  const rule = newClientRule ?? ownRule ?? settings.defaultDeposit;
  const source = newClientRule ? "new-client" : ownRule ? "service" : "default";

  return { source, rule, amountMinor: depositAmount(rule, requested) };
};

export const describeDepositRule = (rule: DepositRule): string => {
  switch (rule.kind) {
    case "none":
      return "no deposit";
    case "percentage":
      return `${rule.percent}% of its price`;
    case "fixed":
      return "a fixed amount";
    case "full":
      return "the full price, with its add-ons, paid today";
  }
};
