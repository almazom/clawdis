#!/bin/bash
set -e

echo "=== Clawdis Telegram Bot Resume Script ==="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CLAWDIS_HOME="${CLAWDIS_HOME:-$HOME}"
CLAWDIS_DIR="${CLAWDIS_DIR:-${CLAWDIS_HOME}/.clawdis}"
CLAWDIS_ENV_FILE="${CLAWDIS_ENV_FILE:-${CLAWDIS_DIR}/secrets.env}"

load_env() {
    set +u
    if [ -n "${CLAWDIS_ENV_FILE:-}" ] && [ -f "$CLAWDIS_ENV_FILE" ]; then
        set -a
        source "$CLAWDIS_ENV_FILE"
        set +a
    fi
    if [ -f "${REPO_ROOT}/.env" ] && [ "${CLAWDIS_SKIP_DOTENV:-0}" != "1" ]; then
        set -a
        source "${REPO_ROOT}/.env"
        set +a
    fi
    set -u
}

load_env

GATEWAY_PORT="${CLAWDIS_GATEWAY_PORT:-18789}"
SYSTEMD_UNIT="${CLAWDIS_SYSTEMD_UNIT:-clawdis-gateway}"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if running as root for systemd commands
if [[ $EUID -eq 0 ]]; then
   print_error "Do not run this script as root (except for sudo commands)"
   exit 1
fi

echo "1. Checking prerequisites..."

# Verify pnpm exists
if command -v pnpm &> /dev/null; then
    print_success "pnpm found: $(which pnpm)"
else
    print_error "pnpm not found in PATH"
    echo "  Trying to locate manually..."
    PNPM_PATH="/home/almaz/.local/share/fnm/node-versions/v22.21.1/installation/bin/pnpm"
    if [ -f "$PNPM_PATH" ]; then
        echo "  Found at: $PNPM_PATH"
        export PATH="/home/almaz/.local/share/fnm/node-versions/v22.21.1/installation/bin:$PATH"
    else
        print_error "Cannot find pnpm. Please check Node.js installation."
        exit 1
    fi
fi

echo
echo "2. Checking service status..."
sudo systemctl status "$SYSTEMD_UNIT" --no-pager -l || true

echo
echo "3. Taking action..."
read -p "What would you like to do? (start/stop/restart/status/logs) [restart]: " ACTION
ACTION=${ACTION:-restart}

case $ACTION in
    start)
        echo "Starting Telegram bot service..."
        sudo systemctl start "$SYSTEMD_UNIT"
        print_success "Service start command issued"
        ;;
    stop)
        echo "Stopping Telegram bot service..."
        sudo systemctl stop "$SYSTEMD_UNIT"
        print_success "Service stop command issued"
        ;;
    restart)
        echo "Restarting Telegram bot service..."
        sudo systemctl daemon-reload
        sudo systemctl restart "$SYSTEMD_UNIT"
        print_success "Service restart command issued"
        ;;
    status)
        # Just show status
        ;;
    logs)
        echo "Following logs (press Ctrl+C to exit)..."
        sudo journalctl -u "$SYSTEMD_UNIT" -f
        exit 0
        ;;
    *)
        print_error "Invalid action: $ACTION"
        exit 1
        ;;
esac

echo
echo "4. Waiting for service to stabilize..."
sleep 3

echo
echo "5. Current service status:"
sudo systemctl status "$SYSTEMD_UNIT" --no-pager -l

echo
echo "6. Port status:"
if sudo ss -tulpn | grep -q ":${GATEWAY_PORT}"; then
    print_success "Gateway port ${GATEWAY_PORT} is listening"
else
    print_error "Gateway port ${GATEWAY_PORT} is NOT listening"
fi

echo
echo "7. Recent service logs:"
sudo journalctl -u "$SYSTEMD_UNIT" -n 20 --no-pager

echo
echo "8. Testing Telegram bot..."
read -p "Enter your Telegram user ID to test: " USER_ID
if [ -n "$USER_ID" ]; then
    echo "Sending test message..."
    cd "$REPO_ROOT"
    if pnpm clawdis send --provider telegram --to "$USER_ID" --message "Bot resumed successfully!"; then
        print_success "Test message sent successfully!"
    else
        print_error "Failed to send test message"
    fi
fi

echo
echo "=== Script completed ==="
echo
echo "Quick commands for future use:"
echo "  sudo systemctl status ${SYSTEMD_UNIT}    # Check status"
echo "  sudo journalctl -u ${SYSTEMD_UNIT} -f   # Follow logs"
echo "  sudo systemctl restart ${SYSTEMD_UNIT}  # Restart service"
echo "  sudo systemctl stop ${SYSTEMD_UNIT}     # Stop service"
echo "  sudo systemctl start ${SYSTEMD_UNIT}    # Start service"
