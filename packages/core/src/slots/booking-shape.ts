import type { Problem, Result } from "../lib/result.js";
import type { RequestedService } from "../quotes/find-requested-items.js";
import type {
  BusinessSettings,
  Gaps,
  Resource,
} from "../settings/settings-schema.js";

export type BookingShape = {
  durationMinutes: number;
  gaps: Gaps;
  resources: Resource[];
};

const durationOf = ({ service, hours, addOns }: RequestedService): number => {
  const serviceMinutes =
    service.price.kind === "fixed"
      ? service.price.durationMinutes
      : (hours ?? 0) * 60;
  const addOnMinutes = addOns.reduce(
    (sum, { addOn, quantity }) => sum + addOn.extraMinutes * quantity,
    0,
  );

  return serviceMinutes + addOnMinutes;
};

const findResources = (
  settings: BusinessSettings,
  requested: RequestedService[],
  resourceId: string | undefined,
): Result<Resource[]> => {
  const problem = (
    code: string,
    path: string,
    message: string,
  ): Result<Resource[]> => ({
    ok: false,
    errors: [{ code, path, message } satisfies Problem],
  });
  const canDoEverything = (resource: Resource) =>
    requested.every(({ service }) => resource.serviceIds.includes(service.id));

  if (resourceId === undefined) {
    const resources = settings.resources.filter(canDoEverything);
    return resources.length > 0
      ? { ok: true, value: resources }
      : problem(
          "slots.no-resource",
          "request.services",
          "No one offers all the services you picked.",
        );
  }

  const resource = settings.resources.find((item) => item.id === resourceId);
  if (!resource) {
    return problem(
      "slots.unknown-resource",
      "request.resourceId",
      `The resource "${resourceId}" does not exist.`,
    );
  }

  const missing = requested.find(
    ({ service }) => !resource.serviceIds.includes(service.id),
  );
  if (missing) {
    return problem(
      "slots.resource-cannot-do-service",
      "request.resourceId",
      `"${resource.name}" does not offer "${missing.service.name}".`,
    );
  }

  return { ok: true, value: [resource] };
};

export const findBookingShape = (
  settings: BusinessSettings,
  requested: RequestedService[],
  resourceId: string | undefined,
): Result<BookingShape> => {
  const resources = findResources(settings, requested, resourceId);
  if (!resources.ok) {
    return resources;
  }

  const gapsOfEach = requested.map(
    ({ service }) => service.gaps ?? settings.schedule.gaps,
  );

  return {
    ok: true,
    value: {
      durationMinutes: requested.reduce(
        (sum, item) => sum + durationOf(item),
        0,
      ),
      gaps: {
        beforeMinutes: Math.max(
          ...gapsOfEach.map((gaps) => gaps.beforeMinutes),
        ),
        afterMinutes: Math.max(...gapsOfEach.map((gaps) => gaps.afterMinutes)),
      },
      resources: resources.value,
    },
  };
};
