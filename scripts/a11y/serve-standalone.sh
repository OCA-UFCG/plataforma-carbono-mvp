#!/usr/bin/env sh
# Serves `next build`'s standalone output the way the Dockerfile's runner stage
# does. PORT defaults to 3000. server.js is looked up rather than assumed at
# .next/standalone/: in a worktree nested in another checkout, tracing infers
# the outer checkout as root and nests it.
set -eu
# As in the Dockerfile: server.js binds to $HOSTNAME, and CI runners set it to
# the machine's name, which localhost does not reach.
export HOSTNAME=0.0.0.0
server=$(find .next/standalone -name server.js -not -path '*/node_modules/*' 2>/dev/null | head -n 1)
# Without a build `server` is empty and dirname turns it into ".", which would
# copy public/ and .next/static into the checkout itself.
[ -n "$server" ] || { echo "no standalone server.js under .next/standalone; run npm run build first" >&2; exit 1; }
dir=$(dirname "$server")
cp -R public "$dir/"
mkdir -p "$dir/.next"
cp -R .next/static "$dir/.next/"
cd "$dir"
exec node server.js
