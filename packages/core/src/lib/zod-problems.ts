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
      path,
      message: `Remove "${key}". This engine does not know that field.`,
    }));
  }

  return [{ path, message: issue.message }];
};

export const toProblems = (issues: z.core.$ZodIssue[]): Problem[] =>
  issues.flatMap(toProblemsOfOneIssue);
