import { expect, test } from "vitest";
import type { BusinessSettings } from "../settings/settings-schema.js";
import { hireStudio, lashStudio, salon } from "../testing/demo-businesses.js";
import { listSlots } from "./list-slots.js";

const tuesdayMorning = "2026-11-17T15:00:00Z";
const noBusyTimes = { now: tuesdayMorning, busy: [] };

const hire = (hours: number) => ({
  services: [{ serviceId: "daylight-studio", hours, addOns: [] }],
});

const listFor = (
  settings: BusinessSettings,
  facts: unknown,
  request: unknown,
) => {
  const result = listSlots({ settings, facts, request });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
};

const localStartsOf = (
  settings: BusinessSettings,
  facts: unknown,
  request: unknown,
) => listFor(settings, facts, request).slots.map((slot) => slot.localStart);

test("a 4-hour hire on an empty Saturday can start each hour from 08:00 to 18:00", () => {
  const list = listFor(hireStudio, noBusyTimes, {
    date: "2026-11-21",
    ...hire(4),
  });

  expect(list.durationMinutes).toBe(240);
  expect(list.timeZone).toBe("America/Toronto");
  expect(list.slots.map((slot) => slot.localStart)).toEqual([
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
  ]);
  expect(list.slots[2]).toEqual({
    start: "2026-11-21T15:00:00Z",
    end: "2026-11-21T19:00:00Z",
    localStart: "10:00",
    resourceIds: ["daylight-room"],
  });
  expect(list.reasons).toEqual([]);
});

test("after a hire from 10:00 to 14:00, the 30-minute gap pushes the next start to 15:00", () => {
  const facts = {
    now: tuesdayMorning,
    busy: [
      {
        resourceId: "daylight-room",
        start: "2026-11-21T15:00:00Z",
        end: "2026-11-21T19:30:00Z",
      },
    ],
  };

  expect(
    localStartsOf(hireStudio, facts, { date: "2026-11-21", ...hire(2) }),
  ).toEqual(["15:00", "16:00", "17:00", "18:00", "19:00", "20:00"]);
});

test("a hire needs a day of notice, so tomorrow starts at this time of day", () => {
  expect(
    localStartsOf(hireStudio, noBusyTimes, { date: "2026-11-18", ...hire(2) }),
  ).toEqual([
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ]);
});

test.each([
  {
    day: "a closed date",
    date: "2026-12-25",
    reason: {
      code: "slot.closed",
      path: "request.date",
      message: "The business is closed on this date: Christmas.",
    },
  },
  {
    day: "the last day of a closure",
    date: "2026-12-26",
    reason: {
      code: "slot.closed",
      path: "request.date",
      message: "The business is closed on this date: Christmas.",
    },
  },
  {
    day: "a date that has passed",
    date: "2026-11-16",
    reason: {
      code: "slot.date-passed",
      path: "request.date",
      message: "This date has passed.",
    },
  },
  {
    day: "a date more than 180 days ahead",
    date: "2027-05-17",
    reason: {
      code: "slot.too-far-ahead",
      path: "request.date",
      message: "Bookings open 180 days ahead.",
    },
  },
])("$day has no start times, and the answer says why", ({ date, reason }) => {
  const list = listFor(hireStudio, noBusyTimes, { date, ...hire(2) });

  expect(list.slots).toEqual([]);
  expect(list.reasons).toEqual([reason]);
});

test("the days just before and just after a closure are open", () => {
  const dayBefore = listFor(hireStudio, noBusyTimes, {
    date: "2026-12-24",
    ...hire(2),
  });
  const dayAfter = listFor(hireStudio, noBusyTimes, {
    date: "2026-12-27",
    ...hire(2),
  });

  expect(dayBefore.slots.length).toBe(13);
  expect(dayAfter.slots.length).toBe(13);
});

test("the last day inside the booking window still has start times", () => {
  const list = listFor(hireStudio, noBusyTimes, {
    date: "2027-05-16",
    ...hire(2),
  });

  expect(list.slots.length).toBe(13);
  expect(list.reasons).toEqual([]);
});

