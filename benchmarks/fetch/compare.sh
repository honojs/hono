#!/bin/bash
# Compare app.fetch() between the working tree and a git ref (default: main).
# Usage: ./compare.sh [ref]
#        RUNTIME=node ./compare.sh [ref]
set -e
cd "$(dirname "$0")"

REF=${1:-main}
RUNTIME=${RUNTIME:-bun}
ROOT=$(git rev-parse --show-toplevel)
WT=$(mktemp -d)/hono-base

cleanup() {
  git -C "$ROOT" worktree remove --force "$WT" 2>/dev/null || true
}
trap cleanup EXIT

git -C "$ROOT" worktree add --detach -q "$WT" "$REF"

HONO_BASE_SRC="$WT/src" HONO_BASE_REF="$REF" $RUNTIME ./bench.mts
