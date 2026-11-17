import { expect, test } from "vitest";
import {
  addDays,
  addMinutes,
  daysBetween,
  isDateText,
  isInstantText,
  isTimeZone,
  localDateOf,
  localTimeOf,
  localTimeToEpochMs,
  toEpochMs,
  toInstantText,
  weekdayOf,
} from "./time.js";

const instantAt = (date: string, time: string, timeZone: string) => {
  const epochMs = localTimeToEpochMs(date, time, timeZone);
  return epochMs === null ? null : toInstantText(epochMs);
};

test.each([
  { text: "2026-11-21", valid: true },
  { text: "2028-02-29", valid: true },
  { text: "2027-02-29", valid: false },
  { text: "2026-13-01", valid: false },
  { text: "21/11/2026", valid: false },
  { text: "2026-11-21T10:00", valid: false },
])("$text is a date: $valid", ({ text, valid }) => {
  expect(isDateText(text)).toBe(valid);
});

test.each([
  { text: "2026-11-21T15:00:00Z", valid: true },
  { text: "2026-11-21T10:00:00-05:00", valid: true },
  { text: "2026-11-21T15:00:00", valid: false },
  { text: "tomorrow at ten", valid: false },
])("$text is an exact moment: $valid", ({ text, valid }) => {
  expect(isInstantText(text)).toBe(valid);
});

test.each([
  { timeZone: "America/Toronto", valid: true },
  { timeZone: "Europe/London", valid: true },
  { timeZone: "Mars/Phobos", valid: false },
  { timeZone: "", valid: false },
])("$timeZone is a time zone: $valid", ({ timeZone, valid }) => {
  expect(isTimeZone(timeZone)).toBe(valid);
});

test("an exact moment goes to a number and back", () => {
  const epochMs = toEpochMs("2026-11-21T10:00:00-05:00");

  expect(toInstantText(epochMs)).toBe("2026-11-21T15:00:00Z");
  expect(toInstantText(addMinutes(epochMs, 90))).toBe("2026-11-21T16:30:00Z");
});

test.each([
  { date: "2026-11-21", weekday: "saturday" },
  { date: "2026-11-22", weekday: "sunday" },
  { date: "2026-11-23", weekday: "monday" },
  { date: "2027-03-14", weekday: "sunday" },
])("$date is a $weekday", ({ date, weekday }) => {
  expect(weekdayOf(date)).toBe(weekday);
});

test("dates move across the end of a month and a year", () => {
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  expect(daysBetween("2026-11-21", "2026-12-21")).toBe(30);
  expect(daysBetween("2026-11-21", "2026-11-20")).toBe(-1);
});

test.each([
  {
    date: "2027-03-13",
    time: "10:00",
    timeZone: "America/Toronto",
    instant: "2027-03-13T15:00:00Z",
  },
  {
    date: "2027-03-14",
    time: "10:00",
    timeZone: "America/Toronto",
    instant: "2027-03-14T14:00:00Z",
  },
  {
    date: "2027-11-06",
    time: "10:00",
    timeZone: "America/Toronto",
    instant: "2027-11-06T14:00:00Z",
  },
  {
    date: "2027-11-07",
    time: "10:00",
    timeZone: "America/Toronto",
    instant: "2027-11-07T15:00:00Z",
  },
  {
    date: "2027-03-27",
    time: "09:30",
    timeZone: "Europe/London",
    instant: "2027-03-27T09:30:00Z",
  },
  {
    date: "2027-03-28",
    time: "09:30",
    timeZone: "Europe/London",
    instant: "2027-03-28T08:30:00Z",
  },
  {
    date: "2027-10-31",
    time: "09:30",
    timeZone: "Europe/London",
    instant: "2027-10-31T09:30:00Z",
  },
])(
  "$time on $date in $timeZone is $instant",
  ({ date, time, timeZone, instant }) => {
    expect(instantAt(date, time, timeZone)).toBe(instant);
  },
);

test("a clock time that is skipped when the clocks go forward does not exist", () => {
  expect(instantAt("2027-03-14", "02:30", "America/Toronto")).toBeNull();
  expect(instantAt("2027-03-28", "01:30", "Europe/London")).toBeNull();
  expect(instantAt("2027-03-14", "03:00", "America/Toronto")).toBe(
    "2027-03-14T07:00:00Z",
  );
});

test("a clock time that happens twice when the clocks go back means the first one", () => {
  expect(instantAt("2027-11-07", "01:30", "America/Toronto")).toBe(
    "2027-11-07T05:30:00Z",
  );
  expect(instantAt("2027-10-31", "01:30", "Europe/London")).toBe(
    "2027-10-31T00:30:00Z",
  );
});

test("24:00 is midnight at the end of the day", () => {
  expect(instantAt("2026-11-21", "24:00", "Europe/London")).toBe(
    "2026-11-22T00:00:00Z",
  );
  expect(instantAt("2026-11-21", "24:00", "America/Toronto")).toBe(
    "2026-11-22T05:00:00Z",
  );
});

test("an exact moment has a different date and time in each time zone", () => {
  const epochMs = toEpochMs("2026-11-22T02:30:00Z");

  expect(localDateOf(epochMs, "America/Toronto")).toBe("2026-11-21");
  expect(localTimeOf(epochMs, "America/Toronto")).toBe("21:30");
  expect(localDateOf(epochMs, "Europe/London")).toBe("2026-11-22");
  expect(localTimeOf(epochMs, "Europe/London")).toBe("02:30");
});
