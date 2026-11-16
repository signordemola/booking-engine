import type { z } from "zod";
import type { Problem } from "./result.js";

const toPathText = (path: PropertyKey[]) =>
  path
    .map((part) =>
      typeof part === "number" ? `[${part}]` : `.${String(part)}`,
    )
    .join("")
    .replace(/^\./, "");

const toProblemsOfOneIssue = (issue: z.core.$ZodIssue): Problem[] => {
  const path = toPathText(issue.path);

  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((key) => ({
      code: "input.unknown-field",
      path,
      message: `Remove "${key}". This engine does not know that field.`,
    }));
  }

  if (issue.code === "custom" && typeof issue.params?.code === "string") {
    return [{ code: issue.params.code, path, message: issue.message }];
  }

  return [{ code: "input.invalid", path, message: issue.message }];
};

export const toProblems = (issues: z.core.$ZodIssue[]): Problem[] =>
  issues.flatMap(toProblemsOfOneIssue);
