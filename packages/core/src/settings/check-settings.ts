import { minutesOfDay, weekdays } from "../time/time.js";
import type { BusinessSettings, Service } from "./settings-schema.js";

export type SettingsProblem = {
  code: string;
  path: (string | number)[];
  message: string;
};

const lowestPriceOf = (service: Service) =>
  service.price.kind === "fixed"
    ? service.price.amountMinor
    : service.price.hourlyMinor * service.price.minHours;

const findRepeatedIds = (
  pathToList: string[],
  items: { id: string }[],
): SettingsProblem[] => {
  const problems: SettingsProblem[] = [];

  items.forEach((item, index) => {
    const firstIndex = items.findIndex((other) => other.id === item.id);
    if (firstIndex !== index) {
      problems.push({
        code: "settings.repeated-id",
        path: [...pathToList, index, "id"],
        message: `The id "${item.id}" is used more than once. Each id must be different.`,
      });
    }
  });

  return problems;
};

const findMissingAddOns = (settings: BusinessSettings): SettingsProblem[] => {
  const problems: SettingsProblem[] = [];
  const knownAddOnIds = settings.addOns.map((addOn) => addOn.id);

  settings.services.forEach((service, serviceIndex) => {
    service.addOnIds.forEach((addOnId, addOnIndex) => {
      if (!knownAddOnIds.includes(addOnId)) {
        problems.push({
          code: "settings.missing-add-on",
          path: ["services", serviceIndex, "addOnIds", addOnIndex],
          message: `"${service.name}" lists the add-on "${addOnId}", which does not exist.`,
        });
      }
    });
  });

  return problems;
};

const findWrongHourRanges = (settings: BusinessSettings): SettingsProblem[] => {
  const problems: SettingsProblem[] = [];

  settings.services.forEach((service, index) => {
    if (
      service.price.kind === "hourly" &&
      service.price.minHours > service.price.maxHours
    ) {
      problems.push({
        code: "settings.hours-range",
        path: ["services", index, "price"],
        message: `The minimum hours of "${service.name}" are more than its maximum hours.`,
      });
    }
  });

  return problems;
};

const findFixedDepositsAbovePrice = (
  settings: BusinessSettings,
): SettingsProblem[] => {
  const problems: SettingsProblem[] = [];
  const defaultDeposit = settings.defaultDeposit;

  settings.services.forEach((service, index) => {
    const ownDeposit = service.deposit;
    const lowestPrice = lowestPriceOf(service);

    if (ownDeposit?.kind === "fixed" && ownDeposit.amountMinor > lowestPrice) {
      problems.push({
        code: "settings.fixed-deposit-above-price",
        path: ["services", index, "deposit"],
        message: `The fixed deposit of "${service.name}" is more than its price.`,
      });
    }

    if (
      !ownDeposit &&
      defaultDeposit.kind === "fixed" &&
      defaultDeposit.amountMinor > lowestPrice
    ) {
      problems.push({
        code: "settings.fixed-deposit-above-price",
        path: ["services", index],
        message: `The default fixed deposit is more than the price of "${service.name}".`,
      });
    }
  });

  return problems;
};

const findWrongOpenWindows = (
  settings: BusinessSettings,
): SettingsProblem[] => {
  const problems: SettingsProblem[] = [];

  settings.resources.forEach((resource, resourceIndex) => {
    weekdays.forEach((weekday) => {
      const windows = resource.hours[weekday];

      windows.forEach((window, windowIndex) => {
        const path = [
          "resources",
          resourceIndex,
          "hours",
          weekday,
          windowIndex,
        ];
        const previous = windows[windowIndex - 1];

        if (minutesOfDay(window.start) >= minutesOfDay(window.end)) {
          problems.push({
            code: "settings.window-ends-before-start",
            path,
            message: `On ${weekday}, "${resource.name}" has hours that end before they start.`,
          });
        }
        if (
          previous &&
          minutesOfDay(window.start) < minutesOfDay(previous.end)
        ) {
          problems.push({
            code: "settings.windows-overlap",
            path,
            message: `On ${weekday}, "${resource.name}" has hours that overlap or are out of order.`,
          });
        }
      });
    });
  });

  return problems;
};

const findMissingServices = (settings: BusinessSettings): SettingsProblem[] => {
  const problems: SettingsProblem[] = [];
  const knownServiceIds = settings.services.map((service) => service.id);

  settings.resources.forEach((resource, resourceIndex) => {
    resource.serviceIds.forEach((serviceId, serviceIndex) => {
      if (!knownServiceIds.includes(serviceId)) {
        problems.push({
          code: "settings.missing-service",
          path: ["resources", resourceIndex, "serviceIds", serviceIndex],
          message: `"${resource.name}" lists the service "${serviceId}", which does not exist.`,
        });
      }
    });
  });

  return problems;
};

const findWrongClosures = (settings: BusinessSettings): SettingsProblem[] => {
  const problems: SettingsProblem[] = [];

  settings.closures.forEach((closure, index) => {
    if (closure.from > closure.to) {
      problems.push({
        code: "settings.closure-ends-before-start",
        path: ["closures", index],
        message: `The closure "${closure.reason}" ends before it starts.`,
      });
    }
  });

  return problems;
};

export const findSettingsProblems = (
  settings: BusinessSettings,
): SettingsProblem[] => [
  ...findRepeatedIds(["services"], settings.services),
  ...findRepeatedIds(["addOns"], settings.addOns),
  ...findRepeatedIds(["fees"], settings.fees),
  ...findRepeatedIds(
    ["tax", "rates"],
    settings.tax.kind === "none" ? [] : settings.tax.rates,
  ),
  ...findMissingAddOns(settings),
  ...findWrongHourRanges(settings),
  ...findFixedDepositsAbovePrice(settings),
  ...findRepeatedIds(["resources"], settings.resources),
  ...findWrongOpenWindows(settings),
  ...findMissingServices(settings),
  ...findWrongClosures(settings),
];
