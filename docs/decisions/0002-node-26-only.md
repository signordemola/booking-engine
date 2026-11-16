# Node 26 LTS only

Node 26 is the newest LTS line (checked on nodejs.org, 2026-11-16), so it has the longest support window. It is also the first Node version with `Temporal` on by default, and the engine uses `Temporal` for all dates and times (see 0007). So `engines` requires Node 26 or later, `.nvmrc` pins it, and CI tests it.

We first planned to support Node 24 too. We dropped it because Node 24 has no `Temporal`, and a polyfill would be a dependency in every calculation the engine makes.
