import { z } from "zod";
import type { Result } from "../lib/result.js";
import { toProblems } from "../lib/zod-problems.js";
import { settingsSchema } from "../settings/parse-settings.js";
import type { Service } from "../settings/settings-schema.js";
import {
  findRequestedItems,
  type RequestedAddOn,
} from "./find-requested-items.js";
import { quoteRequestSchema } from "./quote-request-schema.js";

export type ServiceLineItem = {
  kind: "service";
  serviceId: string;
  name: string;
  amountMinor: number;
};

export type AddOnLineItem = {
  kind: "add-on";
  serviceId: string;
  addOnId: string;
  name: string;
  unitPriceMinor: number;
  quantity: number;
  amountMinor: number;
};

export type LineItem = ServiceLineItem | AddOnLineItem;

export type Quote = {
  currency: string;
  lineItems: LineItem[];
  totalMinor: number;
};

const toServiceLineItem = (service: Service): ServiceLineItem => ({
  kind: "service",
  serviceId: service.id,
  name: service.name,
  amountMinor: service.priceMinor,
});

const toAddOnLineItem = (
  service: Service,
  { addOn, quantity }: RequestedAddOn,
): AddOnLineItem => ({
  kind: "add-on",
  serviceId: service.id,
  addOnId: addOn.id,
  name: addOn.name,
  unitPriceMinor: addOn.priceMinor,
  quantity,
  amountMinor: addOn.priceMinor * quantity,
});

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

  const lineItems = requested.value.flatMap(({ service, addOns }) => [
    toServiceLineItem(service),
    ...addOns.map((addOn) => toAddOnLineItem(service, addOn)),
  ]);
  const totalMinor = lineItems.reduce((sum, item) => sum + item.amountMinor, 0);

  return {
    ok: true,
    value: { currency: settings.currency, lineItems, totalMinor },
  };
};
