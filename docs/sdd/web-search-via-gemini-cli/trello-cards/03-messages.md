# Card 03: Message Templates for Web Search

**Story Points:** 2 | **Priority:** P1 | **Owner:** AI Agent

## 📋 Description

Create the user-facing message templates for web search: acknowledgment, result delivery, error messages, and timeout handling. This ensures consistent UI/UX across all search interactions.

## ✅ Acceptance Criteria

- [ ] Message template file created: `src/web-search/messages.ts`
- [ ] All message types implemented
- [ ] Emoji-based visual distinction consistent with deep-research
- [ ] Russian language throughout
- [ ] TypeScript types correct

## 🔧 Implementation

### File: `src/web-search/messages.ts`

**Create new file:**

```typescript
/**
 * Web Search message templates
 */

export interface WebSearchResult {
  response: string;
  session_id: string;
  stats: {
    models: Record<string, {
      api: { totalRequests: number; totalErrors: number };
      tokens: { input: number; candidates: number; total: number };
    }>;
  };
}

export interface WebSearchMessages {
  acknowledgment: () => string;
  resultDelivery: (result: WebSearchResult) => string;
  error: (error: string, sessionId?: string) => string;
  timeout: () => string;
  cliNotFound: (path: string) => string;
}

export const messages: WebSearchMessages = {
  /**
   * System acknowledgment when search is triggered
   */
  acknowledgment: () => {
    return "🔍 Выполняю веб-поиск...";
  },

  /**
   * Deliver search results with visual distinction
   */
  resultDelivery: (result: WebSearchResult) => {
    return `🌐 Результат поиска:

${result.response}`;
  },

  /**
   * Error message with user-friendly text and search ID for debugging
   */
  error: (error: string, sessionId?: string) => {
    const errorText = error.length > 200 ? `${error.slice(0, 200)}...` : error;
    const sessionInfo = sessionId ? `\nSearch ID: \`${sessionId}\`` : "";
    
    return `❌ Ошибка поиска:

${errorText}${sessionInfo}`;
  },

  /**
   * Timeout message after 30 seconds
   */
  timeout: () => {
    return "⏱️ Поиск занял слишком много времени";
  },

  /**
   * CLI not found error with configuration hint
   */
  cliNotFound: (path: string) => {
    return `❌ Ошибка поиска:

CLI not found at \`${path}\`
Проверьте настройки webSearch.cliPath в конфигурации`;
  }
};
```

## 🧪 Testing

### Unit Tests: `src/web-search/messages.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { messages } from './messages.js';

describe('messages', () => {
  it('acknowledgment contains magnifying glass', () => {
    expect(messages.acknowledgment()).toContain('🔍');
  });
  
  it('resultDelivery formats correctly', () => {
    const result = {
      response: 'Test response',
      session_id: 'abc-123',
      stats: { 
        models: {
          'gemini-1.5': {
            api: { totalRequests: 1, totalErrors: 0 },
            tokens: { input: 100, candidates: 50, total: 150 }
          }
        }
      }
    };
    
    const formatted = messages.resultDelivery(result);
    expect(formatted).toContain('🌐');
    expect(formatted).toContain('Результат поиска');
    expect(formatted).toContain('Test response');
  });
  
  it('error includes session ID', () => {
    const error = messages.error('Something went wrong', 'abc-123');
    expect(error).toContain('❌');
    expect(error).toContain('Search ID: `abc-123`');
  });
  
  it('timeout message is clear', () => {
    expect(messages.timeout()).toContain('⏱️');
    expect(messages.timeout()).toContain('слишком много времени');
  });
});
```

### Manual Testing

**Test in Telegram:**
1. Trigger a search
2. Verify emoji display correctly on different devices
3. Check that Russian text renders properly
4. Verify long responses handle Telegram limits

## 🎯 Verification Checklist

- [ ] All message types return strings
- [ ] Emojis display correctly
- [ ] Russian text is correct
- [ ] Error messages include session ID
- [ ] Long errors are truncated (200 chars)
- [ ] Messages follow deep-research emoji conventions

## 🔗 Dependencies

- **Previous Card:** 02-detection (messages need detection to be triggered)
- **Next Card:** 04-executor (messages need to be sent by executor)
- **Reference:** `src/deep-research/messages.ts` (pattern to follow)

## 📝 Notes

- Keep messages concise but informative
- Session ID is crucial for debugging
- Test emojis on mobile (Telegram app) and desktop
- Headers should be immediately recognizable