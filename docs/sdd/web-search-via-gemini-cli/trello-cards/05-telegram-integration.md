# Card 05: Telegram Bot Integration

**Story Points:** 3 | **Priority:** P0 (Blocker) | **Owner:** AI Agent

## 📋 Description

Integrate web search detection and execution into the Telegram bot message handler. Wire up detection, execution, and delivery in the bot flow.

## ✅ Acceptance Criteria

- [ ] Web search integrated into `src/telegram/bot.ts`
- [ ] Detection happens on every user message
- [ ] Search executes automatically when detected
- [ ] Results delivered with proper formatting
- [ ] Errors handled and shown to user
- [ ] In-flight tracking prevents duplicates
- [ ] Works in both private chats and groups

## 🔧 Implementation

### File: `src/telegram/bot.ts`

**Location:** Find the deep research integration (around line 15-29, and message handler around line 88-150)

**Add imports:**
```typescript
import {
  detectWebSearchIntent,
  extractSearchQuery,
} from "../web-search/detect.js";
import { messages as webSearchMessages } from "../web-search/messages.js";
import { executeWebSearch } from "../web-search/executor.js";

// Add near deepResearchInFlight
const webSearchInFlight = new Set<number>();
```

**Add to message handler (after deep research check):**
```typescript
bot.on("message", async (ctx) => {
  try {
    // ... existing setup code ...
    
    const messageText = getMessageText(ctx.message);
    
    // Check for deep research first (priority)
    if (detectDeepResearchIntent(messageText)) {
      // ... handle deep research ...
      return;
    }
    
    // Check for web search
    if (detectWebSearchIntent(messageText)) {
      // Extract query
      const query = extractSearchQuery(messageText);
      if (!query) {
        logger.warn({ chatId }, "Failed to extract query for web search");
        return;
      }
      
      // Check if already searching for this chat
      if (webSearchInFlight.has(chatId)) {
        await ctx.reply(webSearchMessages.error("Поиск уже выполняется для этого чата. Пожалуйста, подождите."));
        return;
      }
      
      // Mark as in-flight
      webSearchInFlight.add(chatId);
      
      try {
        // Send acknowledgment
        await ctx.reply(webSearchMessages.acknowledgment());
        
        // Execute search
        const result = await executeWebSearch(query);
        
        if (result.success && result.result) {
          // Deliver result
          await ctx.reply(webSearchMessages.resultDelivery(result.result));
        } else {
          // Deliver error
          await ctx.reply(webSearchMessages.error(
            result.error || "Unknown error",
            result.runId
          ));
        }
      } catch (error) {
        logger.error({ chatId, error }, "Web search execution failed");
        await ctx.reply(webSearchMessages.error(
          error instanceof Error ? error.message : String(error)
        ));
      } finally {
        // Always remove from in-flight set
        webSearchInFlight.delete(chatId);
      }
      
      return; // Don't process further
    }
    
    // ... continue with existing auto-reply logic ...
    
  } catch (error) {
    // ... existing error handling ...
  }
});
```

**Add error handler:**
```typescript
// In the catch block of message handler
if (webSearchInFlight.has(chatId)) {
  webSearchInFlight.delete(chatId);
}
```

## 🧪 Testing

### Integration Test: `src/telegram/bot.web-search.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTelegramBot } from './bot.js';
import { Bot } from 'grammy';

vi.mock('../web-search/executor.js', () => ({
  executeWebSearch: vi.fn().mockResolvedValue({
    success: true,
    result: {
      response: 'Test search result',
      session_id: 'test-123',
      stats: { models: {} }
    }
  })
}));

describe('Telegram Bot - Web Search Integration', () => {
  let bot: Bot;
  
  beforeEach(() => {
    bot = createTelegramBot({
      token: 'test-token',
      runtime: {
        log: console.log,
        error: console.error,
        exit: () => { throw new Error('exit'); }
      }
    });
  });
  
  it('triggers web search on detection', async () => {
    // Simulate message
    const message = createMockMessage('погода в Москве');
    
    await bot.handleUpdate(createMessageUpdate(message));
    
    // Verify reply was sent
    expect(bot.api.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('🔍')
      })
    );
  });
});
```

### Manual Telegram Testing

**Test in real Telegram:**
1. Start bot: `pnpm dev telegram --token YOUR_TOKEN`
2. Send: `погода в Москве`
3. Verify response:
   - Immediate: `🔍 Выполняю веб-поиск...`
   - After 5-10s: `🌐 Результат поиска: [weather info]`
4. Test error case (disconnect network, try again)
5. Test timeout (if possible)

## 🎯 Verification Checklist

- [ ] Detection happens on every message
- [ ] Web search triggers automatically (no button)
- [ ] Acknowledgment sent immediately
- [ ] Search executes asynchronously
- [ ] Result delivered with emoji formatting
- [ ] Errors shown to user in chat
- [ ] In-flight tracking prevents duplicates
- [ ] Deep research takes priority
- [ ] Works in both private and group chats
- [ ] Bot remains responsive during search

## 🔗 Dependencies

- **Previous Cards:** 01-04 (all infrastructure needed)
- **Next Card:** 06-unit-tests (integration is done, test it)
- **Related:** `src/deep-research/executor.ts` (similar pattern in bot)

## 📝 Notes

- Keep handler non-blocking (async/await properly)
- Always clean up in-flight set in finally blocks
- Test with multiple rapid messages to ensure no race conditions
- Consider rate limiting if needed (follow telegram patterns)