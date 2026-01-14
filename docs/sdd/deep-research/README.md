# Deep Research Feature - SDD Requirements

> Status: ✅ READY FOR IMPLEMENTATION | All gaps filled

## Overview

This folder contains Spec-Driven Development (SDD) documentation for the Deep Research pipeline feature.

## Documents

| File | Description | Status |
|------|-------------|--------|
| [requirements.md](./requirements.md) | Functional requirements | ✅ COMPLETE |
| [ui-flow.md](./ui-flow.md) | User interaction flow | ✅ COMPLETE |
| [keyword-detection.md](./keyword-detection.md) | Keyword matching spec (20 patterns) | ✅ COMPLETE |
| [gaps.md](./gaps.md) | Open questions & gaps | ✅ ALL FILLED |

## Pipeline Summary

```
User Input → Keyword Detection → Acknowledgment → Confirmation → Execute → Deliver Results
     ↓              ↓                  ↓               ↓            ↓            ↓
  Telegram    20 patterns        "🔍 Вижу..."    [🚀 Button]   gdr.sh     summary+link
```

## Quick Reference

| Aspect | Decision |
|--------|----------|
| **Channel** | Telegram only (v1) |
| **Detection** | 20 keyword patterns, case-insensitive, substring match |
| **Required fields** | Topic only (extracted from message) |
| **Execution** | `gdr.sh --mode stream --prompt "{topic}" --publish` |
| **Dry-run** | `--dry-run --dry-run-fixture examples/sample_run` |
| **Delivery** | summary_bullets + short_answer + opinion + publish.url |
| **Config** | `deepResearch` section in `clawdis.json` |

## Development Notes

- **Dry-run enabled by default** during implementation (`DEEP_RESEARCH_DRY_RUN=true`)
- CLI location: `$HOME/TOOLS/gemini_deep_research/gdr.sh`
- Follows existing patterns from Telegram integration & Skills system

## Implementation

See [trello-cards/BOARD.md](./trello-cards/BOARD.md) for:
- 12 executable cards (30 SP total)
- Linear execution order
- Machine-friendly instructions
- Max 4 SP per card (KISS)
