#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================================="
echo " FreshGate Hackathon Demo Environment Launcher"
echo "=========================================================="

echo "1. Checking preflight environment..."
docker --version >/dev/null 2>&1 || { echo "Error: docker is required."; exit 1; }
node -v >/dev/null 2>&1 || { echo "Error: node is required."; exit 1; }
pnpm -v >/dev/null 2>&1 || { echo "Error: pnpm is required."; exit 1; }

echo "2. Validating environment configuration..."
if [ ! -f "$ROOT_DIR/deploy/.env" ]; then
  if [ -f "$ROOT_DIR/deploy/.env.example" ]; then
    echo "Creating deploy/.env from .env.example..."
    cp "$ROOT_DIR/deploy/.env.example" "$ROOT_DIR/deploy/.env"
  fi
fi

echo "3. Starting services (Engine, Dashboard, Valkey, Bifrost Gateway)..."
cd "$ROOT_DIR/deploy"
docker compose --profile mock up -d valkey engine dashboard

echo "4. Seeding engine database with demonstration records..."
pnpm -C "$ROOT_DIR/engine" seed

echo "=========================================================="
echo " FreshGate Services Online:"
echo " - Dashboard:   http://localhost:3000"
echo " - Demo App:    http://localhost:3001"
echo " - Engine API:  http://localhost:8787/healthz"
echo " - Bifrost:     http://localhost:8080"
echo "=========================================================="
echo "✓ Demo environment is ready."
