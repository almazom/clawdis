# AI Club Telega v2 Report Fix - Slash Command Detection Spec

> Status: ✅ COMPLETE | Last updated: 2026-01-06

## Purpose

Define exact slash commands that trigger the AI Club report pipeline.

## Detection Strategy

**Approach:** Regex match on full command (no fuzzy matching)

## Patterns (FINAL LIST)

**Total: 4 patterns** - Case-insensitive exact match

### Group 1: Telegram Slash Commands

| # | Pattern | Example |
|---|---------|---------|
| 1 | `/ai_day` | "/ai_day" |
| 2 | `/ai_day` | "/ai_day" |
| 3 | `/ai_dayy` | "/ai_dayy" |
| 4 | `/ai_week` | "/ai_week" |

## Matching Rules (CONFIRMED)

- [x] Case-insensitive: normalize to lower-case before matching
- [x] Exact command match: `^/ai_(dail|day|daily|week)`
- [x] Optional `@botname` suffix is allowed
- [x] No parameters expected after command

## Implementation Code

```typescript
// File: src/telegram/bot.ts

function parseAiClubCommand(messageText: string, botUsername?: string): {
  period: "today" | "week";
} | null {
  const trimmed = messageText.trim();
  const match = /^\/ai_(dail|day|daily|week)(?:@([a-z0-9_]+))?$/i.exec(trimmed);
  if (!match) return null;
  const cmd = match[1].toLowerCase();
  const period = (cmd === "week") ? "week" : "today";
  const mentioned = match[2];
  if (mentioned && botUsername && mentioned.toLowerCase() !== botUsername) {
    return null;
  }
  return { period };
}
```

## Edge Cases

| Input | Expected | Reason |
|-------|----------|--------|
| "/AI_DAIL" | match | case-insensitive |
| "/ai_week@otherbot" | no match | bot mention mismatch |
| "/ai_day extra" | no match | no params allowed |

## Performance

- Detection SLA: <5ms
- Runs on every Telegram message
- Single regex check per message
