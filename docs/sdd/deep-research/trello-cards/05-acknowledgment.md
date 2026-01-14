# Card 05: Send Detection Acknowledgment Message

| Field | Value |
|-------|-------|
| **ID** | DR-05 |
| **Story Points** | 2 |
| **Depends On** | [04-telegram-hook.md](./04-telegram-hook.md) |
| **Sprint** | 2 - Telegram Integration |

## User Story

> As a user, I want to see acknowledgment when my deep research request is detected so that I know the system understood my intent.

## Context

Read before starting:
- [requirements.md#2-detection-acknowledgment](../requirements.md) - Message format
- [ui-flow.md](../ui-flow.md) - Acknowledgment in flow diagram

Message format:
```
🔍 Вижу запрос на deep research
Тема: {extracted_topic}
```

## Instructions

### Step 1: Create messages module
Create file `src/deep-research/messages.ts`:

```typescript
/**
 * Deep Research message templates
 * @see docs/sdd/deep-research/ui-flow.md
 */

export interface DeepResearchMessages {
  acknowledgment: (topic: string) => string;
  startExecution: () => string;
  resultDelivery: (result: DeepResearchResult) => string;
  error: (error: string, runId?: string) => string;
}

export interface DeepResearchResult {
  summaryBullets: string[];
  shortAnswer: string;
  opinion: string;
  publishUrl: string;
}

export const messages: DeepResearchMessages = {
  acknowledgment: (topic: string) =>
    `🔍 Вижу запрос на deep research\nТема: ${topic}`,

  startExecution: () =>
    `🔍 Deep research запущен...\nОжидаемое время: 10-15 минут`,

  resultDelivery: (result: DeepResearchResult) => {
    const bullets = result.summaryBullets
      .map(b => `• ${b}`)
      .join('\n');

    return `✅ Deep Research завершен

📝 Краткий ответ:
${result.shortAnswer}

📋 Основные пункты:
${bullets}

💭 Мнение:
${result.opinion}

🔗 Полный отчет: ${result.publishUrl}`;
  },

  error: (error: string, runId?: string) => {
    const runInfo = runId ? `\nRun ID: ${runId}` : '';
    return `❌ Deep research failed: ${error}${runInfo}`;
  },
};
```

### Step 2: Update index.ts
Add to `src/deep-research/index.ts`:

```typescript
export { messages, type DeepResearchResult } from './messages.js';
```

### Step 3: Send acknowledgment in bot.ts
After detection check in `src/telegram/bot.ts`, add:

```typescript
import { messages } from '../deep-research/index.js';

// Inside detection block after setting ctx.state:
if (ctx.state.deepResearchDetected && ctx.state.deepResearchTopic) {
  // Send acknowledgment immediately
  await ctx.reply(messages.acknowledgment(ctx.state.deepResearchTopic));

  // Don't process as normal message - hand off to deep research pipeline
  // Next card will add the confirmation button
  return; // Stop normal message processing
}
```

### Step 4: Verify build
```bash
pnpm build
```

### Step 5: Test acknowledgment
Send message "Сделай депресерч про AI" to bot. Should receive acknowledgment.

## Acceptance Criteria

- [ ] File `src/deep-research/messages.ts` created
- [ ] `acknowledgment()` function generates correct format
- [ ] Bot sends acknowledgment on detection
- [ ] Message contains extracted topic
- [ ] Bot stops normal processing after detection (returns early)
- [ ] `pnpm build` passes

## Files Created/Modified

- `src/deep-research/messages.ts` (created)
- `src/deep-research/index.ts` (modified)
- `src/telegram/bot.ts` (modified)

## Next Card

→ [06-inline-button.md](./06-inline-button.md)
