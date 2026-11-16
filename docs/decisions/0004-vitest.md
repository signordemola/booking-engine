# Vitest as the test runner

We use Vitest 5.1.0. It runs TypeScript tests with no build step, runs test files in parallel, and has watch mode, fake timers and coverage. We rejected the built-in `node:test` runner: it has zero dependencies, but its coverage and TypeScript support are thinner.

There is no `vitest.config.ts`. The defaults find every `*.test.ts` file in a package, and each test file sits next to the code it tests. We add a config file when a real need appears (for example coverage thresholds).
