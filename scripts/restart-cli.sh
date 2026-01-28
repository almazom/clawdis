#!/usr/bin/env bash
# Simple CLI gateway restart (no macOS app build required).

set -euo pipefail

# Ensure fnm and pnpm are available
eval "$(fnm env --shell bash)" 2>/dev/null || true

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATEWAY_PID_FILE="/tmp/clawdis-gateway.pid"
GATEWAY_PORT="${CLAWDIS_GATEWAY_PORT:-18789}"
GATEWAY_URL="ws://127.0.0.1:${GATEWAY_PORT}"
LOG_FILE="/tmp/clawdis-gateway.log"

log()  { printf '%s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

cd "${ROOT_DIR}"

# Ensure secrets are available for the startup script.
export CLAWDIS_ENV_FILE="${CLAWDIS_ENV_FILE:-${HOME}/.clawdis/secrets.env}"

# Kill existing CLI gateway processes
pkill -f "clawdis gateway" 2>/dev/null || true
sleep 0.5

# Bundle canvas assets
log "==> bundle canvas a2ui"
pnpm canvas:a2ui:bundle >/dev/null 2>&1 || log "  (canvas bundle skipped or up to date)"

# Start gateway in background with logging
log "==> starting CLI gateway on port ${GATEWAY_PORT}"
nohup "${ROOT_DIR}/scripts/start-gateway.sh" >"${LOG_FILE}" 2>&1 &
GATEWAY_PID=$!
echo "${GATEWAY_PID}" > "${GATEWAY_PID_FILE}"

# Wait and verify health
sleep 2
if pnpm clawdis gateway health --url "${GATEWAY_URL}" >/dev/null 2>&1; then
  log "OK: CLI gateway is running (PID ${GATEWAY_PID})"
  log "    Log: ${LOG_FILE}"
else
  fail "Gateway health check failed. Check ${LOG_FILE}"
fi
