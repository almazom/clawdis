#!/bin/bash
# Clawdis Gateway Startup Script
# This script ensures the correct Node.js version is used and starts the gateway

set -euo pipefail

# Configuration
NODE_VERSION="v22.21.1"
FNM_BASE="/home/almaz/.local/share/fnm/node-versions"
NODE_PATH="${FNM_BASE}/${NODE_VERSION}/installation/bin"
WORK_DIR="/home/almaz/zoo_flow/clawdis"
LOG_PREFIX="[start-gateway]"

log() {
    echo "${LOG_PREFIX} $(date '+%Y-%m-%d %H:%M:%S') $*"
}

error() {
    echo "${LOG_PREFIX} ERROR: $*" >&2
}

# Verify Node.js installation
if [ ! -d "$NODE_PATH" ]; then
    error "Node.js ${NODE_VERSION} not found at ${NODE_PATH}"
    error "Available versions:"
    ls -la "$FNM_BASE" 2>/dev/null || error "FNM base directory not found"
    exit 1
fi

# Set PATH to include correct Node.js version and user tools
EXTRA_PATHS="/home/almaz/bin:/home/almaz/.local/bin"
export PATH="${NODE_PATH}:${EXTRA_PATHS}:$PATH"

# Verify Node.js version
ACTUAL_VERSION=$(node --version 2>/dev/null || echo "unknown")
if [ "$ACTUAL_VERSION" != "$NODE_VERSION" ]; then
    error "Node.js version mismatch: expected ${NODE_VERSION}, got ${ACTUAL_VERSION}"
    exit 1
fi

log "Using Node.js ${ACTUAL_VERSION}"

# Change to working directory
if [ ! -d "$WORK_DIR" ]; then
    error "Working directory not found: ${WORK_DIR}"
    exit 1
fi
cd "$WORK_DIR"

# Ensure only one gateway instance runs at a time.
LOCK_FILE="${CLAWDIS_GATEWAY_LOCK_FILE:-/tmp/clawdis-gateway.lock}"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    error "Gateway lock held at ${LOCK_FILE}; another instance is running"
    exit 1
fi
echo $$ >&9

# Load environment files (optional)
if [ -n "${CLAWDIS_ENV_FILE:-}" ] && [ -f "$CLAWDIS_ENV_FILE" ]; then
    set -a
    source "$CLAWDIS_ENV_FILE"
    set +a
    log "Loaded env file: ${CLAWDIS_ENV_FILE}"
fi

if [ -f ".env" ] && [ "${CLAWDIS_SKIP_DOTENV:-0}" != "1" ]; then
    set -a
    source "$WORK_DIR/.env"
    set +a
    log "Loaded .env file"
fi

# Port profile
GATEWAY_PORT="${CLAWDIS_GATEWAY_PORT:-18789}"
BRIDGE_PORT="${CLAWDIS_BRIDGE_PORT:-$((GATEWAY_PORT + 1))}"
BROWSER_PORT="${CLAWDIS_BROWSER_PORT:-$((GATEWAY_PORT + 2))}"
CANVAS_PORT="${CLAWDIS_CANVAS_HOST_PORT:-$((GATEWAY_PORT + 4))}"
BROWSER_CONTROL_URL="${CLAWDIS_BROWSER_CONTROL_URL:-http://127.0.0.1:${BROWSER_PORT}}"

export CLAWDIS_GATEWAY_PORT="${GATEWAY_PORT}"
export CLAWDIS_BRIDGE_PORT="${BRIDGE_PORT}"
export CLAWDIS_CANVAS_HOST_PORT="${CANVAS_PORT}"
export CLAWDIS_BROWSER_CONTROL_URL="${BROWSER_CONTROL_URL}"

# Verify critical environment variables
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
    error "TELEGRAM_BOT_TOKEN not set"
    exit 1
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    error "ANTHROPIC_API_KEY not set"
    exit 1
fi

log "Starting gateway on port ${GATEWAY_PORT}..."
log "Ports: bridge=${BRIDGE_PORT} browser=${BROWSER_CONTROL_URL} canvas=${CANVAS_PORT}"

# Prefer compiled dist to avoid tsx/esbuild overhead in production.
DIST_ENTRY="${WORK_DIR}/dist/index.js"
if [ -f "$DIST_ENTRY" ]; then
    log "Using compiled gateway entry: ${DIST_ENTRY}"
    exec node "$DIST_ENTRY" gateway --port "${GATEWAY_PORT}" --allow-unconfigured --verbose
fi

# Fallback to tsx via pnpm (dev mode)
PNPM_PATH="${NODE_PATH}/pnpm"
if [ ! -f "$PNPM_PATH" ]; then
    error "pnpm not found at ${PNPM_PATH}"
    exit 1
fi
log "Compiled entry missing; falling back to pnpm/tsx"
exec "$PNPM_PATH" clawdis gateway --port "${GATEWAY_PORT}" --allow-unconfigured
