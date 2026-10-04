#!/bin/sh
set -eu
lock=$(node --experimental-strip-types scripts/accounts/lock-path.ts)
mkdir -p "$(dirname "$lock")"
# The kernel releases this lock on process exit, including a forced stop.
# --no-fork keeps the app as PID 1 and forwards container signals directly.
exec flock --nonblock --no-fork --conflict-exit-code 73 "$lock" "$@"
