#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_SRC="${ROOT_DIR}/clawdis-gateway.user.service"
WATCHDOG_SERVICE_SRC="${ROOT_DIR}/clawdis-watchdog.user.service"
WATCHDOG_TIMER_SRC="${ROOT_DIR}/clawdis-watchdog.user.timer"
SERVICE_DIR="${HOME}/.config/systemd/user"
SERVICE_DST="${SERVICE_DIR}/clawdis-gateway.service"
WATCHDOG_SERVICE_DST="${SERVICE_DIR}/clawdis-watchdog.service"
WATCHDOG_TIMER_DST="${SERVICE_DIR}/clawdis-watchdog.timer"

if [ ! -f "$SERVICE_SRC" ]; then
  echo "ERROR: service file not found: $SERVICE_SRC" >&2
  exit 1
fi

mkdir -p "$SERVICE_DIR"
cp -f "$SERVICE_SRC" "$SERVICE_DST"
if [ -f "$WATCHDOG_SERVICE_SRC" ] && [ -f "$WATCHDOG_TIMER_SRC" ]; then
  cp -f "$WATCHDOG_SERVICE_SRC" "$WATCHDOG_SERVICE_DST"
  cp -f "$WATCHDOG_TIMER_SRC" "$WATCHDOG_TIMER_DST"
fi

# Ensure a user systemd instance is available.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ] && [ -S "${XDG_RUNTIME_DIR}/bus" ]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"
fi

systemctl --user daemon-reload
systemctl --user enable --now clawdis-gateway.service
if [ -f "$WATCHDOG_TIMER_DST" ]; then
  systemctl --user enable --now clawdis-watchdog.timer
fi

# Best-effort linger enablement so the user service survives logouts.
if command -v loginctl >/dev/null 2>&1; then
  loginctl enable-linger "$USER" >/dev/null 2>&1 || true
fi

systemctl --user status clawdis-gateway.service --no-pager --full -n 20 || true
if [ -f "$WATCHDOG_TIMER_DST" ]; then
  systemctl --user status clawdis-watchdog.timer --no-pager --full -n 10 || true
fi
