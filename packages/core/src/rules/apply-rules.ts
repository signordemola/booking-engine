import type {
  BusinessSettings,
  DepositRule,
  FillWindowRule,
  PrerequisiteRule,
} from "../settings/settings-schema.js";
import { toEpochMs } from "../time/time.js";
import type { ClientFacts } from "./client-facts-schema.js";

export type RuleFinding = { code: string; message: string };

const hourInMs = 3_600_000;
const dayInMs = 24 * hourInMs;

const nameOf = (settings: BusinessSettings, serviceId: string) =>
  settings.services.find((service) => service.id === serviceId)?.name ??
  serviceId;

export const findBookAloneFindings = (
  settings: BusinessSettings,
  serviceIds: string[],
): RuleFinding[] => {
  if (serviceIds.length < 2) {
    return [];
  }

  const bookAloneIds = settings.rules.flatMap((rule) =>
    rule.kind === "book-alone" ? rule.serviceIds : [],
  );

  return serviceIds
    .filter((serviceId) => bookAloneIds.includes(serviceId))
    .map((serviceId) => ({
      code: "rule.book-alone",
      message: `"${nameOf(settings, serviceId)}" must be booked on its own.`,
    }));
};

const checkPrerequisite = (
  settings: BusinessSettings,
  rule: PrerequisiteRule,
  serviceId: string,
  client: ClientFacts | undefined,
  startMs: number,
): RuleFinding[] => {
  const serviceName = nameOf(settings, serviceId);
  const doneAt = (client?.prerequisites ?? [])
    .filter((record) => record.ruleId === rule.id)
    .map((record) => toEpochMs(record.at));

  if (doneAt.length === 0) {
    return [
      {
        code: "rule.prerequisite-missing",
        message: `"${serviceName}" needs this first: ${rule.name}.`,
      },
    ];
  }

  const earliestStartOf = (atMs: number) =>
    atMs + rule.minHoursBefore * hourInMs;
  const latestStartOf = (atMs: number) => atMs + rule.validDays * dayInMs;

  if (
    doneAt.some(
      (atMs) =>
        earliestStartOf(atMs) <= startMs && startMs <= latestStartOf(atMs),
    )
  ) {
    return [];
  }

  if (doneAt.some((atMs) => startMs < earliestStartOf(atMs))) {
    const gap =
      rule.minHoursBefore === 0
        ? "after"
        : `at least ${rule.minHoursBefore} hours after`;
    return [
      {
        code: "rule.prerequisite-too-recent",
        message: `"${serviceName}" must be ${gap} this: ${rule.name}.`,
      },
    ];
  }

  return [
    {
      code: "rule.prerequisite-out-of-date",
      message: `${rule.name} is valid for ${rule.validDays} days. "${serviceName}" needs a new one.`,
    },
  ];
};

export const findPrerequisiteFindings = (
  settings: BusinessSettings,
  serviceIds: string[],
  client: ClientFacts | undefined,
  startMs: number,
): RuleFinding[] =>
  settings.rules.flatMap((rule) =>
    rule.kind === "prerequisite"
      ? serviceIds
          .filter((serviceId) => rule.serviceIds.includes(serviceId))
          .flatMap((serviceId) =>
            checkPrerequisite(settings, rule, serviceId, client, startMs),
          )
      : [],
  );

const checkFillWindow = (
  settings: BusinessSettings,
  rule: FillWindowRule,
  client: ClientFacts | undefined,
  atMs: number,
): RuleFinding[] => {
  const earlierVisits = (client?.visits ?? [])
    .filter((visit) =>
      [rule.fillServiceId, rule.fullSetServiceId].includes(visit.serviceId),
    )
    .map((visit) => toEpochMs(visit.at))
    .filter((visitMs) => visitMs <= atMs);
  const lastVisitMs = Math.max(...earlierVisits);
  const insideWindow =
    earlierVisits.length > 0 && atMs - lastVisitMs <= rule.maxDays * dayInMs;

  if (insideWindow) {
    return [];
  }

  const fillName = nameOf(settings, rule.fillServiceId);
  const fullSetName = nameOf(settings, rule.fullSetServiceId);
  return [
    {
      code: "rule.fill-window-passed",
      message: `"${fillName}" is for visits within ${rule.maxDays} days of the last one. Book "${fullSetName}" instead.`,
    },
  ];
};

export const findFillWindowFindings = (
  settings: BusinessSettings,
  serviceIds: string[],
  client: ClientFacts | undefined,
  atMs: number,
): RuleFinding[] =>
  settings.rules.flatMap((rule) =>
    rule.kind === "fill-window" && serviceIds.includes(rule.fillServiceId)
      ? checkFillWindow(settings, rule, client, atMs)
      : [],
  );

export const findConsentFindings = (
  settings: BusinessSettings,
  serviceIds: string[],
  client: ClientFacts | undefined,
): RuleFinding[] =>
  settings.rules.flatMap((rule) => {
    if (rule.kind !== "consent") {
      return [];
    }

    const signed = (client?.consents ?? []).some(
      (consent) =>
        consent.ruleId === rule.id && consent.formVersion === rule.formVersion,
    );
    if (signed) {
      return [];
    }

    return serviceIds
      .filter((serviceId) => rule.serviceIds.includes(serviceId))
      .map((serviceId) => ({
        code: "rule.consent-required",
        message: `Sign this before you book "${nameOf(settings, serviceId)}": ${rule.name}.`,
      }));
  });

export const findNewClientDeposit = (
  settings: BusinessSettings,
  client: ClientFacts | undefined,
): DepositRule | undefined => {
  const isNewClient = client !== undefined && client.visits.length === 0;
  const rule = settings.rules.find(
    (item) => item.kind === "new-client-deposit",
  );

  return isNewClient && rule?.kind === "new-client-deposit"
    ? rule.deposit
    : undefined;
};
