import type { Fee } from "../settings/settings-schema.js";
import type {
  RequestedAddOn,
  RequestedService,
} from "./find-requested-items.js";

export type ServiceLineItem = {
  kind: "service";
  serviceId: string;
  name: string;
  hours: number | null;
  amountMinor: number;
  depositMinor: number;
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

export type FeeLineItem = {
  kind: "fee";
  feeId: string;
  name: string;
  due: "today" | "later";
  amountMinor: number;
};

export type LineItem = ServiceLineItem | AddOnLineItem | FeeLineItem;

export const toServiceLineItem = (
  requested: RequestedService,
  depositMinor: number,
): ServiceLineItem => ({
  kind: "service",
  serviceId: requested.service.id,
  name: requested.service.name,
  hours: requested.hours,
  amountMinor: requested.priceMinor,
  depositMinor,
});

export const toAddOnLineItem = (
  serviceId: string,
  { addOn, quantity }: RequestedAddOn,
): AddOnLineItem => ({
  kind: "add-on",
  serviceId,
  addOnId: addOn.id,
  name: addOn.name,
  unitPriceMinor: addOn.priceMinor,
  quantity,
  amountMinor: addOn.priceMinor * quantity,
});

export const toFeeLineItem = (fee: Fee): FeeLineItem => ({
  kind: "fee",
  feeId: fee.id,
  name: fee.name,
  due: fee.due,
  amountMinor: fee.amountMinor,
});
