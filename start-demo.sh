#!/usr/bin/env bash
set -e

echo "======================================================="
echo " FreshGate + FreshLens: Unified Hackathon Demo Launcher"
echo "======================================================="
echo ""

echo "Starting FreshGate Engine (port 8787)..."
(cd freshgate/engine && ENGINE_MOCK=1 pnpm dev) &
PID_ENGINE=$!

sleep 2

echo "Starting FreshGate Dashboard (port 3000)..."
(cd freshgate/dashboard && pnpm dev) &
PID_DASHBOARD=$!

sleep 2

echo "Starting FreshGate Interactive Demo (port 3001)..."
(cd freshgate/demo && pnpm dev) &
PID_DEMO=$!

echo ""
echo "All services launched!"
echo "- FreshGate Engine:       http://localhost:8787/healthz"
echo "- FreshGate Dashboard:    http://localhost:3000/overview"
echo "- Interactive Demo App:   http://localhost:3001"
echo ""
echo "FreshLens Chrome Extension:"
echo "- Load unpacked from: freshlens/.output/chrome-mv3"
echo ""

trap "kill $PID_ENGINE $PID_DASHBOARD $PID_DEMO 2>/dev/null" EXIT
wait
