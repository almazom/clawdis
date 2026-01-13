# E2E Telegram Tools Suite

## Overview

CLI tools for end-to-end testing of CLAWDIS Telegram bot.

## Tools

| Tool | Purpose |
|------|---------|
| `tlge2e` | Send commands and fetch responses |
| `ai-club-e2e` | Full loop: detect → fix → verify → retry |
| `restart-ai` | Restart gateway with confidence scoring |

## tlge2e - Telegram E2E Wrapper

**Location:** `/home/almaz/.local/bin/tlge2e`

### Usage

```bash
tlge2e ping        # Send /ping, fetch, report
tlge2e ai_day      # Send /ai_day, fetch, report
tlge2e ai_week     # Send /ai_week, fetch, report
tlge2e send "msg"  # Send custom message
tlge2e fetch 5     # Fetch last 5 messages
tlge2e loop        # Interactive mode
tlge2e help        # Show help
```

### Configuration (No Hardcoding)

**Config file** (`~/.tlge2e.conf`):
```bash
BOT_NAME="@Lana_smartai_bot"
```

**Environment variable:**
```bash
export TELEGRAM_E2E_BOT="@Lana_smartai_bot"
tlge2e ping
```

## ai-club-e2e - Full E2E Loop

**Location:** `/home/almaz/.local/bin/ai-club-e2e`

Full automated loop for debugging AI Club commands:

```
Detect → Investigate → Fix → Verify → Retry
```

### Usage

```bash
ai-club-e2e day          # Test /ai_day
ai-club-e2e week         # Test /ai_week
ai-club-e2e day --max-retries 5
```

### Flow

```
1. Health Check (restart-ai --check-only)
2. Send /ai_day to bot
3. Fetch response
4. If failed:
   - Check logs
   - Restart bot (restart-ai)
   - Retry
5. Report result
```

## restart-ai - Gateway Restart Tool

**Location:** `/home/almaz/.local/bin/restart-ai`

### Usage

```bash
restart-ai --check-only    # Health check
restart-ai --verbose       # Verbose output
restart-ai --json          # JSON for AI
restart-ai                 # Full update + restart
```

### Confidence Scoring (0-100%)

| Check | Points |
|-------|--------|
| Process running | 25 |
| Port 18789 listening | 25 |
| Health check passing | 30 |
| Git changes | 10 |
| Build exists | 10 |

## Quick Reference

```bash
# 1. Check if bot is ready
restart-ai --check-only

# 2. Send command
tlge2e ai_day

# 3. Full debug loop
ai-club-e2e day
```

## Files

```
/home/almaz/.local/bin/tlge2e           # E2E wrapper
/home/almaz/.local/bin/ai-club-e2e      # Full loop
/home/almaz/.local/bin/restart-ai       # Gateway restart
~/.tlge2e.conf                         # Config file
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `TELEGRAM_E2E_BOT` | Bot name | @Lana_smartai_bot |
| `MAX_RETRIES` | Max retry attempts | 3 |
| `TELEGRAM_API_ID` | telega_v2 auth | from .env |
| `TELEGRAM_API_HASH` | telega_v2 auth | from .env |

## Examples

### Interactive Session

```bash
$ tlge2e loop
=== E2E Loop ===
Bot: @Lana_smartai_bot
Commands: ping, ai_day, ai_week, fetch, quit
> ping
→ Sending /ping...
[Response...]
> ai_day
→ Sending /ai_day...
[Response...]
> quit
Goodbye!
```

### Automated Debug Loop

```bash
$ ai-club-e2e day
========================================
  AI Club E2E Loop: /ai_day
========================================

--- Attempt 1/3 ---

=== Step 1: Health Check ===
[OK] Confidence: 100% - READY

=== Step 2: Sending /ai_day ===
[Response: ✂︎ Не удалось получить отчёт...]

[WARN] Command failed, investigating...
=== Step 3: Investigating ===
[OK] No recent errors found

=== Step 4: Fixing ===
[restart-ai] Restarting...

--- Attempt 2/3 ---

[SUCCESS: /ai_day is working!]
```