test("a day when nobody works has no start times, and the answer says why", () => {
  const request = {
    date: "2026-11-23",
    services: [{ serviceId: "lash-removal", addOns: [] }],
  };
  const list = listFor(lashStudio, noBusyTimes, request);

  expect(list.slots).toEqual([]);
  expect(list.reasons).toEqual([
    {
      code: "slot.day-off",
      path: "request.date",
      message: "No one who offers this works on this date.",
    },
  ]);
});

test("an add-on makes the booking longer, so fewer start times fit", () => {
  const withoutBath = {
    date: "2026-11-21",
    services: [{ serviceId: "hybrid-full-set", addOns: [] }],
  };
  const withBath = {
    date: "2026-11-21",
    services: [
      {
        serviceId: "hybrid-full-set",
        addOns: [{ addOnId: "lash-bath", quantity: 1 }],
      },
    ],
  };

  expect(listFor(lashStudio, noBusyTimes, withoutBath).durationMinutes).toBe(
    150,
  );
  expect(localStartsOf(lashStudio, noBusyTimes, withoutBath).at(-1)).toBe(
    "15:30",
  );
  expect(listFor(lashStudio, noBusyTimes, withBath).durationMinutes).toBe(165);
  expect(localStartsOf(lashStudio, noBusyTimes, withBath).at(-1)).toBe("15:00");
});

test("with two stylists, each start time lists who is free", () => {
  const request = {
    date: "2026-11-18",
    services: [{ serviceId: "fringe-trim", addOns: [] }],
  };
  const facts = { now: "2026-11-10T15:00:00Z", busy: [] };
  const slots = listFor(salon, facts, request).slots;
  const whoIsFreeAt = (localStart: string) =>
    slots.find((slot) => slot.localStart === localStart)?.resourceIds;

  expect(slots.length).toBe(40);
  expect(whoIsFreeAt("09:00")).toEqual(["camille"]);
  expect(whoIsFreeAt("11:00")).toEqual(["camille", "noah"]);
  expect(whoIsFreeAt("12:00")).toEqual(["noah"]);
  expect(whoIsFreeAt("18:45")).toEqual(["noah"]);
  expect(whoIsFreeAt("19:00")).toBeUndefined();
});

test("a long service must fit before the lunch break or after it", () => {
  const facts = { now: "2026-11-10T15:00:00Z", busy: [] };
  const balayage = {
    date: "2026-11-18",
    services: [{ serviceId: "balayage", addOns: [] }],
  };
  const withTreatment = {
    date: "2026-11-18",
    services: [
      {
        serviceId: "balayage",
        addOns: [{ addOnId: "bond-treatment", quantity: 1 }],
      },
    ],
  };

  expect(localStartsOf(salon, facts, balayage)).toEqual([
    "09:00",
    "13:00",
    "13:15",
    "13:30",
    "13:45",
    "14:00",
  ]);
  expect(localStartsOf(salon, facts, withTreatment)).toEqual([
    "13:00",
    "13:15",
    "13:30",
  ]);
});

test("a client can ask for one stylist", () => {
  const facts = { now: "2026-11-10T15:00:00Z", busy: [] };
  const request = {
    date: "2026-11-18",
    services: [{ serviceId: "fringe-trim", addOns: [] }],
    resourceId: "noah",
  };
  const slots = listFor(salon, facts, request).slots;

  expect(slots.length).toBe(32);
  expect(slots.every((slot) => slot.resourceIds.join() === "noah")).toBe(true);
});

test.each([
  {
    problem: "a stylist who does not offer the service",
    request: {
      date: "2026-11-18",
      services: [{ serviceId: "balayage", addOns: [] }],
      resourceId: "noah",
    },
    error: {
      code: "slots.resource-cannot-do-service",
      path: "request.resourceId",
      message: '"Noah" does not offer "Balayage".',
    },
  },
  {
    problem: "a stylist who does not exist",
    request: {
      date: "2026-11-18",
      services: [{ serviceId: "balayage", addOns: [] }],
      resourceId: "mia",
    },
    error: {
      code: "slots.unknown-resource",
      path: "request.resourceId",
      message: 'The resource "mia" does not exist.',
    },
  },
  {
    problem: "a date that does not exist",
    request: {
      date: "2027-02-29",
      services: [{ serviceId: "balayage", addOns: [] }],
    },
    error: {
      code: "input.invalid",
      path: "request.date",
      message: "Use a date such as 2026-11-21.",
    },
  },
  {
    problem: "a service that does not exist",
    request: {
      date: "2026-11-18",
      services: [{ serviceId: "perm", addOns: [] }],
    },
    error: {
      code: "quote.unknown-service",
      path: "request.services[0].serviceId",
      message: 'The service "perm" does not exist.',
    },
  },
])("rejects $problem", ({ request, error }) => {
  const facts = { now: "2026-11-10T15:00:00Z", busy: [] };

  expect(listSlots({ settings: salon, facts, request })).toEqual({
    ok: false,
    errors: [error],
  });
});

