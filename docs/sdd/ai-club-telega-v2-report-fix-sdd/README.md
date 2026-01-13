# AI Club Telega v2 Report Fix - SDD Requirements

> Status: ✅ READY FOR IMPLEMENTATION | All gaps filled

## Overview

This folder contains Spec-Driven Development (SDD) documentation for fixing the AI Club Telegram report pipeline to use telega_v2 and publish segregation results as a telegra.ph link.

## Documents

| File | Description | Status |
|------|-------------|--------|
| [requirements.md](./requirements.md) | Functional requirements | ✅ COMPLETE |
| [ui-flow.md](./ui-flow.md) | User interaction flow | ✅ COMPLETE |
| [keyword-detection.md](./keyword-detection.md) | Slash command detection spec | ✅ COMPLETE |
| [gaps.md](./gaps.md) | Open questions & gaps | ✅ ALL FILLED |
| [manual-e2e-test.md](./manual-e2e-test.md) | Manual verification checklist | ✅ COMPLETE |

## Pipeline Summary

```
User Input → Slash Command → Fetch Messages → Segregate → Publish → Delivery
     ↓            ↓                ↓              ↓         ↓          ↓
  Telegram   /ai_day|/ai_week   telega_v2       ai_club   publish_me  summary+link
```

## Quick Reference

| Aspect | Decision |
|--------|----------|
| **Channel** | Telegram only (bot) |
| **Detection** | Slash commands: `/ai_day`, `/ai_week` (plus legacy `/ai_day`, `/ai_dayy`) |
| **Required fields** | Period from command; channel from config (`aiClub.channel`) |
| **Execution** | `telega_v2 fetch-range` → `ai_club` segregation → `publish_me` |
| **Delivery** | MarkdownV2 message with key topics + telegra.ph link |
| **Config** | `aiClub` section in `~/.clawdis/clawdis.json` + env overrides |

## Development Notes

- No dry-run mode for this pipeline; use a staging Telegram chat for verification.
- Reuse existing logging patterns from `runAiClubAnalysis` and `logVerbose`.
- Implementation touches: `src/telegram/bot.ts`, `src/commands/ai-club.ts`, `src/config/config.ts`.

## Requirements vs Deliverables

| Requirement | Covered By |
|-------------|------------|
| R1 Slash command detection (`/ai_day`, `/ai_week`) | Card 02 |
| R2 telega_v2 fetch-range for AI Club channel | Card 03 |
| R3 Segregation report generation + telegraph publish | Card 03, Card 04 |
| R4 Telegram delivery formatting | Card 04 |
| R5 Error handling + logging | Card 01, Card 04 |
| R6 Config + env overrides | Card 03 |
| R7 Tests + docs updates | Card 04 |

## Implementation

See [trello-cards/BOARD.md](./trello-cards/BOARD.md) for:
- 4 executable cards (12 SP total)
- Linear execution order
- Machine-friendly instructions
- Max 4 SP per card (KISS)
