import type { Result } from "../lib/result.js";
import { toProblems } from "../lib/zod-problems.js";
import type { BusinessSettings, Service } from "../settings/settings-schema.js";
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

export const createQuote = (
  settings: BusinessSettings,
  input: unknown,
): Result<Quote> => {
  const request = quoteRequestSchema.safeParse(input);
  if (!request.success) {
    return { ok: false, errors: toProblems(request.error.issues) };
  }

  const requested = findRequestedItems(settings, request.data);
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
