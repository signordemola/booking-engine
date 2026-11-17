import type { Reason, Result } from "../lib/result.js";
import { toProblems } from "../lib/zod-problems.js";
import { addMinutes, localTimeOf, toInstantText } from "../time/time.js";
import {
  findBlockers,
  findDateBlockers,
  openRangesOn,
  type Blocker,
} from "./find-blockers.js";
import { prepareSlotContext } from "./prepare-slot-context.js";
import { listSlotsInputSchema } from "./slot-input-schema.js";

export type Slot = {
  start: string;
  end: string;
  localStart: string;
  resourceIds: string[];
};

export type SlotList = {
  date: string;
  timeZone: string;
  durationMinutes: number;
  slots: Slot[];
  reasons: Reason[];
};

export const listSlots = (input: unknown): Result<SlotList> => {
  const parsed = listSlotsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toProblems(parsed.error.issues) };
  }

  const { settings, facts, request } = parsed.data;
  const prepared = prepareSlotContext(settings, facts, request);
  if (!prepared.ok) {
    return prepared;
  }

  const { context, resources } = prepared.value;
  const stepMs = settings.schedule.slotStepMinutes * 60_000;
  const resourceIdsByStart = new Map<number, string[]>();
  const ruleBlockers: Blocker[] = [];
  let anyoneWorks = false;

  resources.forEach((resource) => {
    openRangesOn(settings, resource, request.date).forEach((range) => {
      anyoneWorks = true;
      for (
        let startMs = range.startMs;
        addMinutes(startMs, context.durationMinutes) <= range.endMs;
        startMs += stepMs
      ) {
        const blockers = findBlockers(context, resource, startMs);
        if (blockers.length === 0) {
          resourceIdsByStart.set(startMs, [
            ...(resourceIdsByStart.get(startMs) ?? []),
            resource.id,
          ]);
        }
        ruleBlockers.push(
          ...blockers.filter((blocker) => blocker.code.startsWith("rule.")),
        );
      }
    });
  });

  const slots = [...resourceIdsByStart]
    .toSorted(([leftStart], [rightStart]) => leftStart - rightStart)
    .map(([startMs, resourceIds]) => ({
      start: toInstantText(startMs),
      end: toInstantText(addMinutes(startMs, context.durationMinutes)),
      localStart: localTimeOf(startMs, settings.timeZone),
      resourceIds,
    }));

  const differentRuleBlockers = ruleBlockers.filter(
    (blocker, index) =>
      ruleBlockers.findIndex((other) => other.code === blocker.code) === index,
  );
  const dayBlockers = anyoneWorks
    ? [
        ...findDateBlockers(context, request.date),
        ...(slots.length === 0 ? differentRuleBlockers : []),
      ]
    : [
        {
          code: "slot.day-off",
          message: "No one who offers this works on this date.",
        },
      ];
  const reasons = dayBlockers.map((blocker) => ({
    ...blocker,
    path: "request.date",
  }));

  return {
    ok: true,
    value: {
      date: request.date,
      timeZone: settings.timeZone,
      durationMinutes: context.durationMinutes,
      slots,
      reasons,
    },
  };
};
