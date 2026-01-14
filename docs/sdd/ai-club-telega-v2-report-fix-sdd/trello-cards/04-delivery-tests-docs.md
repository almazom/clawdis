# Card 04: Final delivery, tests, and docs

| Field | Value |
|-------|-------|
| **ID** | AICLUB-04 |
| **Story Points** | 4 |
| **Depends On** | AICLUB-03 |
| **Sprint** | 2 - Pipeline |

## User Story

> As a Telegram user, I want a clean summary with a telegra.ph link so that I can read the AI Club report and trust the pipeline works.

## Context

Read before starting:
- [requirements.md](../requirements.md) - R11-R18
- `src/telegram/bot.ts` - `runAiClubAnalysis` and `publishContent`
- `src/commands/ai-club.repro.test.ts` - telega_v2 expectations
- `src/telegram/bot.ai-club.test.ts` - Telegram delivery tests

## Must Have

- Delivery message includes summary + link
- Publish fallback works when report_url missing
- Tests updated and passing
- Docs updated with new pipeline details

## Instructions

### Step 1: Add publish fallback in `runAiClubAnalysis`

```typescript
const reportUrl = report.url || (await publishContent(report.summary, `ai-club-${Date.now()}`));
const linkPart = reportUrl ? `\n\n🔗 [Полный отчёт](${reportUrl})` : "\n\n_(Полная версия недоступна)_";
```

### Step 2: Ensure MarkdownV2 delivery formatting

```typescript
const resultMessage = `${emoji} *${periodLabel} отчёт AI Club*\n` +
  `📢 Канал: ${report.channel}\n\n` +
  (topics.length ? `*Ключевые темы:*\n${topics.join("\n")}\n` : `_Темы не найдены._\n`) +
  linkPart;
```

### Step 3: Update tests

- `src/commands/ai-club.repro.test.ts`: expect `telega_v2` with `fetch-range`.
- `src/telegram/bot.ai-club.test.ts`: add coverage for `/ai_day` and missing `report_url` fallback.

### Step 4: Update docs

- `docs/telegram-ai-club.md`: describe telega_v2 fetch-range + new config keys.
- `README.md`: ensure `/ai_day` is listed in chat commands.

### Step 5: Run tests

```bash
pnpm test --filter ai-club
```

## Acceptance Criteria

- [ ] Final Telegram message includes summary and telegra.ph link
- [ ] Missing `report_url` falls back to `publish_me`
- [ ] Error message remains unchanged on failures
- [ ] Tests for telega_v2 + /ai_day pass
- [ ] Docs updated to reflect new pipeline

## Files Modified

- `src/telegram/bot.ts`
- `src/telegram/bot.ai-club.test.ts`
- `src/commands/ai-club.repro.test.ts`
- `docs/telegram-ai-club.md`
- `README.md`

## Next Steps

All cards complete.
