# Card 02: Add /ai_day command alias

| Field | Value |
|-------|-------|
| **ID** | AICLUB-02 |
| **Story Points** | 2 |
| **Depends On** | AICLUB-01 |
| **Sprint** | 1 - Investigation |

## User Story

> As a Telegram user, I want `/ai_day` to trigger the daily AI Club report so that the new slash command works without breaking legacy commands.

## Context

Read before starting:
- [requirements.md](../requirements.md) - R1-R3
- [keyword-detection.md](../keyword-detection.md) - Command patterns
- `src/telegram/bot.ts` - `parseAiClubCommand`
- `src/telegram/bot.ai-club.test.ts` - Telegram command tests

## Must Have

- `/ai_day` recognized as daily report
- Legacy `/ai_day` and `/ai_dayy` continue to work
- Tests updated to cover new alias

## Instructions

### Step 1: Update command parsing

Edit `src/telegram/bot.ts` and expand the regex to include `dail`:

```typescript
const match = /^\/ai_(dail|day|daily|week)(?:@([a-z0-9_]+))?$/i.exec(trimmed);
```

### Step 2: Update tests

Add a test case for `/ai_day` in `src/telegram/bot.ai-club.test.ts`:

```typescript
it('triggers ai club day report on /ai_day command', async () => {
  vi.mocked(getAiClubReport).mockResolvedValue({
    summary: 'Daily summary',
    url: 'https://example.com/day'
  });

  const message = createMockMessage('/ai_day');
  await bot.handleUpdate(createMessageUpdate(message));

  expect(getAiClubReport).toHaveBeenCalledWith('today');
});
```

### Step 3: Update docs

- Update `README.md` chat commands list to include `/ai_day`.
- Update `docs/telegram-ai-club.md` to mention the new alias.

## Acceptance Criteria

- [ ] `/ai_day` maps to `period = today`
- [ ] `/ai_week` unchanged
- [ ] `/ai_day` and `/ai_dayy` still work
- [ ] Tests cover `/ai_day`
- [ ] README + docs updated

## Files Modified

- `src/telegram/bot.ts`
- `src/telegram/bot.ai-club.test.ts`
- `README.md`
- `docs/telegram-ai-club.md`

## Next Card

→ [03-telega-v2-pipeline.md](./03-telega-v2-pipeline.md)
