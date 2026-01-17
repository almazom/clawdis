#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
ROOT="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"
cd "$ROOT"

pnpm exec tsc -p tsconfig.json

if [[ "${1:-}" == "--full" ]]; then
  pnpm exec tsx scripts/canvas-a2ui-copy.ts
fi
