import type { Problem, Result } from "../lib/result.js";
import type {
  AddOn,
  BusinessSettings,
  Service,
} from "../settings/settings-schema.js";
import type { QuoteRequest } from "./quote-request-schema.js";

export type RequestedAddOn = { addOn: AddOn; quantity: number };
export type RequestedService = { service: Service; addOns: RequestedAddOn[] };

export const findRequestedItems = (
  settings: BusinessSettings,
  request: QuoteRequest,
): Result<RequestedService[]> => {
  const problems: Problem[] = [];
  const requestedServices: RequestedService[] = [];

  request.services.forEach((requested, serviceIndex) => {
    const service = settings.services.find(
      (item) => item.id === requested.serviceId,
    );

    if (!service) {
      problems.push({
        code: "quote.unknown-service",
        path: `request.services[${serviceIndex}].serviceId`,
        message: `The service "${requested.serviceId}" does not exist.`,
      });
      return;
    }

    const addOns: RequestedAddOn[] = [];

    requested.addOns.forEach(({ addOnId, quantity }, addOnIndex) => {
      const path = `request.services[${serviceIndex}].addOns[${addOnIndex}]`;
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

    requestedServices.push({ service, addOns });
  });

  if (problems.length > 0) {
    return { ok: false, errors: problems };
  }

  return { ok: true, value: requestedServices };
};
