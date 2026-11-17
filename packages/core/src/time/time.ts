export const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof weekdays)[number];

const minuteInMs = 60_000;

const doesNotThrow = (action: () => unknown): boolean => {
  try {
    action();
    return true;
  } catch {
    return false;
  }
};

export const isDateText = (text: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(text) &&
  doesNotThrow(() => Temporal.PlainDate.from(text));

export const isInstantText = (text: string): boolean =>
  doesNotThrow(() => Temporal.Instant.from(text));

export const isTimeZone = (timeZone: string): boolean =>
  doesNotThrow(() =>
    Temporal.PlainDate.from("2000-01-01").toZonedDateTime(timeZone),
  );

export const toEpochMs = (instantText: string): number =>
  Temporal.Instant.from(instantText).epochMilliseconds;

export const toInstantText = (epochMs: number): string =>
  Temporal.Instant.fromEpochMilliseconds(epochMs).toString();

export const addMinutes = (epochMs: number, minutes: number): number =>
  epochMs + minutes * minuteInMs;

export const addDays = (date: string, days: number): string =>
  Temporal.PlainDate.from(date).add({ days }).toString();

export const daysBetween = (fromDate: string, toDate: string): number =>
  Temporal.PlainDate.from(fromDate).until(toDate).days;

export const weekdayOf = (date: string): Weekday => {
  const weekday = weekdays[Temporal.PlainDate.from(date).dayOfWeek - 1];
  if (!weekday) throw new RangeError(`${date} has no weekday`);
  return weekday;
};

const zonedOf = (epochMs: number, timeZone: string) =>
  Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(timeZone);

export const localDateOf = (epochMs: number, timeZone: string): string =>
  zonedOf(epochMs, timeZone).toPlainDate().toString();

export const localTimeOf = (epochMs: number, timeZone: string): string =>
  zonedOf(epochMs, timeZone).toPlainTime().toString({ smallestUnit: "minute" });

export const localTimeToEpochMs = (
  date: string,
  time: string,
  timeZone: string,
): number | null => {
  if (time === "24:00") {
    return localTimeToEpochMs(addDays(date, 1), "00:00", timeZone);
  }

  const wallClock = Temporal.PlainDateTime.from(`${date}T${time}`);
  const zoned = wallClock.toZonedDateTime(timeZone, {
    disambiguation: "earlier",
  });
  const existsOnTheClock = zoned.toPlainDateTime().equals(wallClock);

  return existsOnTheClock ? zoned.epochMilliseconds : null;
};

export const isClockTime = (text: string): boolean =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(text);

export const minutesOfDay = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};
