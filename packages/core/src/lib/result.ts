export type Problem = { path: string; message: string };

export type Result<Value> =
  { ok: true; value: Value } | { ok: false; errors: Problem[] };
