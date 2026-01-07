# GLM Agent (Z.AI Claude)

**Date:** 2026-01-06
**Status:** ✅ WORKING

## Overview

GLM is a Claude-based AI agent from Z.AI (智谱AI), integrated into the multi-agent web search system.

## Configuration

### API Configuration

| Setting | Value |
|---------|-------|
| Base URL | `https://api.z.ai/api/anthropic` |
| Model | `glm-4.7` |
| Env Variable | `ANTHROPIC_ZAI_API_KEY` |
| Secrets File | `/home/almaz/.clawdis/secrets.env` |

### Agent Definition

```typescript
const AGENTS = [
  { name: 'glm', script: 'glm_cli_web', display: 'GLM Claude', emoji: '🪄' },
];
```

## Wrapper Script

**Location:** `scripts/ai-wrappers/glm_cli_web`

### Features

| Feature | Status |
|---------|--------|
| Timeout wrapper | ✅ 60s default |
| Error handling | ✅ JSON errors |
| Secrets loading | ✅ Loads from secrets.env |
| Output format | ✅ JSON (Claude CLI format) |

### Script Structure

```bash
#!/bin/bash
# Load secrets
source /home/almaz/.clawdis/secrets.env

# Set environment
export ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
export ANTHROPIC_AUTH_TOKEN="${ANTHROPIC_ZAI_API_KEY:-}"
export ANTHROPIC_DEFAULT_SONNET_MODEL=glm-4.7

# Execute with timeout
timeout 60 claude -p "use web search for: $QUERY" \
  --output-format json
```

## Debugging Commands

### Test GLM Agent

```bash
# Load secrets and test
source /home/almaz/.clawdis/secrets.env
timeout 30 /home/almaz/zoo_flow/clawdis/scripts/ai-wrappers/glm_cli_web "test query"

# Check API key
echo $ANTHROPIC_ZAI_API_KEY | head -c 20
```

### Check Logs

```bash
# Real-time logs
make bot-logs | grep GLM

# Error logs
grep GLM ~/.clawdis/gateway-error.log
```

## Known Issues

### Historical Issues (FIXED)

| Issue | Root Cause | Solution |
|-------|------------|----------|
| GLM fails silently | API key not loaded | Load secrets.env in script |
| No timeout | Script hangs forever | Add `timeout` command |
| No error handling | Exit codes ignored | Add error JSON output |

### Current Behavior

- ✅ Returns valid JSON with `{"type": "success", ...}` structure
- ✅ Response time: ~42s for complex queries
- ✅ Russian language output supported
- ✅ Web search and fetch tools work

## Performance

### Typical Response Times

| Query Type | Duration |
|------------|----------|
| Simple test | ~17s |
| Complex (Python 3.12) | ~42s |
| Timeout limit | 60s |

### Quality Assessment

- ✅ Comprehensive responses
- ✅ Good source citation
- ✅ Russian language excellent
- ⏳ May be slower than Gemini/Kimi

## Integration Points

| Component | File |
|-----------|------|
| Multi-agent runner | `src/web-search/multi-agent.ts` |
| Result formatter | `src/web-search/multi-agent.ts:formatTelegramWithAgent` |
| Telegram bot | `src/telegram/bot.ts` |
| Systemd service | `clawdis-gateway.service` |

## Future Improvements

- [ ] Add response caching
- [ ] Implement fallback to other agents on timeout
- [ ] Add quality scoring based on response length
- [ ] Optimize prompt for faster responses
