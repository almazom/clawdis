# 02. Bot Handler Integration

**SP:** 4 | **Status:** ⏳ Pending | **Priority:** High | **Tags:** feature, telegram

## Description

Update Telegram bot `/web` command to use multi-agent executor with first-success publishing.

## Requirements

### Must Have
- [ ] Import `executeMultiAgentWebSearch` from multi-agent.ts
- [ ] Update `/web` command handler to use new executor
- [ ] Publish first success response immediately to user
- [ ] Add technical message with exact format (see below)
- [ ] After all complete, send HTML report via publish_me
- [ ] Handle all 5 agents failing gracefully

### Should Have
- [ ] Prevent duplicate `/web` requests (use existing pattern)
- [ ] Error message if all agents fail

### Nice to Have
- [ ] Progress updates while waiting for all agents

## Implementation Details

### Telegram Message Format (First Response)
```typescript
function formatTelegramWithAgent(result: MultiAgentResult): string {
  if (!result.winner) {
    return `❌ Ни один AI агент не ответил успешно.

${result.summary}`;
  }

  const truncated = result.winner.response?.substring(0, 500) || '';
  const qualityStars = '⭐'.repeat(result.winner.quality || 0);

  return `🌐 **${result.winner.agentDisplay}** ${qualityStars}

${truncated}${truncated.length >= 500 ? '...' : ''}

---
_⏱️ ${result.winner.durationMs}мс | Первый ответ: ${result.winner.agentDisplay}_

[Полный отчёт →](#)`;
}
```

### Technical Message (Before Response)
```
🎯 Первый ответил: [AGENT] ([TIME]мс) [STARS]
```

Example:
```
🎯 Первый ответил: Kimi CLI (15346мс) ⭐⭐⭐⭐
```

### publish_me Command Format
```typescript
// Send HTML report to channel/chat
const htmlContent = Buffer.from(result.htmlReport).toString('base64');
await ctx.reply(`/publish_me html_report=${htmlContent}`);

// OR use direct HTML (if supported)
await ctx.reply(`/publish_me ${result.htmlReport}`);
```

### Bot Handler Pattern
```typescript
// In src/telegram/bot.ts

bot.command("web", async (ctx) => {
  const query = getQuery(ctx.message.text);
  if (!query) return ctx.reply("Usage: /web <query>");

  // Check for duplicate
  if (webSearchInFlight.has(ctx.chat.id)) {
    return ctx.reply("🔍 Поиск уже выполняется...");
  }

  // Acknowledge
  const statusMsg = await ctx.reply("🥊 AI бой запущен...");

  try {
    webSearchInFlight.add(ctx.chat.id);

    const result = await executeMultiAgentWebSearch(query, (status) => {
      console.log(`[WEB] ${status}`);
    });

    // Format and send first success
    const message = formatTelegramWithAgent(result);
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      message,
      { parse_mode: "MarkdownV2" }
    );

    // Send HTML report via publish_me (after all complete)
    if (result.htmlReport) {
      await ctx.reply(`/publish_me html_report=${result.htmlReport}`);
    }

  } catch (error) {
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `❌ Ошибка: ${error.message}`
    );
  } finally {
    webSearchInFlight.delete(ctx.chat.id);
  }
});
```

### Error Message Formats
```typescript
// All agents failed
const allFailedMessage = `❌ Все AI агенты не ответили.

Возможные причины:
- Проверьте API ключи в .env
- Проверьте подключение к интернету

${errorDetails}`;

// Partial failure
const partialFailureMessage = `⚠️ ${failedCount} из ${total} агентов не ответили.

Ответы получены от: ${successfulAgents.join(', ')}

${errorDetails}`;
```

## Files to Modify
- `src/telegram/bot.ts` (add/update /web handler)
- `src/web-search/multi-agent.ts` (add formatTelegramWithAgent function)
- `src/web-search/messages.ts` (add multi-agent messages)

## Testing
```bash
# Restart bot
npm run dev -- --telegram

# Test commands
/web Python 3.12 features
/web latest news
/web что такое git flow

# Verify
# - First response fast (< 30s)
# - Technical message shown with exact format
# - Stars (⭐) displayed
# - Later HTML report arrives via publish_me
# - Logs show [WEB] prefix
```

## Acceptance Criteria
- [ ] `/web` spawns 5 agents in parallel
- [ ] First response published within 30s
- [ ] "🎯 Первый ответил: [AGENT] ([TIME]мс) ⭐⭐⭐" format correct
- [ ] HTML report sent via publish_me
- [ ] Logging works correctly with [WEB] prefix
- [ ] Errors handled gracefully
- [ ] Duplicate requests blocked

## Notes
- Reuse existing `webSearchInFlight` set
- Use `parse_mode: "MarkdownV2"` for message formatting
- Escape special characters in user queries
- Keep error handling pattern from existing code
- Use `Buffer.from(html).toString('base64')` for publish_me if needed
