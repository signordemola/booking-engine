# One pure core, with thin products on top

The same booking logic must serve client builds, tools for AI agents, a policy simulator and a test suite. So the engine is one pure core: each capability is a function from settings, facts and a request to an answer with its reasons, in plain JSON. Real cases live as data files that run as tests. Saving is the platform's job, behind three promises a store must keep. See `docs/architecture.md`.

We rejected building a hosted booking service first: it needs hosting, support and customers before the logic is proven. We rejected use cases that call a database through interfaces inside the core: every product would then need a database to get an answer, and a scenario could not be a plain file.
