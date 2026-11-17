import { expect, test } from "vitest";
import { groupBusyTimes, isBusy } from "./busy-times.js";

const at = (time: string) => `2026-11-21T${time}:00Z`;
const range = (start: string, end: string) => ({
  startMs: Date.parse(at(start)),
  endMs: Date.parse(at(end)),
});

const busyTimes = groupBusyTimes([
  { resourceId: "room", start: at("15:00"), end: at("16:00") },
  { resourceId: "room", start: at("10:00"), end: at("11:00") },
  { resourceId: "room", start: at("10:30"), end: at("12:00") },
  { resourceId: "other-room", start: at("13:00"), end: at("14:00") },
]);

test("busy times are sorted, and times that overlap become one", () => {
  expect(busyTimes.get("room")).toEqual([
    range("10:00", "12:00"),
    range("15:00", "16:00"),
  ]);
});

test.each([
  {
    wanted: range("09:00", "10:00"),
    busy: false,
    why: "it ends when the busy time starts",
  },
  {
    wanted: range("12:00", "15:00"),
    busy: false,
    why: "it fits exactly between two busy times",
  },
  {
    wanted: range("09:00", "10:01"),
    busy: true,
    why: "it runs one minute into a busy time",
  },
  {
    wanted: range("11:59", "13:00"),
    busy: true,
    why: "it starts one minute before a busy time ends",
  },
  {
    wanted: range("10:15", "10:45"),
    busy: true,
    why: "it is inside a busy time",
  },
  {
    wanted: range("09:00", "17:00"),
    busy: true,
    why: "it covers every busy time",
  },
  {
    wanted: range("16:00", "17:00"),
    busy: false,
    why: "it starts after the last busy time",
  },
  {
    wanted: range("13:00", "14:00"),
    busy: false,
    why: "that busy time belongs to another resource",
  },
])("a wanted time is busy: $busy, because $why", ({ wanted, busy }) => {
  expect(isBusy(busyTimes, "room", wanted)).toBe(busy);
});

test("a resource with no busy times is never busy", () => {
  expect(isBusy(busyTimes, "new-room", range("10:00", "11:00"))).toBe(false);
});
