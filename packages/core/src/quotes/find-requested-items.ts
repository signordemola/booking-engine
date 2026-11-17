import type { Problem, Result } from "../lib/result.js";
import type {
  AddOn,
  BusinessSettings,
  Fee,
  Service,
} from "../settings/settings-schema.js";
import type {
  QuoteRequest,
  RequestedServiceInput,
} from "./quote-request-schema.js";

export type RequestedAddOn = { addOn: AddOn; quantity: number };

export type RequestedService = {
  service: Service;
  hours: number | null;
  priceMinor: number;
  addOns: RequestedAddOn[];
};

export type RequestedItems = { services: RequestedService[]; fees: Fee[] };

type Price = { hours: number | null; priceMinor: number };

const findPrice = (
  service: Service,
  requested: RequestedServiceInput,
  path: string,
): Result<Price> => {
  const price = service.price;
  const hours = requested.hours;

  if (price.kind === "fixed") {
    if (hours !== undefined) {
      return {
        ok: false,
        errors: [
          {
            code: "quote.hours-not-allowed",
            path: `${path}.hours`,
            message: `"${service.name}" has a fixed price. Remove the hours.`,
          },
        ],
      };
    }
    return { ok: true, value: { hours: null, priceMinor: price.amountMinor } };
  }

  if (hours === undefined) {
    return {
      ok: false,
      errors: [
        {
          code: "quote.hours-required",
          path: `${path}.hours`,
          message: `Choose how many hours of "${service.name}" you need.`,
        },
      ],
    };
  }

  if (hours < price.minHours || hours > price.maxHours) {
    return {
      ok: false,
      errors: [
        {
          code: "quote.hours-out-of-range",
          path: `${path}.hours`,
          message: `"${service.name}" can be booked for ${price.minHours} to ${price.maxHours} hours.`,
        },
      ],
    };
  }

  return { ok: true, value: { hours, priceMinor: price.hourlyMinor * hours } };
};

const findAddOns = (
  settings: BusinessSettings,
  service: Service,
  requested: RequestedServiceInput,
  servicePath: string,
): Result<RequestedAddOn[]> => {
  const problems: Problem[] = [];
  const addOns: RequestedAddOn[] = [];

  requested.addOns.forEach(({ addOnId, quantity }, addOnIndex) => {
    const path = `${servicePath}.addOns[${addOnIndex}]`;
    const addOn = settings.addOns.find((item) => item.id === addOnId);
    const firstIndex = requested.addOns.findIndex(
      (item) => item.addOnId === addOnId,
    );

    if (!addOn || !service.addOnIds.includes(addOnId)) {
      problems.push({
        code: "quote.add-on-not-offered",
        path: `${path}.addOnId`,
        message: `"${service.name}" does not offer the add-on "${addOnId}".`,
      });
      return;
    }

    if (firstIndex !== addOnIndex) {
      problems.push({
        code: "quote.add-on-repeated",
        path: `${path}.addOnId`,
        message: `The add-on "${addOnId}" is listed more than once. Use the quantity.`,
      });
      return;
    }

    if (quantity > addOn.maxQuantity) {
      problems.push({
        code: "quote.quantity-above-maximum",
        path: `${path}.quantity`,
        message: `The most you can add of "${addOn.name}" is ${addOn.maxQuantity}.`,
      });
      return;
    }

    addOns.push({ addOn, quantity });
  });

  return problems.length > 0
    ? { ok: false, errors: problems }
    : { ok: true, value: addOns };
};

const findFees = (
  settings: BusinessSettings,
  feeIds: string[],
): Result<Fee[]> => {
  const problems: Problem[] = [];
  const fees: Fee[] = [];

  feeIds.forEach((feeId, index) => {
    const fee = settings.fees.find((item) => item.id === feeId);

    if (!fee) {
      problems.push({
        code: "quote.unknown-fee",
        path: `request.feeIds[${index}]`,
        message: `The fee "${feeId}" does not exist.`,
      });
      return;
    }

    if (feeIds.indexOf(feeId) !== index) {
      problems.push({
        code: "quote.fee-repeated",
        path: `request.feeIds[${index}]`,
        message: `The fee "${feeId}" is listed more than once.`,
      });
      return;
    }

    fees.push(fee);
  });

  return problems.length > 0
    ? { ok: false, errors: problems }
    : { ok: true, value: fees };
};

export const findRequestedItems = (
  settings: BusinessSettings,
  request: QuoteRequest,
): Result<RequestedItems> => {
  const problems: Problem[] = [];
  const services: RequestedService[] = [];

  request.services.forEach((requested, serviceIndex) => {
    const path = `request.services[${serviceIndex}]`;
    const service = settings.services.find(
      (item) => item.id === requested.serviceId,
    );

    if (!service) {
      problems.push({
        code: "quote.unknown-service",
        path: `${path}.serviceId`,
        message: `The service "${requested.serviceId}" does not exist.`,
      });
      return;
    }

    const price = findPrice(service, requested, path);
    const addOns = findAddOns(settings, service, requested, path);

    if (!price.ok) problems.push(...price.errors);
    if (!addOns.ok) problems.push(...addOns.errors);
    if (price.ok && addOns.ok) {
      services.push({ service, ...price.value, addOns: addOns.value });
    }
  });

  const fees = findFees(settings, request.feeIds);
  if (!fees.ok) problems.push(...fees.errors);

  if (problems.length > 0 || !fees.ok) {
    return { ok: false, errors: problems };
  }

  return { ok: true, value: { services, fees: fees.value } };
};
