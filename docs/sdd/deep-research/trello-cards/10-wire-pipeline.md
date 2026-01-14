# Card 10: Wire Complete Pipeline

| Field | Value |
|-------|-------|
| **ID** | DR-10 |
| **Story Points** | 3 |
| **Depends On** | [09-result-delivery.md](./09-result-delivery.md) |
| **Sprint** | 4 - Integration & Polish |

## User Story

> As a user, I want the complete flow from button click to result delivery to work seamlessly.

## Context

Read before starting:
- All previous cards (01-09)
- [ui-flow.md](../ui-flow.md) - Complete pipeline

This card wires together:
1. Button callback → Execute → Parse → Deliver

## Instructions

### Step 1: Update bot.ts callback handler
Modify the callback handler in `src/telegram/bot.ts`:

```typescript
import {
  messages,
  createExecuteButton,
  createRetryButton,
  parseCallbackData,
  CALLBACK_PREFIX,
  CallbackActions,
  executeDeepResearch,
  deliverResults,
  truncateForTelegram,
} from '../deep-research/index.js';

// Replace the callback handler with full pipeline:
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (!data.startsWith(CALLBACK_PREFIX)) {
    return;
  }

  const parsed = parseCallbackData(data);
  if (!parsed) {
    await ctx.answerCallbackQuery({ text: 'Invalid callback data' });
    return;
  }

  const { action, topic } = parsed;

  if (action === CallbackActions.EXECUTE || action === CallbackActions.RETRY) {
    // Acknowledge button press immediately
    await ctx.answerCallbackQuery({ text: 'Запускаю deep research...' });

    // Send start message
    await ctx.reply(messages.startExecution());

    try {
      // Execute deep research
      console.log(`[deep-research] Starting execution for topic: "${topic}"`);
      const executeResult = await executeDeepResearch({ topic });

      // Deliver results
      const deliveryContext = {
        sendMessage: async (text: string) => {
          await ctx.reply(truncateForTelegram(text), { parse_mode: 'Markdown' });
        },
        sendError: async (text: string) => {
          await ctx.reply(text, {
            reply_markup: createRetryButton(topic),
          });
        },
      };

      const success = await deliverResults(executeResult, deliveryContext);

      if (success) {
        console.log(`[deep-research] Completed successfully for topic: "${topic}"`);
      } else {
        console.log(`[deep-research] Failed for topic: "${topic}"`);
      }

    } catch (error) {
      console.error('[deep-research] Unexpected error:', error);
      await ctx.reply(
        messages.error(error instanceof Error ? error.message : 'Unexpected error'),
        { reply_markup: createRetryButton(topic) }
      );
    }
  }
});
```

### Step 2: Update index.ts exports
Ensure `src/deep-research/index.ts` exports everything:

```typescript
// Detection
export {
  detectDeepResearchIntent,
  extractTopicFromMessage,
  getDefaultPatterns,
} from './detect.js';

// Messages
export { messages, type DeepResearchResult } from './messages.js';

// Buttons
export {
  createExecuteButton,
  createRetryButton,
  parseCallbackData,
  CALLBACK_PREFIX,
  CallbackActions,
} from './button.js';

// Executor
export { executeDeepResearch, type ExecuteOptions, type ExecuteResult } from './executor.js';

// Parser
export { parseResultJson, getResultJsonPath } from './parser.js';

// Delivery
export { deliverResults, truncateForTelegram, type DeliveryContext } from './deliver.js';
```

### Step 3: Verify build
```bash
pnpm build
```

### Step 4: Full pipeline test
1. Start gateway: `pnpm dev`
2. Set `DEEP_RESEARCH_DRY_RUN=true` in environment
3. Send message: "Сделай депресерч про AI"
4. Click "🚀 Сделать депресерч" button
5. Wait for result message with summary and link

## Acceptance Criteria

- [ ] Button click triggers full pipeline
- [ ] Start message sent immediately
- [ ] Executor runs with dry-run mode
- [ ] Results parsed from result.json
- [ ] Formatted result message sent
- [ ] Contains summary bullets
- [ ] Contains short answer
- [ ] Contains opinion
- [ ] Contains publish URL
- [ ] `pnpm build` passes

## Files Modified

- `src/telegram/bot.ts`
- `src/deep-research/index.ts`

## Next Card

→ [11-error-handling.md](./11-error-handling.md)
