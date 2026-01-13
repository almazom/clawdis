# Card 11: Add Error Handling + Retry Button

| Field | Value |
|-------|-------|
| **ID** | DR-11 |
| **Story Points** | 3 |
| **Depends On** | [10-wire-pipeline.md](./10-wire-pipeline.md) |
| **Sprint** | 4 - Integration & Polish |

## User Story

> As a user, I want to see clear error messages with a retry option so that I can try again if something fails.

## Context

Read before starting:
- [requirements.md#5.3](../requirements.md) - Error handling patterns
- [Telegram Integration.md](../../../.qoder/repowiki/en/content/Core%20Features/Messaging%20Integration/Telegram%20Integration.md) - Retry patterns

Error scenarios:
1. CLI not found / not executable
2. CLI execution fails (non-zero exit)
3. result.json missing or invalid
4. Network timeout during execution

## Instructions

### Step 1: Enhance error messages
Update `src/deep-research/messages.ts`:

```typescript
export const messages: DeepResearchMessages = {
  // ... existing methods ...

  error: (error: string, runId?: string) => {
    const runInfo = runId ? `\nRun ID: \`${runId}\`` : '';
    const errorText = error.length > 200 ? error.slice(0, 200) + '...' : error;
    return `❌ Deep research failed\n\nОшибка: ${errorText}${runInfo}`;
  },

  timeout: () =>
    '⏱️ Deep research timeout\n\nИсследование заняло слишком много времени.',

  cliNotFound: (path: string) =>
    `❌ CLI not found\n\nПуть: \`${path}\`\nПроверьте настройки deepResearch.cliPath`,
};
```

### Step 2: Add CLI validation to executor
Update `src/deep-research/executor.ts`:

```typescript
import { access, constants } from 'node:fs/promises';

/**
 * Validate CLI exists and is executable
 */
export async function validateCli(cliPath: string): Promise<{ valid: boolean; error?: string }> {
  try {
    await access(cliPath, constants.X_OK);
    return { valid: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { valid: false, error: `CLI not found: ${cliPath}` };
    }
    return { valid: false, error: `CLI not executable: ${cliPath}` };
  }
}

// Update executeDeepResearch to validate first:
export async function executeDeepResearch(options: ExecuteOptions): Promise<ExecuteResult> {
  const cliPath = config.deepResearch?.cliPath || '$HOME/TOOLS/gemini_deep_research/gdr.sh';

  // Validate CLI exists
  const validation = await validateCli(cliPath);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      stdout: '',
      stderr: '',
    };
  }

  // ... rest of existing code ...
}
```

### Step 3: Add timeout handling
Update executor to support timeout:

```typescript
export interface ExecuteOptions {
  topic: string;
  dryRun?: boolean;
  outputLanguage?: 'ru' | 'en' | 'auto';
  timeoutMs?: number; // Default: 20 minutes
}

// In executeDeepResearch, add timeout:
const timeoutMs = options.timeoutMs ?? 20 * 60 * 1000; // 20 minutes

const timeoutPromise = new Promise<ExecuteResult>((resolve) => {
  setTimeout(() => {
    proc.kill('SIGTERM');
    resolve({
      success: false,
      error: 'Execution timeout',
      runId,
      stdout: stdout.join(''),
      stderr: stderr.join(''),
    });
  }, timeoutMs);
});

return Promise.race([executionPromise, timeoutPromise]);
```

### Step 4: Update bot callback for better error handling
In `src/telegram/bot.ts`:

```typescript
const deliveryContext = {
  sendMessage: async (text: string) => {
    // Try Markdown, fall back to plain text (like sendMessageTelegram pattern)
    try {
      await ctx.reply(truncateForTelegram(text), { parse_mode: 'Markdown' });
    } catch (markdownError) {
      // Markdown parse error, send as plain text
      await ctx.reply(truncateForTelegram(text));
    }
  },
  sendError: async (text: string) => {
    await ctx.reply(text, {
      reply_markup: createRetryButton(topic),
    });
  },
};
```

### Step 5: Verify build
```bash
pnpm build
```

### Step 6: Test error scenarios
1. Invalid CLI path → Should show CLI not found error
2. Timeout (set short timeout for test) → Should show timeout error
3. All errors should show retry button

## Acceptance Criteria

- [ ] CLI validation before execution
- [ ] Clear error message for missing CLI
- [ ] Timeout handling with configurable duration
- [ ] Retry button appears on all errors
- [ ] Error message includes run_id when available
- [ ] Markdown fallback to plain text
- [ ] `pnpm build` passes

## Files Modified

- `src/deep-research/messages.ts`
- `src/deep-research/executor.ts`
- `src/telegram/bot.ts`

## Next Card

→ [12-e2e-test.md](./12-e2e-test.md)
