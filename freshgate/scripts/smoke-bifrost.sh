#!/usr/bin/env bash
set -euo pipefail

BIFROST_URL="${BIFROST_URL:-http://localhost:8080}"
echo "==> Running Bifrost Smoke Test against $BIFROST_URL"

PROMPT='{"model":"gpt-4o","messages":[{"role":"user","content":"What is the latest version of Next.js?"}]}'

echo "1. First request (cache miss)..."
START_TIME=$(date +%s%N 2>/dev/null || python -c 'import time; print(int(time.time()*1e9))')
RESP1=$(curl -s -i "$BIFROST_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "x-bf-cache-key: smoke-test-key-1" \
  -H "x-freshgate-mode: async" \
  -d "$PROMPT")
END_TIME=$(date +%s%N 2>/dev/null || python -c 'import time; print(int(time.time()*1e9))')

echo "$RESP1" | head -n 15

if echo "$RESP1" | grep -iq "x-freshgate"; then
  echo "✓ FreshGate plugin header detected on first request"
fi

echo "2. Second request (expecting semantic cache hit)..."
RESP2=$(curl -s -i "$BIFROST_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "x-bf-cache-key: smoke-test-key-1" \
  -H "x-freshgate-mode: async" \
  -d "$PROMPT")

echo "$RESP2" | head -n 15

echo "✓ Bifrost smoke test finished successfully."
