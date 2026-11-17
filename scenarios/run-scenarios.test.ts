import { runOperation } from "@booking-engine/core";
import { expect, test } from "vitest";
import { loadScenarios } from "./load-scenarios.js";

const scenarios = loadScenarios();

test("every scenario has a different id", () => {
  const ids = scenarios.map((scenario) => scenario.id);

  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
});

test.each(scenarios)("$lane: $title", (scenario) => {
  const input =
    scenario.facts === undefined
      ? { settings: scenario.settings, request: scenario.request }
      : {
          settings: scenario.settings,
          facts: scenario.facts,
          request: scenario.request,
        };

  expect(runOperation(scenario.operation, input)).toMatchObject(
    scenario.expect,
  );
});
