# Card 04: Hook Detection into Telegram Handler

| Field | Value |
|-------|-------|
| **ID** | DR-04 |
| **Story Points** | 3 |
| **Depends On** | [03-detection-tests.md](./03-detection-tests.md) |
| **Sprint** | 2 - Telegram Integration |

## User Story

> As the system, I want to check every incoming Telegram message for deep research intent so that I can intercept and handle research requests.

## Context

Read before starting:
- [Telegram Integration.md](../../../.qoder/repowiki/en/content/Core%20Features/Messaging%20Integration/Telegram%20Integration.md) - Bot message flow
- `src/telegram/bot.ts` - Message handler location
- [requirements.md#1-keyword-detection](../requirements.md) - Detection runs on EVERY message

## Instructions

### Step 1: Read bot.ts to find message handler
```bash
cat src/telegram/bot.ts | head -250
```
Look for the message processing function (likely `bot.on('message', ...)` or similar).

### Step 2: Import detection module
Add at top of `src/telegram/bot.ts`:

```typescript
import { detectDeepResearchIntent, extractTopicFromMessage } from '../deep-research/index.js';
import { config } from '../config/config.js';
```

### Step 3: Add detection check in message handler
Find the message handler and add early check BEFORE normal processing:

```typescript
// Deep Research detection (runs on every message from allowed users)
if (config.deepResearch?.enabled !== false) {
  const messageText = ctx.message?.text || ctx.message?.caption || '';
  if (messageText && detectDeepResearchIntent(messageText, config.deepResearch?.keywords)) {
    const topic = extractTopicFromMessage(messageText);
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;

    // Log detection
    console.log(`[deep-research] Intent detected from ${userId} in chat ${chatId}: "${topic}"`);

    // Emit event for pipeline (will be handled in later cards)
    // For now, just mark that we detected it
    ctx.state = ctx.state || {};
    ctx.state.deepResearchDetected = true;
    ctx.state.deepResearchTopic = topic;

    // Continue to acknowledgment handler (Card 05)
  }
}
```

### Step 4: Create state interface
Add type for context state in appropriate location:

```typescript
interface DeepResearchState {
  deepResearchDetected?: boolean;
  deepResearchTopic?: string;
}
```

### Step 5: Verify build
```bash
pnpm build
```

### Step 6: Manual test with dry message
Start gateway and send a test message containing "депресерч" to verify logging.

## Acceptance Criteria

- [ ] Import of detection module added to bot.ts
- [ ] Detection check added to message handler
- [ ] Detection runs only when `deepResearch.enabled !== false`
- [ ] Respects custom keywords from config if provided
- [ ] Logs detection with topic extraction
- [ ] Sets `ctx.state.deepResearchDetected` flag
- [ ] `pnpm build` passes

## Files Modified

- `src/telegram/bot.ts`

## Next Card

→ [05-acknowledgment.md](./05-acknowledgment.md)
