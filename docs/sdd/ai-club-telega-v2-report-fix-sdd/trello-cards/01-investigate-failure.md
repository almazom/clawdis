# Card 01: Investigate AI Club report failure

| Field | Value |
|-------|-------|
| **ID** | AICLUB-01 |
| **Story Points** | 2 |
| **Depends On** | None (first card) |
| **Sprint** | 1 - Investigation |

## User Story

> As a maintainer, I want to reproduce the AI Club error and capture logs so that we can confirm the root cause before changing the pipeline.

## Context

Read before starting:
- [requirements.md](../requirements.md) - Error handling + logging requirements
- [docs/telegram-ai-club.md](../../../docs/telegram-ai-club.md) - Current AI Club flow
- `src/telegram/bot.ts` - `runAiClubAnalysis`
- `src/commands/ai-club.ts` - CLI invocation

## Must Have

- Reproduction of the failure in a real Telegram run
- Logs captured for CLI stdout/stderr and pipeline steps
- Root-cause note captured in docs

## Instructions

### Step 1: Review current flow

```bash
rg -n "parseAiClubCommand|runAiClubAnalysis" src/telegram/bot.ts
cat src/commands/ai-club.ts
cat docs/telegram-ai-club.md
```

### Step 2: Reproduce the error

```bash
# Start gateway
pnpm dev

# Trigger from Telegram or via telega_v2
telega_v2 send --profile <PROFILE> @<BOT_NAME> "/ai_day"
```

### Step 3: Capture logs

```bash
# Review gateway logs for ai-club pipeline output
rg -n "\[ai-club\]" /tmp/clawdis/clawdis-*.log
```

### Step 4: Document findings

Create/update an investigation note:

```bash
cat > docs/investigations/ai-club-telega-v2-report-fix.md << 'NOTE'
# AI Club Report Failure - Investigation Notes

- Reproduction command:
- Observed error message:
- CLI stdout/stderr highlights:
- Suspected root cause:
NOTE
```

## Acceptance Criteria

- [ ] Error reproduced and logged
- [ ] CLI stdout/stderr captured in logs
- [ ] Investigation note created at `docs/investigations/ai-club-telega-v2-report-fix.md`
- [ ] No code changes beyond investigation docs

## Files Modified

- `docs/investigations/ai-club-telega-v2-report-fix.md`

## Next Card

→ [02-command-aliases.md](./02-command-aliases.md)
