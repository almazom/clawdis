# Card 06: Create Confirmation Inline Button

| Field | Value |
|-------|-------|
| **ID** | DR-06 |
| **Story Points** | 3 |
| **Depends On** | [05-acknowledgment.md](./05-acknowledgment.md) |
| **Sprint** | 2 - Telegram Integration |

## User Story

> As a user, I want a confirmation button after detection so that I can confirm and start the deep research.

## Context

Read before starting:
- [ui-flow.md](../ui-flow.md) - Button in confirmation message
- [requirements.md#4.2](../requirements.md) - Button text: "🚀 Сделать депресерч"
- grammY docs for inline keyboards

## Instructions

### Step 1: Create button handler module
Create file `src/deep-research/button.ts`:

```typescript
/**
 * Deep Research inline button handling
 * @see docs/sdd/deep-research/ui-flow.md
 */

import { InlineKeyboard } from 'grammy';

// Callback data prefix for deep research buttons
export const CALLBACK_PREFIX = 'dr:';

export const CallbackActions = {
  EXECUTE: 'execute',
  RETRY: 'retry',
  CANCEL: 'cancel',
} as const;

/**
 * Create execute button with topic encoded in callback data
 */
export function createExecuteButton(topic: string): InlineKeyboard {
  // Encode topic in callback (Telegram limit: 64 bytes)
  // Use hash if topic too long
  const topicData = topic.length > 40
    ? Buffer.from(topic).toString('base64').slice(0, 40)
    : encodeURIComponent(topic);

  return new InlineKeyboard()
    .text('🚀 Сделать депресерч', `${CALLBACK_PREFIX}${CallbackActions.EXECUTE}:${topicData}`);
}

/**
 * Create retry button after failure
 */
export function createRetryButton(topic: string): InlineKeyboard {
  const topicData = topic.length > 40
    ? Buffer.from(topic).toString('base64').slice(0, 40)
    : encodeURIComponent(topic);

  return new InlineKeyboard()
    .text('🔄 Повторить', `${CALLBACK_PREFIX}${CallbackActions.RETRY}:${topicData}`);
}

/**
 * Parse callback data from button press
 */
export function parseCallbackData(data: string): { action: string; topic: string } | null {
  if (!data.startsWith(CALLBACK_PREFIX)) {
    return null;
  }

  const withoutPrefix = data.slice(CALLBACK_PREFIX.length);
  const colonIndex = withoutPrefix.indexOf(':');

  if (colonIndex === -1) {
    return null;
  }

  const action = withoutPrefix.slice(0, colonIndex);
  const topicData = withoutPrefix.slice(colonIndex + 1);

  // Decode topic
  let topic: string;
  try {
    // Try URL decode first
    topic = decodeURIComponent(topicData);
  } catch {
    // Fall back to base64
    topic = Buffer.from(topicData, 'base64').toString('utf-8');
  }

  return { action, topic };
}
```

### Step 2: Update index.ts
Add to `src/deep-research/index.ts`:

```typescript
export {
  createExecuteButton,
  createRetryButton,
  parseCallbackData,
  CALLBACK_PREFIX,
  CallbackActions,
} from './button.js';
```

### Step 3: Send button with acknowledgment
Update `src/telegram/bot.ts` - modify the acknowledgment section:

```typescript
import {
  messages,
  createExecuteButton,
  parseCallbackData,
  CALLBACK_PREFIX,
  CallbackActions,
} from '../deep-research/index.js';

// In detection block:
if (ctx.state.deepResearchDetected && ctx.state.deepResearchTopic) {
  const topic = ctx.state.deepResearchTopic;

  // Send acknowledgment with execute button
  await ctx.reply(
    messages.acknowledgment(topic),
    { reply_markup: createExecuteButton(topic) }
  );

  return;
}
```

### Step 4: Add callback query handler
Add to `src/telegram/bot.ts`:

```typescript
// Deep Research button callback handler
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;

  // Only handle deep research callbacks
  if (!data.startsWith(CALLBACK_PREFIX)) {
    return; // Let other handlers process
  }

  const parsed = parseCallbackData(data);
  if (!parsed) {
    await ctx.answerCallbackQuery({ text: 'Invalid callback data' });
    return;
  }

  const { action, topic } = parsed;

  if (action === CallbackActions.EXECUTE || action === CallbackActions.RETRY) {
    // Acknowledge button press
    await ctx.answerCallbackQuery({ text: 'Запускаю deep research...' });

    // Send start message
    await ctx.reply(messages.startExecution());

    // TODO: Execute deep research (Card 07)
    console.log(`[deep-research] Execute requested for topic: "${topic}"`);
  }
});
```

### Step 5: Verify build
```bash
pnpm build
```

### Step 6: Test button flow
1. Send "Сделай депресерч про AI"
2. See acknowledgment with button
3. Click button
4. See "Deep research запущен..." message

## Acceptance Criteria

- [ ] File `src/deep-research/button.ts` created
- [ ] `createExecuteButton()` generates inline keyboard
- [ ] Button text is "🚀 Сделать депресерч"
- [ ] Topic encoded in callback data (handles long topics)
- [ ] Callback handler responds to button press
- [ ] Pressing button shows start message
- [ ] `pnpm build` passes

## Files Created/Modified

- `src/deep-research/button.ts` (created)
- `src/deep-research/index.ts` (modified)
- `src/telegram/bot.ts` (modified)

## Next Card

→ [07-executor.md](./07-executor.md)
