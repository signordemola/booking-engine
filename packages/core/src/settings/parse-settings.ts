import type { z } from "zod";
import { findSettingsProblems } from "./check-settings.js";
import {
  settingsShapeSchema,
  type BusinessSettings,
} from "./settings-schema.js";

export type SettingsError = { path: string; message: string };

export type ParseSettingsResult =
  | { ok: true; value: BusinessSettings }
  | { ok: false; errors: SettingsError[] };

const settingsSchema = settingsShapeSchema.superRefine((settings, context) => {
  findSettingsProblems(settings).forEach((problem) => {
    context.addIssue({
      code: "custom",
      path: problem.path,
      message: problem.message,
    });
  });
});

const toPathText = (path: PropertyKey[]) =>
  path
    .map((part) =>
      typeof part === "number" ? `[${part}]` : `.${String(part)}`,
    )
    .join("")
    .replace(/^\./, "");

const toSettingsErrors = (issue: z.core.$ZodIssue): SettingsError[] => {
  const path = toPathText(issue.path);

  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((key) => ({
      path,
      message: `Remove the setting "${key}". This engine does not know it.`,
    }));
  }

  return [{ path, message: issue.message }];
};

export const parseSettings = (input: unknown): ParseSettingsResult => {
  const result = settingsSchema.safeParse(input);

  if (!result.success) {
    return { ok: false, errors: result.error.issues.flatMap(toSettingsErrors) };
  }

  return { ok: true, value: result.data };
};
