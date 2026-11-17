import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { scenarioFileSchema, type Scenario } from "./scenario-schema.js";

const scenariosFolder = import.meta.dirname;
const businessesFolder = join(scenariosFolder, "businesses");

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, "utf8"));

const jsonFilesIn = (folder: string) =>
  readdirSync(folder).filter((fileName) => fileName.endsWith(".json"));

const laneFolders = () =>
  readdirSync(scenariosFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== "businesses" && name !== "node_modules");

const loadScenario = (lane: string, fileName: string): Scenario => {
  const path = join(scenariosFolder, lane, fileName);
  const parsed = scenarioFileSchema.safeParse(readJson(path));

  if (!parsed.success) {
    throw new Error(
      `${lane}/${fileName} is not a valid scenario: ${parsed.error.message}`,
    );
  }
  if (parsed.data.id !== basename(fileName, ".json")) {
    throw new Error(
      `${lane}/${fileName} must have the id "${basename(fileName, ".json")}"`,
    );
  }

  const settings = readJson(
    join(businessesFolder, `${parsed.data.business}.json`),
  );
  return { ...parsed.data, lane, settings };
};

export const loadScenarios = (): Scenario[] =>
  laneFolders().flatMap((lane) =>
    jsonFilesIn(join(scenariosFolder, lane)).map((fileName) =>
      loadScenario(lane, fileName),
    ),
  );
