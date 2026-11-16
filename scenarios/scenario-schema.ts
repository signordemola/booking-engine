import { z } from "zod";

export const scenarioFileSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  source: z.url(),
  business: z.string().min(1),
  operation: z.string().min(1),
  request: z.unknown(),
  expect: z.record(z.string(), z.unknown()),
});

export type ScenarioFile = z.infer<typeof scenarioFileSchema>;

export type Scenario = ScenarioFile & { lane: string; settings: unknown };