test("rejects a service that nobody offers", () => {
  const settings: BusinessSettings = {
    ...salon,
    resources: salon.resources.map((resource) => ({
      ...resource,
      serviceIds: ["fringe-trim"],
    })),
  };
  const facts = { now: "2026-11-10T15:00:00Z", busy: [] };
  const request = {
    date: "2026-11-18",
    services: [{ serviceId: "balayage", addOns: [] }],
  };

  expect(listSlots({ settings, facts, request })).toEqual({
    ok: false,
    errors: [
      {
        code: "slots.no-resource",
        path: "request.services",
        message: "No one offers all the services you picked.",
      },
    ],
  });
});

const nightStudio: BusinessSettings = {
  ...hireStudio,
  schedule: { ...hireStudio.schedule, minNoticeMinutes: 0 },
  resources: hireStudio.resources.map((resource) => ({
    ...resource,
    hours: { ...resource.hours, sunday: [{ start: "00:00", end: "06:00" }] },
  })),
};

test("the same clock time is a different exact moment after the clocks change", () => {
  const facts = { now: "2027-03-01T12:00:00Z", busy: [] };
  const saturday = listFor(hireStudio, facts, {
    date: "2027-03-13",
    ...hire(2),
  });
  const sunday = listFor(hireStudio, facts, { date: "2027-03-14", ...hire(2) });

  expect(saturday.slots[0]).toMatchObject({
    localStart: "08:00",
    start: "2027-03-13T13:00:00Z",
  });
  expect(sunday.slots[0]).toMatchObject({
    localStart: "08:00",
    start: "2027-03-14T12:00:00Z",
  });
});

test("on the night the clocks go forward, the hour that does not exist is not offered", () => {
  const facts = { now: "2027-03-01T12:00:00Z", busy: [] };

  expect(
    localStartsOf(nightStudio, facts, { date: "2027-03-14", ...hire(2) }),
  ).toEqual(["00:00", "01:00", "03:00", "04:00"]);
});

test("on the night the clocks go back, the hour that happens twice is offered twice", () => {
  const facts = { now: "2027-10-20T12:00:00Z", busy: [] };
  const list = listFor(nightStudio, facts, { date: "2027-11-07", ...hire(2) });

  expect(list.slots.map((slot) => `${slot.localStart} ${slot.start}`)).toEqual([
    "00:00 2027-11-07T04:00:00Z",
    "01:00 2027-11-07T05:00:00Z",
    "01:00 2027-11-07T06:00:00Z",
    "02:00 2027-11-07T07:00:00Z",
    "03:00 2027-11-07T08:00:00Z",
    "04:00 2027-11-07T09:00:00Z",
  ]);
});

test("listing a day stays fast with 10,000 busy times", () => {
  const firstStartMs = Date.parse("2026-11-18T13:00:00Z");
  const busy = Array.from({ length: 10_000 }, (_, index) => ({
    resourceId: "daylight-room",
    start: new Date(firstStartMs + index * 6 * 3_600_000).toISOString(),
    end: new Date(firstStartMs + (index * 6 + 1) * 3_600_000).toISOString(),
  }));
  const facts = { now: tuesdayMorning, busy };

  const startedAtMs = Date.now();
  const list = listFor(hireStudio, facts, { date: "2026-11-21", ...hire(2) });
  const elapsedMs = Date.now() - startedAtMs;

  expect(list.slots.length).toBeGreaterThan(0);
  expect(elapsedMs).toBeLessThan(500);
});
