#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
ROOT="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
cd "$ROOT"

pnpm build

if command -v restart-ai >/dev/null 2>&1; then
  restart-ai --check-only --json || true
  restart-ai
else
  echo "restart-ai not found; build completed but gateway not restarted." >&2
fi
