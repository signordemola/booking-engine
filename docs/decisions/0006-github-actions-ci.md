# One GitHub Actions job runs the same scripts as a developer

CI runs four `package.json` scripts on every push to `main` and every pull request: `format:check`, `lint`, `typecheck`, `test`. A developer runs the same scripts, so "passes on my machine" and "passes in CI" mean the same thing. The job runs on Node 24 and Node 26, the two versions we support.

Actions are pinned by commit SHA, not by tag, because a tag can be moved to different code. `pnpm/setup` installs pnpm and Node in one step and fails if the lockfile does not match `package.json`.

We rejected one job per check: it is faster with a large codebase, but it repeats the install four times. Split the job when CI becomes slow.
