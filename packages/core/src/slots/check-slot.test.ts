import { expect, test } from "vitest";
import { hireStudio, salon } from "../testing/demo-businesses.js";
import { checkSlot } from "./check-slot.js";

const tuesdayMorning = "2026-11-17T15:00:00Z";
const saturdayHire = {
  resourceId: "daylight-room",
  start: "2026-11-21T15:00:00Z",
  end: "2026-11-21T19:30:00Z",
};

const hireAt = (start: string, hours: number) => ({
  start,
  services: [{ serviceId: "daylight-studio", hours, addOns: [] }],
});

const checkFor = (facts: unknown, request: unknown) => {
  const result = checkSlot({ settings: hireStudio, facts, request });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
};

test("Saturday 10:00 to 14:00 is free on an empty day", () => {
  const facts = { now: tuesdayMorning, busy: [] };

  expect(checkFor(facts, hireAt("2026-11-21T10:00:00-05:00", 4))).toEqual({
    start: "2026-11-21T15:00:00Z",
    end: "2026-11-21T19:00:00Z",
    available: true,
    resourceIds: ["daylight-room"],
    reasons: [],
  });
});

test.each([
  {
    time: "a time that another hire has taken",
    start: "2026-11-21T12:00:00-05:00",
    hours: 2,
    reasons: [{ code: "slot.busy", message: "This time is already taken." }],
  },
  {
    time: "a time that ends inside the gap before another hire",
    start: "2026-11-21T08:00:00-05:00",
    hours: 2,
    reasons: [{ code: "slot.busy", message: "This time is already taken." }],
  },
  {
    time: "a time inside the gap after another hire",
    start: "2026-11-21T14:00:00-05:00",
    hours: 2,
    reasons: [{ code: "slot.busy", message: "This time is already taken." }],
  },
  {
    time: "a time before the studio opens",
    start: "2026-11-22T07:00:00-05:00",
    hours: 2,
    reasons: [
      {
        code: "slot.outside-hours",
        message: "This time is outside the opening hours.",
      },
    ],
  },
  {
    time: "a time that ends after the studio closes",
    start: "2026-11-22T20:00:00-05:00",
    hours: 4,
    reasons: [
      {
        code: "slot.outside-hours",
        message: "This time is outside the opening hours.",
      },
    ],
  },
  {
    time: "a time between two start times",
    start: "2026-11-22T10:30:00-05:00",
    hours: 2,
    reasons: [
      { code: "slot.not-on-step", message: "Start times are every 1 hour." },
    ],
  },
  {
    time: "a time with less than a day of notice",
    start: "2026-11-18T09:00:00-05:00",
    hours: 2,
    reasons: [
      {
        code: "slot.too-soon",
        message: "Bookings need at least 1 day of notice.",
      },
    ],
  },
  {
    time: "a time on a closed date",
    start: "2026-12-25T10:00:00-05:00",
    hours: 2,
    reasons: [
      {
        code: "slot.closed",
        message: "The business is closed on this date: Christmas.",
      },
    ],
  },
  {
    time: "a time that is too soon and before opening",
    start: "2026-11-17T07:00:00-05:00",
    hours: 2,
    reasons: [
      {
        code: "slot.too-soon",
        message: "Bookings need at least 1 day of notice.",
      },
      {
        code: "slot.outside-hours",
        message: "This time is outside the opening hours.",
      },
    ],
  },
])(
  "$time is not free, and the answer says why",
  ({ start, hours, reasons }) => {
    const facts = { now: tuesdayMorning, busy: [saturdayHire] };
    const check = checkFor(facts, hireAt(start, hours));

    expect(check.available).toBe(false);
    expect(check.resourceIds).toEqual([]);
    expect(check.reasons).toEqual(
      reasons.map((reason) => ({ ...reason, path: "request.start" })),
    );
  },
);

test("the first free start after a hire is on the hour after the gap ends", () => {
  const facts = { now: tuesdayMorning, busy: [saturdayHire] };

  expect(
    checkFor(facts, hireAt("2026-11-21T15:00:00-05:00", 2)).available,
  ).toBe(true);
});

test("a time is free when one stylist is busy and another is not", () => {
  const facts = {
    now: "2026-11-10T15:00:00Z",
    busy: [
      {
        resourceId: "camille",
        start: "2026-11-18T16:00:00Z",
        end: "2026-11-18T17:00:00Z",
      },
    ],
  };
  const request = {
    start: "2026-11-18T11:15:00-05:00",
    services: [{ serviceId: "fringe-trim", addOns: [] }],
  };
  const result = checkSlot({ settings: salon, facts, request });

  expect(result).toMatchObject({
    ok: true,
    value: { available: true, resourceIds: ["noah"], reasons: [] },
  });
});

test("rejects a start time with no time zone offset", () => {
  const facts = { now: tuesdayMorning, busy: [] };
  const request = hireAt("2026-11-21T10:00:00", 4);

  expect(checkSlot({ settings: hireStudio, facts, request })).toEqual({
    ok: false,
    errors: [
      {
        code: "input.invalid",
        path: "request.start",
        message: "Use an exact moment such as 2026-11-21T15:00:00Z.",
      },
    ],
  });
});
