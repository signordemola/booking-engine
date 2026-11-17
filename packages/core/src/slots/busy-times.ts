import { toEpochMs } from "../time/time.js";
import type { BusyTime } from "./slot-input-schema.js";

export type TimeRange = { startMs: number; endMs: number };

export type BusyTimes = Map<string, TimeRange[]>;

const mergeOverlapping = (ranges: TimeRange[]): TimeRange[] => {
  const sorted = ranges.toSorted((left, right) => left.startMs - right.startMs);
  const merged: TimeRange[] = [];

  sorted.forEach((range) => {
    const last = merged.at(-1);
    if (last && range.startMs <= last.endMs) {
      last.endMs = Math.max(last.endMs, range.endMs);
    } else {
      merged.push({ ...range });
    }
  });

  return merged;
};

export const groupBusyTimes = (busy: BusyTime[]): BusyTimes => {
  const rangesByResource = new Map<string, TimeRange[]>();

  busy.forEach(({ resourceId, start, end }) => {
    const ranges = rangesByResource.get(resourceId) ?? [];
    ranges.push({ startMs: toEpochMs(start), endMs: toEpochMs(end) });
    rangesByResource.set(resourceId, ranges);
  });

  return new Map(
    [...rangesByResource].map(([resourceId, ranges]) => [
      resourceId,
      mergeOverlapping(ranges),
    ]),
  );
};

const firstRangeEndingAfter = (
  ranges: TimeRange[],
  timeMs: number,
): TimeRange | undefined => {
  let low = 0;
  let high = ranges.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const range = ranges[middle];
    if (range && range.endMs <= timeMs) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return ranges[low];
};

export const isBusy = (
  busyTimes: BusyTimes,
  resourceId: string,
  wanted: TimeRange,
): boolean => {
  const ranges = busyTimes.get(resourceId) ?? [];
  const candidate = firstRangeEndingAfter(ranges, wanted.startMs);

  return candidate !== undefined && candidate.startMs < wanted.endMs;
};
