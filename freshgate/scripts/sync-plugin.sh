#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BIFROST_DIR="$(dirname "$ROOT_DIR")/bifrost"

echo "==> Syncing FreshGate plugin to Bifrost workspace..."

if [ -d "$BIFROST_DIR" ]; then
  mkdir -p "$BIFROST_DIR/plugins/freshgate"
  cp -r "$ROOT_DIR/plugin/freshgate/"* "$BIFROST_DIR/plugins/freshgate/"
  echo "✓ Copied plugin files to $BIFROST_DIR/plugins/freshgate"

  if [ -f "$ROOT_DIR/deploy/bifrost/freshgate.patch" ]; then
    echo "Applying registration patch if needed..."
    git -C "$BIFROST_DIR" apply --ignore-whitespace --check "$ROOT_DIR/deploy/bifrost/freshgate.patch" 2>/dev/null && \
    git -C "$BIFROST_DIR" apply "$ROOT_DIR/deploy/bifrost/freshgate.patch" || echo "Patch already applied or skipped"
  fi
else
  echo "Bifrost directory at $BIFROST_DIR not present; Docker build pipeline uses plugin directly."
fi

echo "✓ Sync complete."
