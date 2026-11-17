import type { Reason, Result } from "../lib/result.js";
import { toProblems } from "../lib/zod-problems.js";
import { addMinutes, toEpochMs, toInstantText } from "../time/time.js";
import { findBlockers } from "./find-blockers.js";
import { prepareSlotContext } from "./prepare-slot-context.js";
import { checkSlotInputSchema } from "./slot-input-schema.js";

export type SlotCheck = {
  start: string;
  end: string;
  available: boolean;
  resourceIds: string[];
  reasons: Reason[];
};

export const checkSlot = (input: unknown): Result<SlotCheck> => {
  const parsed = checkSlotInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: toProblems(parsed.error.issues) };
  }

  const { settings, facts, request } = parsed.data;
  const prepared = prepareSlotContext(settings, facts, request);
  if (!prepared.ok) {
    return prepared;
  }

  const { context, resources } = prepared.value;
  const startMs = toEpochMs(request.start);
  const blockersOfEach = resources.map((resource) => ({
    resourceId: resource.id,
    blockers: findBlockers(context, resource, startMs),
  }));
  const freeResourceIds = blockersOfEach
    .filter(({ blockers }) => blockers.length === 0)
    .map(({ resourceId }) => resourceId);
  const available = freeResourceIds.length > 0;

  const allBlockers = blockersOfEach.flatMap(({ blockers }) => blockers);
  const differentBlockers = allBlockers.filter(
    (blocker, index) =>
      allBlockers.findIndex((other) => other.code === blocker.code) === index,
  );

  return {
    ok: true,
    value: {
      start: toInstantText(startMs),
      end: toInstantText(addMinutes(startMs, context.durationMinutes)),
      available,
      resourceIds: freeResourceIds,
      reasons: available
        ? []
        : differentBlockers.map((blocker) => ({
            ...blocker,
            path: "request.start",
          })),
    },
  };
};
