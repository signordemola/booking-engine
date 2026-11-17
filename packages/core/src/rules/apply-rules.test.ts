import { expect, test } from "vitest";
import { lashStudio, salon } from "../testing/demo-businesses.js";
import { toEpochMs } from "../time/time.js";
import {
  findBookAloneFindings,
  findConsentFindings,
  findFillWindowFindings,
  findNewClientDeposit,
  findPrerequisiteFindings,
} from "./apply-rules.js";
import type { ClientFacts } from "./client-facts-schema.js";

const noHistory: ClientFacts = { visits: [], prerequisites: [], consents: [] };

const withPatchTestAt = (...times: string[]): ClientFacts => ({
  ...noHistory,
  prerequisites: times.map((at) => ({ ruleId: "patch-test-for-lashes", at })),
});

const withVisits = (
  ...visits: { serviceId: string; at: string }[]
): ClientFacts => ({
  ...noHistory,
  visits,
});

const codesOf = (findings: { code: string }[]) =>
  findings.map((finding) => finding.code);

test("a service on its own breaks no book-alone rule", () => {
  expect(findBookAloneFindings(lashStudio, ["patch-test"])).toEqual([]);
  expect(
    findBookAloneFindings(lashStudio, ["hybrid-full-set", "lash-removal"]),
  ).toEqual([]);
});

test("a patch test cannot be booked together with another service", () => {
  expect(
    findBookAloneFindings(lashStudio, ["patch-test", "hybrid-full-set"]),
  ).toEqual([
    {
      code: "rule.book-alone",
      message: '"Patch test" must be booked on its own.',
    },
  ]);
});

test.each([
  {
    start: "2026-11-12T14:59:00Z",
    codes: ["rule.prerequisite-too-recent"],
    why: "47 hours 59 minutes after the test is one minute too soon",
  },
  {
    start: "2026-11-12T15:00:00Z",
    codes: [],
    why: "48 hours after the test is allowed",
  },
  {
    start: "2027-11-10T15:00:00Z",
    codes: [],
    why: "365 days after the test is the last valid day",
  },
  {
    start: "2027-11-10T15:01:00Z",
    codes: ["rule.prerequisite-out-of-date"],
    why: "one minute past 365 days needs a new test",
  },
])("a full set at $start: $why", ({ start, codes }) => {
  const client = withPatchTestAt("2026-11-10T15:00:00Z");
  const findings = findPrerequisiteFindings(
    lashStudio,
    ["hybrid-full-set"],
    client,
    toEpochMs(start),
  );

  expect(codesOf(findings)).toEqual(codes);
});

test.each([
  { client: undefined, who: "a client the platform knows nothing about" },
  { client: noHistory, who: "a client with no patch test" },
])("a full set is refused for $who", ({ client }) => {
  const start = toEpochMs("2026-11-21T15:00:00Z");

  expect(
    findPrerequisiteFindings(lashStudio, ["hybrid-full-set"], client, start),
  ).toEqual([
    {
      code: "rule.prerequisite-missing",
      message: '"Hybrid full set" needs this first: Patch test.',
    },
  ]);
});

test("the messages name the service, the rule and the numbers", () => {
  const client = withPatchTestAt("2026-11-10T15:00:00Z");
  const tooSoon = findPrerequisiteFindings(
    lashStudio,
    ["hybrid-full-set"],
    client,
    toEpochMs("2026-11-11T15:00:00Z"),
  );
  const tooLate = findPrerequisiteFindings(
    lashStudio,
    ["hybrid-full-set"],
    client,
    toEpochMs("2028-01-10T15:00:00Z"),
  );

  expect(tooSoon[0]?.message).toBe(
    '"Hybrid full set" must be at least 48 hours after this: Patch test.',
  );
  expect(tooLate[0]?.message).toBe(
    'Patch test is valid for 365 days. "Hybrid full set" needs a new one.',
  );
});

test("an old patch test does not block a client who also has a new one", () => {
  const client = withPatchTestAt(
    "2025-01-10T15:00:00Z",
    "2026-11-10T15:00:00Z",
  );
  const start = toEpochMs("2026-11-21T15:00:00Z");

  expect(
    findPrerequisiteFindings(lashStudio, ["hybrid-full-set"], client, start),
  ).toEqual([]);
});

test("a service with no prerequisite rule needs nothing", () => {
  const start = toEpochMs("2026-11-21T15:00:00Z");

  expect(
    findPrerequisiteFindings(lashStudio, ["lash-removal"], undefined, start),
  ).toEqual([]);
});

