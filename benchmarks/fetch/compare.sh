#!/bin/bash
# Compare app.fetch() between the working tree and a git ref (default: main).
#
# Each measurement runs in a fresh process, and the variant order is
# reversed on every round, so that same-process JIT/GC warm-up and
# execution order do not bias the results.
#
# Usage: ./compare.sh [ref]
#        RUNTIME=node ROUNDS=5 ./compare.sh [ref]
set -e
cd "$(dirname "$0")"

REF=${1:-main}
RUNTIME=${RUNTIME:-bun}
ROUNDS=${ROUNDS:-3}
ROOT=$(git rev-parse --show-toplevel)
WT=$(mktemp -d)/hono-base
RESULTS=$(mktemp)

cleanup() {
  git -C "$ROOT" worktree remove --force "$WT" 2>/dev/null || true
  rm -f "$RESULTS"
}
trap cleanup EXIT

git -C "$ROOT" worktree add --detach -q "$WT" "$REF"

run_variant() { # <label> <src>
  HONO_JSON=1 HONO_LABEL="$1" HONO_SRC="$2" $RUNTIME ./bench.mts >>"$RESULTS" 2>/dev/null
}

for ((i = 1; i <= ROUNDS; i++)); do
  if ((i % 2)); then
    echo "round $i/$ROUNDS: $REF -> dev" >&2
    run_variant "$REF" "$WT/src"
    run_variant "dev" "$ROOT/src"
  else
    echo "round $i/$ROUNDS: dev -> $REF" >&2
    run_variant "dev" "$ROOT/src"
    run_variant "$REF" "$WT/src"
  fi
done

$RUNTIME ./summarize.mts "$RESULTS" "$REF"
