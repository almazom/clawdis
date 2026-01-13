# Card 09: Format and Send Result Message

| Field | Value |
|-------|-------|
| **ID** | DR-09 |
| **Story Points** | 2 |
| **Depends On** | [08-result-parser.md](./08-result-parser.md) |
| **Sprint** | 3 - Execution Engine |

## User Story

> As a user, I want to receive the deep research results in a nicely formatted message so that I can read the summary and access the full report.

## Context

Read before starting:
- [requirements.md#4.4](../requirements.md) - Result message format
- [ui-flow.md](../ui-flow.md) - Result delivery message template

The `messages.resultDelivery()` function already exists from Card 05.
This card wires it to the execution pipeline.

## Instructions

### Step 1: Create delivery function
Create file `src/deep-research/deliver.ts`:

```typescript
/**
 * Deep Research result delivery
 * @see docs/sdd/deep-research/ui-flow.md
 */

import { messages, type DeepResearchResult } from './messages.js';
import { parseResultJson, getResultJsonPath } from './parser.js';
import type { ExecuteResult } from './executor.js';

export interface DeliveryContext {
  sendMessage: (text: string) => Promise<void>;
  sendError: (text: string, retryButton?: unknown) => Promise<void>;
}

/**
 * Deliver deep research results to user
 * @param executeResult - Result from executeDeepResearch()
 * @param context - Delivery context with send functions
 */
export async function deliverResults(
  executeResult: ExecuteResult,
  context: DeliveryContext,
): Promise<boolean> {
  // Handle execution failure
  if (!executeResult.success) {
    await context.sendError(
      messages.error(executeResult.error || 'Unknown error', executeResult.runId)
    );
    return false;
  }

  // Get result.json path
  const resultPath = executeResult.resultJsonPath
    || (executeResult.runId ? getResultJsonPath(executeResult.runId) : null);

  if (!resultPath) {
    await context.sendError(
      messages.error('No result file found', executeResult.runId)
    );
    return false;
  }

  // Parse result
  const result = await parseResultJson(resultPath);

  if (!result) {
    await context.sendError(
      messages.error('Failed to parse results', executeResult.runId)
    );
    return false;
  }

  // Send formatted result
  await context.sendMessage(messages.resultDelivery(result));
  return true;
}

/**
 * Truncate long text for Telegram (4096 char limit)
 */
export function truncateForTelegram(text: string, maxLength = 4000): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}
```

### Step 2: Update index.ts
Add to `src/deep-research/index.ts`:

```typescript
export { deliverResults, truncateForTelegram, type DeliveryContext } from './deliver.js';
```

### Step 3: Verify build
```bash
pnpm build
```

### Step 4: Test message formatting
```bash
pnpm tsx -e "
import { messages } from './src/deep-research/messages.js';

const result = {
  summaryBullets: ['Bullet 1', 'Bullet 2', 'Bullet 3'],
  shortAnswer: 'This is the short answer summary.',
  opinion: 'This is the AI opinion on the topic.',
  publishUrl: 'https://simp.ly/p/test123',
};

console.log(messages.resultDelivery(result));
"
```

## Acceptance Criteria

- [ ] File `src/deep-research/deliver.ts` created
- [ ] `deliverResults()` handles success and failure
- [ ] Parses result.json and sends formatted message
- [ ] Uses `messages.resultDelivery()` for formatting
- [ ] Uses `messages.error()` for failures
- [ ] `truncateForTelegram()` handles long messages
- [ ] `pnpm build` passes

## Files Created/Modified

- `src/deep-research/deliver.ts` (created)
- `src/deep-research/index.ts` (modified)

## Next Card

→ [10-wire-pipeline.md](./10-wire-pipeline.md)
