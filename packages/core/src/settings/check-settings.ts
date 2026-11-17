import type { BusinessSettings } from "./settings-schema.js";

export type SettingsProblem = {
  code: string;
  path: (string | number)[];
  message: string;
};

const findRepeatedIds = (
  listName: string,
  items: { id: string }[],
): SettingsProblem[] => {
  const problems: SettingsProblem[] = [];

  items.forEach((item, index) => {
    const firstIndex = items.findIndex((other) => other.id === item.id);
    if (firstIndex !== index) {
      problems.push({
        code: "settings.repeated-id",
        path: [listName, index, "id"],
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

const findFixedDepositsAbovePrice = (
  settings: BusinessSettings,
): SettingsProblem[] => {
  const problems: SettingsProblem[] = [];
  const defaultDeposit = settings.defaultDeposit;

  settings.services.forEach((service, index) => {
    const ownDeposit = service.deposit;

    if (
      ownDeposit?.kind === "fixed" &&
      ownDeposit.amountMinor > service.priceMinor
    ) {
      problems.push({
        code: "settings.fixed-deposit-above-price",
        path: ["services", index, "deposit"],
        message: `The fixed deposit of "${service.name}" is more than its price.`,
      });
    }

    if (
      !ownDeposit &&
      defaultDeposit.kind === "fixed" &&
      defaultDeposit.amountMinor > service.priceMinor
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

export const findSettingsProblems = (
  settings: BusinessSettings,
): SettingsProblem[] => [
  ...findRepeatedIds("services", settings.services),
  ...findRepeatedIds("addOns", settings.addOns),
  ...findMissingAddOns(settings),
  ...findFixedDepositsAbovePrice(settings),
];
