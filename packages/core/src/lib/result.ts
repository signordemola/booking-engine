export type Problem = { code: string; path: string; message: string };

export type Reason = { code: string; path: string; message: string };

export type Result<Value> =
  { ok: true; value: Value } | { ok: false; errors: Problem[] };
