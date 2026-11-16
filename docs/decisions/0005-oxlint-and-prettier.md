# oxlint for linting, Prettier for formatting

We lint with oxlint 1.93.0 and its type-aware add-on `oxlint-tsgolint`. ESLint with typescript-eslint is the usual choice, but typescript-eslint needs the TypeScript programmatic API, and TypeScript 7.0 does not have one. oxlint runs the same type-aware rules (for example `no-floating-promises`) on TypeScript 7 and stays fast as the code grows.

The config enforces the house rules with tools, not memory: kebab-case file names, arrow functions, no `any`, no import cycles, no forgotten `await`.

We format with Prettier 3.10.1 and its default style, so there is no style to argue about. We rejected Biome (one tool for both jobs) because its type-aware rules are fewer.
