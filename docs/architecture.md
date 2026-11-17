# Architecture

One core, many products.

## The idea

The engine holds the hard booking logic once: price, deposit, tax, free times, booking rules and policies. Everything else is a thin layer that calls it. A booking app, a tool for an AI agent, a policy simulator and a test suite all get the same answer, because they all ask the same code.

The engine is pure. It does not save data, read a clock, take a payment or send a message. It takes plain data and returns plain data. That is what keeps the layers above it thin.

## The layers

```text
PRODUCTS (thin)   booking apps . AI agent tools . simulator . hosted API . benchmark
                                        |
PLATFORM KIT      a store that saves bookings safely (in memory first, then Postgres)
                                        |
OPERATIONS        one list: a name, the shape of the input, one pure function
                                        |
CORE              money . settings . quotes . slots . bookings . rules . policies . follow-ups

SCENARIOS         real cases as data files. They test the core and feed the products.
```

Code depends downward only. The core imports nothing from the layers above it.

| Layer        | Where                    | Status   |
| ------------ | ------------------------ | -------- |
| Core         | `packages/core`          | Building |
| Operations   | `packages/core`          | Building |
| Scenarios    | `scenarios/`             | Building |
| Platform kit | `packages/store`         | Designed |
| Products     | `packages/mcp`, `apps/*` | Designed |

## The five contracts

A contract is a promise that the other layers build on. These five are hard to change later, so we fix them first.

### 1. Every capability is one pure operation

An operation takes three things and returns one answer.

| Input        | What it is                                                               |
| ------------ | ------------------------------------------------------------------------ |
| **settings** | The owner's rules: services, add-ons, deposits, tax, hours, policies.    |
| **facts**    | What is true now: the time, the existing bookings, the client's history. |
| **request**  | What someone asks: "quote this", "which times are free", "book this".    |

- The same input always gives the same answer. The time is a fact that the caller passes in, so the engine never reads a clock.
- The engine never saves. For a booking or a cancellation, the answer lists **what to save** and **which events happened**. The platform saves them.
- Input and output are plain JSON. Dates and times cross the boundary as text, for example `2026-11-21T16:00:00Z`, `09:30` and `Europe/London`.

Each operation also has a name and a description of its input (a Zod schema). So one definition can serve a TypeScript caller, an AI agent tool, an API route and a scenario file.

### 2. Every answer gives its reasons

- An answer names the rule that produced each number or decision, for example "the service has its own deposit rule: 25%".
- A refusal names the rule that blocked it, for example "this service needs a patch test at least 48 hours before".
- Each reason has a short stable code, such as `deposit.service-rule`, and a plain message. A platform can translate the message; an AI agent can act on the code.

### 3. The owner's settings are one versioned document

- The owner changes rules in an admin screen. No developer changes code.
- Each rule is one of a fixed set of kinds. There is no free rule language.
- Rules apply in layers, most specific first: client group, staff or level, service, category, business default.
- A booking keeps a copy of the rules it used. A later change never alters an existing booking.
- The document has a version number. The engine publishes its shape as a JSON Schema file, so other tools can read and check it.

### 4. Real cases are data files

A scenario is one JSON file: a business, some facts, a request and the expected answer, with a link to where the case comes from (a competitor's help page, an official rule, or a promise on demolastudio.com).

```text
scenarios/
  businesses/     the demo businesses: a lash studio first; a salon, a studio hire and a photographer later
  lash/           one file per real case
  salon/          (later)
  studio-hire/    (later)
  photographer/   (later)
```

One test runs every file against the engine. The same files can later feed a page of examples, the policy simulator, a benchmark for AI models, and practice exercises. Tests stored as data are a proven idea: the JSON Schema project tests every implementation of its standard this way.

### 5. The platform must save safely

The engine decides. The platform saves. For that to be safe under load, a store must keep three promises:

1. Two active bookings for the same resource never overlap. The database enforces this, not only the code.
2. A retry with the same key never makes a second booking or a second charge.
3. Everything from one decision is saved together, or nothing is.

The in-memory store proves these promises in tests, with many requests at the same moment. The Postgres store keeps them with a database rule on the business, the resource and the time range. PostgreSQL 18 has a built-in form for this (`WITHOUT OVERLAPS`); we verify the exact form when we build that store.

## The core, module by module

| Module       | Its job                                                         | Status   |
| ------------ | --------------------------------------------------------------- | -------- |
| `lib`        | The result shape and plain errors                               | Built    |
| `money`      | Exact percentages, rounded half-up                              | Built    |
| `settings`   | Check the owner's settings                                      | Built    |
| `quotes`     | Line items, total, deposit, tax, balance                        | Built    |
| `time`       | The only place that touches `Temporal`                          | Designed |
| `slots`      | Free start times from hours, breaks, closures, gaps, bookings   | Designed |
| `bookings`   | Decide a booking, a hold, a status change                       | Designed |
| `rules`      | Patch test, consultation, consent, book-alone, fill or full set | Designed |
| `policies`   | Cancellation, refund, reschedule                                | Designed |
| `follow-ups` | What message or action is due, and when                         | Designed |

Imports go one way: `lib`, then `money`, then `settings`, then the feature modules. The linter will enforce the order.

## Where new rules plug in

A rule can act at four moments. Each rule kind implements only the moments it needs.

| Moment        | Question it answers                         | Example                                              |
| ------------- | ------------------------------------------- | ---------------------------------------------------- |
| **Price**     | What does this cost, and what is due today? | A fill past the fill window is priced as a full set. |
| **Time**      | Which times can this client pick?           | Only times at least 48 hours after the patch test.   |
| **Gate**      | May this booking go ahead?                  | Not until the consent form is signed.                |
| **Follow-up** | What happens later?                         | A top-up reminder after six weeks.                   |

A new rule kind is one new file plus one new entry in the settings. The slot search and the quote do not change. A hook for a client's own custom code can later use the same four moments.

## How it scales

| What grows           | What handles it                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Businesses           | Every settings document and every record carries a business id. Tests prove data never mixes.                                           |
| Bookings             | The engine asks only for one time window. The search uses sorted time ranges. A test runs it against 10,000 bookings.                   |
| Requests             | Pure functions keep nothing in memory between calls, so more servers can be added. The database rule and retry keys keep bookings safe. |
| Rules                | Fixed rule kinds at four moments. Settings carry a version.                                                                             |
| Products             | One list of operations serves the library, AI agent tools, an API and the scenarios.                                                    |
| Readers and AI tools | Small files, one job each. A reading guide. Scenarios as worked examples.                                                               |
| Releases             | Semantic versions, a changelog, and a test that fails when the public API changes by accident.                                          |

## Known limits

- **Safari has no built-in `Temporal` yet.** Chrome, Firefox, Edge, Node 26 and Deno have it. The engine touches `Temporal` in one module only, so a browser product can load a polyfill until Safari ships it.
- **The engine does not know tax law.** It applies the rate and the mode a business sets.
- **Before version 1.0, the settings shape and the reason codes can still change.**
