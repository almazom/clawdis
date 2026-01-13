# CLAWDIS Telegram Restart & Deployment Guide

## Overview

This document describes how to ensure CLAWDIS gateway runs with latest codebase on Telegram messenger without sudo requirements.

## Project Architecture

```
CLAWDIS v2.0.0-beta5
├── src/
│   ├── telegram/bot.ts          # Telegram bot (Grammy framework)
│   ├── infra/restart.ts         # macOS launchctl restart
│   ├── gateway/server.ts        # Main gateway server
│   └── commands/
├── dist/                        # Compiled JavaScript
├── scripts/
│   ├── restart-cli.sh           # NO SUDO restart script
│   ├── watchdog.sh              # Auto-restart with fallback
│   ├── health-check.sh          # Health verification
│   └── start-gateway.sh         # Gateway launcher
└── ecosystem.config.cjs         # PM2 config
```

## Restart Methods Comparison

| Method | Command | Sudo | Reliability |
|--------|---------|------|-------------|
| CLI Script | `./scripts/restart-cli.sh` | No | High |
| PM2 | `pm2 restart clawdis-gateway` | No | High |
| Watchdog | Auto (cron every 5 min) | No | High |
| Manual | `pkill clawdis && ./start-gateway.sh` | No | High |
| systemd | `sudo systemctl restart clawdis-gateway` | Yes | Highest |

## Recommended: restart-cli.sh

The **`restart-cli.sh`** script is the primary no-sudo restart mechanism:

```bash
cd /home/almaz/zoo_flow/clawdis
./scripts/restart-cli.sh
```

### What it does:

1. **Kills existing process**: `pkill -f "clawdis gateway"`
2. **Bundles assets**: `pnpm canvas:a2ui:bundle`
3. **Starts gateway**: Uses `fnm` with Node v22.21.1
4. **Health check**: Verifies gateway responds on port 18789
5. **Logs**: Output to `/tmp/clawdis-gateway.log`

### Health verification:

```bash
# Manual health check
./scripts/health-check.sh --json

# Output:
# {
#   "healthy": true,
#   "checks": {
#     "process": "ok",
#     "gateway_port": "ok",
#     "telegram_api": "ok",
#     ...
#   }
# }
```

## Watchdog: Auto-Restart with Fallback

The watchdog script (`scripts/watchdog.sh`) runs every 5 minutes via cron and:

1. **Checks health** via `health-check.sh`
2. **Verifies network** (proxy connections to Telegram)
3. **Checks Telegram API** (pending updates count)
4. **Restarts if needed** - tries systemctl first, falls back to manual

### Watchdog Fallback Logic (lines 162-167):

```bash
# Try systemctl first (requires sudo)
if sudo -n systemctl restart clawdis-gateway 2>/dev/null; then
    log "Service restarted via systemctl"
    return 0
fi

# Fallback: manual restart (NO SUDO)
pkill -f "clawdis gateway" 2>/dev/null || true
nohup "$SCRIPT_DIR/start-gateway.sh" >> "$LOG_DIR/gateway.log" &
```

### Cron setup:

```bash
# Add to crontab
*/5 * * * * /home/almaz/zoo_flow/clawdis/scripts/watchdog.sh
```

## Ensuring Latest Codebase

### Update + Restart Sequence:

```bash
cd /home/almaz/zoo_flow/clawdis

# 1. Pull latest changes
git pull

# 2. Install dependencies
pnpm install

# 3. Build (TS -> dist/)
pnpm build

# 4. Restart (no sudo)
./scripts/restart-cli.sh

# 5. Verify health
./scripts/health-check.sh --json
```

### Telegram Bot Health Indicators:

The bot exposes health via:
- Port 18789 responding
- `pnpm clawdis gateway health` command
- Telegram API `getMe` check

## publish_me CLI Tool

### Location:
- Wrapper: `/home/almaz/.local/bin/publish_me`
- Core: `/home/almaz/TOOLS/publish_to_web/html_me_v2.sh`

### Usage in Telegram Bot:

```typescript
// src/telegram/bot.ts:899-940
const cmd = `publish_me ${args} --slug "${slug}" "${tempFile}"`;
const { stdout } = await execAsync(cmd, { timeout: 30000 });
```

### Commands:
```bash
# Help
publish_me --help

# Publish content
publish_me --slug "my-slug" /path/to/file.md

# Returns JSON with url field
```

## AI Agent Confidence Checklist (95%+)

To be 95%+ sure the bot has latest code:

### Before Sending to Telegram:

```bash
# 1. Check git status for uncommitted changes
cd /home/almaz/zoo_flow/clawdis && git status --porcelain

# 2. Pull if needed
git pull origin main

# 3. Build if there were changes
pnpm build

# 4. Restart CLI gateway
./scripts/restart-cli.sh

# 5. Verify health
if ./scripts/health-check.sh --json | grep -q '"healthy": true'; then
    echo "Bot is ready with latest code"
else
    echo "WARNING: Bot health check failed"
fi
```

### Automated Script for AI Agents:

```bash
#!/bin/bash
# ensure_latest_bot.sh - Call this before any Telegram operation

set -euo pipefail

cd /home/almaz/zoo_flow/clawdis

# Check for updates
if ! git diff --quiet; then
    echo "Uncommitted changes detected, pulling..."
    git pull
    pnpm build
fi

# Restart if needed
if ! ./scripts/health-check.sh --json | grep -q '"healthy": true'; then
    echo "Bot unhealthy, restarting..."
    ./scripts/restart-cli.sh
    sleep 3
fi

# Final verification
./scripts/health-check.sh --json
```

## Health Check Endpoints

### Local CLI:

```bash
# Quick status
./scripts/health-check.sh

# Verbose
./scripts/health-check.sh --verbose

# JSON (for parsing)
./scripts/health-check.sh --json
```

### Gateway API:

```bash
# If gateway is running
curl http://localhost:18789/health
```

## Troubleshooting

### Bot not responding to Telegram:

1. Check process: `pgrep -af "clawdis gateway"`
2. Check ports: `ss -tuln | grep 18789`
3. Check logs: `tail -50 /tmp/clawdis-gateway.log`
4. Check Telegram: `./scripts/health-check.sh | grep telegram`

### Restart fails:

```bash
# Manual kill
pkill -9 -f "clawdis gateway"

# Manual start
cd /home/almaz/zoo_flow/clawdis
fnm exec --using v22.21.1 -- pnpm clawdis gateway --port 18789
```

### Telegram API issues:

```bash
# Check pending updates
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

## Summary for AI Agents

**To ensure Telegram bot has latest code:**

1. **Always run before Telegram operations:**
   ```bash
   cd /home/almaz/zoo_flow/clawdis && git pull && pnpm build
   ```

2. **Restart with no sudo:**
   ```bash
   ./scripts/restart-cli.sh
   ```

3. **Verify health:**
   ```bash
   ./scripts/health-check.sh --json
   ```

4. **Watchdog handles crashes automatically** (every 5 min)

**Confidence factors:**
- Process running: checked by `pgrep`
- Port listening: checked by `ss -tuln`
- Telegram API: checked by `curl getMe`
- Code freshness: confirmed by `git pull` + `pnpm build`
