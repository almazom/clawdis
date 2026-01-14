# Deep Research - Open Gaps & Questions

> Status: ✅ ALL GAPS FILLED | Last updated: 2026-01-02

## Summary

All critical and important gaps have been filled based on:
1. User interview answers
2. Analysis of existing Clawdis project patterns (repowiki docs)

---

## Interview Progress

| Gap ID | Status | Answer |
|--------|--------|--------|
| GAP-001 | ✅ FILLED | 15 keyword combinations in keyword-detection.md |
| GAP-002 | ✅ FILLED | Detection on EVERY message from allowed users |
| GAP-003 | ✅ FILLED | Case-insensitive (like Telegram bot mentions) |
| GAP-004 | ✅ FILLED | Exact substring match (pattern anywhere in message) |
| GAP-005 | ✅ FILLED | "🔍 Вижу запрос на deep research...\nТема: {topic}" |
| GAP-006 | ✅ FILLED | Telegram only for v1 (follows provider pattern) |
| GAP-007 | ✅ FILLED | Topic only - other fields use defaults |
| GAP-008 | ✅ FILLED | 1 round max Q&A, then proceed |
| GAP-009 | ✅ FILLED | gdr.sh CLI at $HOME/TOOLS/gemini_deep_research |
| GAP-010 | ✅ FILLED | No button expiration |
| GAP-011 | ✅ FILLED | <100ms detection SLA |
| GAP-012 | ✅ FILLED | Follow existing logging patterns |
| GAP-013 | ✅ FILLED | Retry button on failure + error message |
| DELIVERY | ✅ FILLED | summary_bullets + short_answer + opinion + publish.url |
| DRY-RUN | ✅ FILLED | --dry-run --dry-run-fixture examples/sample_run |
| CONFIG | ✅ FILLED | `deepResearch` section in clawdis.json + env overrides |

---

## Decisions Based on Project Analysis

Analyzed existing patterns from:
- `Telegram Integration.md` - message handling, error retry, Markdown fallback
- `Skills System.md` - SKILL.md manifest, script execution, env variables
- `Configuration.md` - config file structure, env overrides, validation

Key pattern alignments:
1. **Case-insensitive matching** - like Telegram bot mention handling
2. **Retry with backoff** - like `sendMessageTelegram` 429 handling
3. **Config structure** - follows `telegram`, `discord` section patterns
4. **Env overrides** - follows `TELEGRAM_BOT_TOKEN` precedence pattern
5. **Channel separation** - v1 Telegram only, like other integrations
