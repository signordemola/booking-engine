# pnpm workspace from the first commit

The repo will hold the core engine, adapters (Postgres, Stripe) and example apps. We use a pnpm workspace now, with one package, because a later move changes every path. pnpm is strict: a package cannot import a dependency it did not declare, which matters for a library other people install. We rejected npm workspaces (less strict) and Turborepo (no benefit with one package; add it when CI becomes slow).

Installs wait 24 hours after a release (`minimumReleaseAge: 1440`) and refuse a version with weaker provenance than earlier ones (`trustPolicy: no-downgrade`). This lowers the risk from a compromised npm package.
