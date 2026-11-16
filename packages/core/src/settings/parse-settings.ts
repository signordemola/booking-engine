import type { Result } from "../lib/result.js";
import { toProblems } from "../lib/zod-problems.js";
import { findSettingsProblems } from "./check-settings.js";
import {
  settingsShapeSchema,
  type BusinessSettings,
} from "./settings-schema.js";

const settingsSchema = settingsShapeSchema.superRefine((settings, context) => {
  findSettingsProblems(settings).forEach((problem) => {
    context.addIssue({
      code: "custom",
      path: problem.path,
      message: problem.message,
    });
  });
});

export const parseSettings = (input: unknown): Result<BusinessSettings> => {
  const result = settingsSchema.safeParse(input);

  if (!result.success) {
    return { ok: false, errors: toProblems(result.error.issues) };
  }

  return { ok: true, value: result.data };
};
