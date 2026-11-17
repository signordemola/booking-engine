import type {
  BusinessSettings,
  Gaps,
  Resource,
} from "../settings/settings-schema.js";
import {
  addMinutes,
  daysBetween,
  localDateOf,
  localTimeToEpochMs,
  weekdayOf,
} from "../time/time.js";
import { isBusy, type BusyTimes, type TimeRange } from "./busy-times.js";

export type Blocker = { code: string; message: string };

export type SlotContext = {
  settings: BusinessSettings;
  nowMs: number;
  durationMinutes: number;
  gaps: Gaps;
  busyTimes: BusyTimes;
};

const describeMinutes = (minutes: number): string => {
  if (minutes % 1440 === 0)
    return minutes === 1440 ? "1 day" : `${minutes / 1440} days`;
  if (minutes % 60 === 0)
    return minutes === 60 ? "1 hour" : `${minutes / 60} hours`;
  return `${minutes} minutes`;
};

export const openRangesOn = (
  settings: BusinessSettings,
  resource: Resource,
  date: string,
): TimeRange[] =>
  resource.hours[weekdayOf(date)].flatMap((window) => {
    const startMs = localTimeToEpochMs(date, window.start, settings.timeZone);
    const endMs = localTimeToEpochMs(date, window.end, settings.timeZone);
    return startMs === null || endMs === null ? [] : [{ startMs, endMs }];
  });

export const findDateBlockers = (
  context: SlotContext,
  date: string,
): Blocker[] => {
  const { settings, nowMs } = context;
  const today = localDateOf(nowMs, settings.timeZone);
  const closure = settings.closures.find(
    (item) => item.from <= date && date <= item.to,
  );
  const blockers: Blocker[] = [];

  if (date < today) {
    blockers.push({
      code: "slot.date-passed",
      message: "This date has passed.",
    });
  }
  if (daysBetween(today, date) > settings.schedule.maxAdvanceDays) {
    blockers.push({
      code: "slot.too-far-ahead",
      message: `Bookings open ${settings.schedule.maxAdvanceDays} days ahead.`,
    });
  }
  if (closure) {
    blockers.push({
      code: "slot.closed",
      message: `The business is closed on this date: ${closure.reason}.`,
    });
  }

  return blockers;
};

export const findBlockers = (
  context: SlotContext,
  resource: Resource,
  startMs: number,
): Blocker[] => {
  const { settings, nowMs, durationMinutes, gaps, busyTimes } = context;
  const { slotStepMinutes, minNoticeMinutes } = settings.schedule;
  const endMs = addMinutes(startMs, durationMinutes);
  const date = localDateOf(startMs, settings.timeZone);
  const blockers = findDateBlockers(context, date);

  if (startMs < addMinutes(nowMs, minNoticeMinutes)) {
    blockers.push({
      code: "slot.too-soon",
      message: `Bookings need at least ${describeMinutes(minNoticeMinutes)} of notice.`,
    });
  }

  const openRange = openRangesOn(settings, resource, date).find(
    (range) => range.startMs <= startMs && endMs <= range.endMs,
  );

  if (!openRange) {
    blockers.push({
      code: "slot.outside-hours",
      message: "This time is outside the opening hours.",
    });
  } else if ((startMs - openRange.startMs) % (slotStepMinutes * 60_000) !== 0) {
    blockers.push({
      code: "slot.not-on-step",
      message: `Start times are every ${describeMinutes(slotStepMinutes)}.`,
    });
  }

  const blockedRange = {
    startMs: addMinutes(startMs, -gaps.beforeMinutes),
    endMs: addMinutes(endMs, gaps.afterMinutes),
  };
  if (isBusy(busyTimes, resource.id, blockedRange)) {
    blockers.push({
      code: "slot.busy",
      message: "This time is already taken.",
    });
  }

  return blockers;
};
