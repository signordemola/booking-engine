# Node 26 LTS for development, Node 24 and 26 supported

Node 26 is the newest LTS line (checked on nodejs.org, 2026-11-16), so it has the longest support window. `.nvmrc` pins it for development. `engines` allows Node 24 and later, because Node 24 is also an LTS line and users of the library may still run it. CI will test both.
