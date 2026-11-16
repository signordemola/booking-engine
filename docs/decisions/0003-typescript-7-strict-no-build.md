# TypeScript 7 in strict mode, type check only, no build step yet

We use TypeScript 7.0.2, the native compiler, because it is the current stable release and its type check stays fast as the code grows. TypeScript 7.0 has no programmatic API, so tools that need one (typescript-eslint) do not work with it; that is why the linter is oxlint. We rejected TypeScript 6.0 because it is the last release of the old compiler.

`strict` is on, with three more flags that `strict` does not include: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitOverride`.

`tsc` only checks types (`noEmit`). The package exports `src/index.ts` directly and is marked `private`. We add a build to `dist/` and choose the published package name when we first publish to npm.
