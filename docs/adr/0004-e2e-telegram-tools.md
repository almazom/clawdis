# ADR-004: E2E Telegram Testing Tools Suite

**Date:** 2026-01-09
**Status:** Accepted

## Context

Need for reliable end-to-end testing of CLAWDIS Telegram bot. AI agents must be able to:
1. Verify bot health before operations
2. Send commands to bot
3. Fetch and parse responses
4. Debug and fix failures automatically

## Decision

Create a suite of CLI tools with clear separation of concerns:

### Tool Architecture

```
┌─────────────────────────────────────────────────────┐
│              E2E Testing Tools Suite                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐│
│  │   tlge2e     │  │ ai-club-e2e  │  │restart-ai  ││
│  │              │  │              │  │            ││
│  │ Send/Fetch   │  │ Full Loop    │  │ Gateway    ││
│  │ Wrapper      │  │ Auto-fix     │  │ Restart    ││
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘│
│         │                 │                │       │
│         └─────────────────┼────────────────┘       │
│                           │                        │
│                  telega_v2 (upstream)              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Tool Responsibilities

| Tool | Responsibility | Interface |
|------|----------------|-----------|
| `tlge2e` | Basic send/fetch operations | CLI commands |
| `ai-club-e2e` | Full debug loop | Detect → Fix → Verify |
| `restart-ai` | Gateway lifecycle | Confidence scoring |

### Configuration Strategy

**No hardcoding** - All configurable values via:

1. Environment variables (`TELEGRAM_E2E_BOT`)
2. Config file (`~/.tlge2e.conf`)
3. Default fallback values

```bash
# Priority: env > config > default
BOT="${TELEGRAM_E2E_BOT:-${BOT_NAME:-@Lana_smartai_bot}}"
```

## Consequences

### Positive

- **Portability**: Tools work with any bot name
- **AI-friendly**: JSON output for programmatic use
- **Confidence scoring**: restart-ai provides 0-100% health score
- **Auto-recovery**: ai-club-e2e auto-fixes failures
- **No sudo**: All tools run without root

### Negative

- Multiple tools to learn
- External dependency on telega_v2

## Implementation

### Files Created

```
/home/almaz/.local/bin/tlge2e           # 113 lines
/home/almaz/.local/bin/ai-club-e2e      # 175 lines
/home/almaz/.local/bin/restart-ai       # 175 lines
~/.tlge2e.conf                         # Config (optional)
/home/almaz/zoo_flow/clawdis/docs/e2e/tlg-e2e-tools.md  # Docs
```

### Confidence Scoring Formula

```
restart-ai confidence:
- Process running (25pts)
- Port 18789 listening (25pts)
- Health check passing (30pts)
- Git changes detected (10pts)
- Build exists (10pts)
Total: 100pts max
```

## Alternatives Considered

### Single monolithic script

Rejected: Violates single responsibility principle

### Python/Node wrapper

Rejected: Bash is sufficient and has no dependencies

### Direct telega_v2 calls

Rejected: Too verbose for repeated operations

## References

- [tlge2e tools documentation](../e2e/tlg-e2e-tools.md)
- [AI Club E2E test report](../e2e/telega-v2-ping-test.md)
- [telega_v2 upstream](https://github.com/almazom/telega_v2)
