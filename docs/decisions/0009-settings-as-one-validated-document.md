# Business settings are one validated document

The owner's rules (services, add-ons, deposit rules) are data, not code. A platform stores them as one document, and `parseSettings` checks that document before the engine uses it. So an owner can change a rule in an admin screen and no developer changes code.

We validate with Zod 4, the engine's first runtime dependency: one schema gives both the runtime check and the TypeScript types, so the two cannot disagree. The public function returns the engine's own result shape (`ok` with a value, or a list of errors with a path and a plain message), not a Zod type, so a platform does not depend on our Zod version.

Three choices a reader might not expect. The document is strict: an unknown setting is an error, because a typing mistake such as `depositt` must not be ignored in silence. Every problem is reported in one pass, so an owner can fix them all at once. The document carries a `version` number, so a later engine can change the shape and still read old documents.

Each rule is one of a fixed set of kinds (a deposit is `none`, `percentage`, `fixed` or `full`). We rejected a free rule language: an owner cannot use it safely and nobody can test every combination.