test("ombre brows must come after the consultation, with no waiting time", () => {
  const client: ClientFacts = {
    ...noHistory,
    prerequisites: [
      { ruleId: "consultation-for-brows", at: "2026-11-20T15:00:00Z" },
    ],
  };
  const before = findPrerequisiteFindings(
    lashStudio,
    ["ombre-brows"],
    client,
    toEpochMs("2026-11-20T14:00:00Z"),
  );
  const after = findPrerequisiteFindings(
    lashStudio,
    ["ombre-brows"],
    client,
    toEpochMs("2026-11-20T15:00:00Z"),
  );

  expect(before).toEqual([
    {
      code: "rule.prerequisite-too-recent",
      message: '"Ombre brows" must be after this: Brow consultation.',
    },
  ]);
  expect(after).toEqual([]);
});

test.each([
  {
    lastVisit: "2026-10-31T15:00:00Z",
    passed: false,
    why: "exactly 21 days is still a fill",
  },
  {
    lastVisit: "2026-10-31T14:59:00Z",
    passed: true,
    why: "21 days and one minute is too long",
  },
  {
    lastVisit: "2026-11-14T15:00:00Z",
    passed: false,
    why: "one week is well inside the window",
  },
])(
  "a fill on 21 November, last visit $lastVisit: $why",
  ({ lastVisit, passed }) => {
    const client = withVisits({ serviceId: "hybrid-full-set", at: lastVisit });
    const findings = findFillWindowFindings(
      lashStudio,
      ["hybrid-fill"],
      client,
      toEpochMs("2026-11-21T15:00:00Z"),
    );

    expect(findings.length > 0).toBe(passed);
  },
);

test.each([
  { client: undefined, who: "a client the platform knows nothing about" },
  { client: noHistory, who: "a client with no visits" },
  {
    client: withVisits({
      serviceId: "lash-removal",
      at: "2026-11-20T15:00:00Z",
    }),
    who: "a client whose last visit was a different service",
  },
  {
    client: withVisits({
      serviceId: "hybrid-full-set",
      at: "2026-11-28T15:00:00Z",
    }),
    who: "a client whose only full set is after this date",
  },
])("a fill is refused for $who", ({ client }) => {
  const at = toEpochMs("2026-11-21T15:00:00Z");

  expect(
    findFillWindowFindings(lashStudio, ["hybrid-fill"], client, at),
  ).toEqual([
    {
      code: "rule.fill-window-passed",
      message:
        '"Hybrid fill" is for visits within 21 days of the last one. Book "Hybrid full set" instead.',
    },
  ]);
});

test("a fill after an earlier fill counts from that fill", () => {
  const client = withVisits(
    { serviceId: "hybrid-full-set", at: "2026-10-01T15:00:00Z" },
    { serviceId: "hybrid-fill", at: "2026-11-07T15:00:00Z" },
  );
  const at = toEpochMs("2026-11-21T15:00:00Z");

  expect(
    findFillWindowFindings(lashStudio, ["hybrid-fill"], client, at),
  ).toEqual([]);
});

test("a full set is never blocked by the fill window", () => {
  const at = toEpochMs("2026-11-21T15:00:00Z");

  expect(
    findFillWindowFindings(lashStudio, ["hybrid-full-set"], undefined, at),
  ).toEqual([]);
});

test.each([
  { consents: [], signed: false, why: "nothing is signed" },
  {
    consents: [
      {
        ruleId: "pmu-consent",
        formVersion: "2025-06",
        signedAt: "2025-06-01T10:00:00Z",
      },
    ],
    signed: false,
    why: "the client signed an older version of the form",
  },
  {
    consents: [
      {
        ruleId: "pmu-consent",
        formVersion: "2026-01",
        signedAt: "2026-11-17T10:00:00Z",
      },
    ],
    signed: true,
    why: "the client signed the current version",
  },
])(
  "ombre brows can be booked: $signed, because $why",
  ({ consents, signed }) => {
    const findings = findConsentFindings(lashStudio, ["ombre-brows"], {
      ...noHistory,
      consents,
    });

    expect(findings.length === 0).toBe(signed);
  },
);

test("the consent message names the form and the service", () => {
  expect(findConsentFindings(lashStudio, ["ombre-brows"], undefined)).toEqual([
    {
      code: "rule.consent-required",
      message: 'Sign this before you book "Ombre brows": PMU consent form.',
    },
  ]);
  expect(findConsentFindings(lashStudio, ["lash-removal"], undefined)).toEqual(
    [],
  );
});

test.each([
  {
    client: undefined,
    deposit: undefined,
    who: "a client the platform knows nothing about",
  },
  {
    client: noHistory,
    deposit: { kind: "percentage", percent: 50 },
    who: "a new client",
  },
  {
    client: withVisits({ serviceId: "balayage", at: "2026-06-01T15:00:00Z" }),
    deposit: undefined,
    who: "a returning client",
  },
])(
  "the new-client deposit rule applies to $who: $deposit",
  ({ client, deposit }) => {
    expect(findNewClientDeposit(salon, client)).toEqual(deposit);
  },
);
