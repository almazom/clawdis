# Card 06: Unit Tests for Web Search

**Story Points:** 3 | **Priority:** P1 | **Owner:** AI Agent

## 📋 Description

Create comprehensive unit tests for all web search modules: detection, messages, executor, and deliver. Target 70% coverage matching project standard.

## ✅ Acceptance Criteria

- [ ] Detection tests created with 95%+ coverage
- [ ] Messages tests created with 100% coverage
- [ ] Executor tests created with 90%+ coverage
- [ ] All tests pass
- [ ] Overall coverage ≥70%
- [ ] Mock external dependencies (CLI, network)

## 🔧 Implementation

### File 1: `src/web-search/detect.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { detectWebSearchIntent, extractSearchQuery } from './detect.js';

describe('detectWebSearchIntent', () => {
  describe('explicit keywords', () => {
    it.each([
      'погугли новости',
      'загугли погоду',
      'найди информацию',
      'поищи рецепт',
      'web search',
      'google it'
    ])('detects explicit keyword: %s', (input) => {
      expect(detectWebSearchIntent(input)).toBe(true);
    });
  });

  describe('contextual patterns', () => {
    it.each([
      'погода в Москве',
      'какая температура',
      'последние новости',
      'курс доллара',
      'что такое python'
    ])('detects contextual pattern: %s', (input) => {
      expect(detectWebSearchIntent(input)).toBe(true);
    });
  });

  describe('should not detect', () => {
    it.each([
      'привет как дела',
      'расскажи шутку',
      'спасибо за помощь',
      'давай поговорим'
    ])('does not trigger for normal chat: %s', (input) => {
      expect(detectWebSearchIntent(input)).toBe(false);
    });

    it('returns false when deep research detected', () => {
      expect(detectWebSearchIntent('сделай депресерч по python')).toBe(false);
      expect(detectWebSearchIntent('do deep research on AI')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles mixed case', () => {
      expect(detectWebSearchIntent('ПОГУГЛИ python')).toBe(true);
      expect(detectWebSearchIntent('Google Maps')).toBe(true);
    });

    it('handles punctuation', () => {
      expect(detectWebSearchIntent('погугли "python tutorial"!')).toBe(true);
      expect(detectWebSearchIntent('погода в Москве?')).toBe(true);
    });

    it('trims whitespace', () => {
      expect(detectWebSearchIntent('  погугли тест  ')).toBe(true);
    });
  });
});

describe('extractSearchQuery', () => {
  it('strips explicit keywords', () => {
    expect(extractSearchQuery('погугли погоду в Москве')).toBe('погоду в Москве');
    expect(extractSearchQuery('найди рецепт пирога')).toBe('рецепт пирога');
  });

  it('removes polite words', () => {
    expect(extractSearchQuery('пожалуйста погугли python')).toBe('python');
    expect(extractSearchQuery('плиз найди новости')).toBe('новости');
  });

  it('removes prepositions', () => {
    expect(extractSearchQuery('поиск по теме python')).toBe('python');
    expect(extractSearchQuery('информация о погоде')).toBe('погоде');
  });

  it('removes disfluencies', () => {
    expect(extractSearchQuery('ну может погугли тест')).toBe('тест');
    expect(extractSearchQuery('короче найди новости')).toBe('новости');
  });

  it('handles edge cases', () => {
    expect(extractSearchQuery('')).toBe('');
    expect(extractSearchQuery('погугли')).toBe('');
    expect(extractSearchQuery('пожалуйста')).toBe('');
  });

  it('cleans up whitespace', () => {
    expect(extractSearchQuery('погугли    тест  ')).toBe('тест');
  });
});
```

### File 2: `src/web-search/messages.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { messages } from './messages.js';

describe('messages', () => {
  describe('acknowledgment', () => {
    it('returns emoji and text', () => {
      const msg = messages.acknowledgment();
      expect(msg).toBe('🔍 Выполняю веб-поиск...');
      expect(msg).toContain('🔍');
    });
  });

  describe('resultDelivery', () => {
    it('formats complete result', () => {
      const result = {
        response: 'Test search result',
        session_id: 'test-session-123',
        stats: {
          models: {
            'gemini-1.5-pro': {
              api: { totalRequests: 1, totalErrors: 0 },
              tokens: { input: 100, candidates: 50, total: 150 }
            }
          }
        }
      };

      const formatted = messages.resultDelivery(result);
      
      expect(formatted).toContain('🌐');
      expect(formatted).toContain('Результат поиска:');
      expect(formatted).toContain('Test search result');
    });

    it('handles multiline responses', () => {
      const result = {
        response: 'Line 1\nLine 2\nLine 3',
        session_id: 'test-123',
        stats: { models: {} }
      };

      const formatted = messages.resultDelivery(result);
      expect(formatted).toContain('Line 1');
      expect(formatted).toContain('Line 2');
    });
  });

  describe('error', () => {
    it('formats error with session ID', () => {
      const error = messages.error('API connection failed', 'session-123');
      
      expect(error).toContain('❌');
      expect(error).toContain('Ошибка поиска:');
      expect(error).toContain('API connection failed');
      expect(error).toContain('Search ID: `session-123`');
    });

    it('formats error without session ID', () => {
      const error = messages.error('Something went wrong');
      expect(error).not.toContain('Search ID:');
    });

    it('truncates long errors', () => {
      const longError = 'A'.repeat(300);
      const error = messages.error(longError, 'id-123');
      
      expect(error.length).toBeLessThan(250); // Account for header
      expect(error).toContain('...');
    });
  });

  describe('timeout', () => {
    it('returns timeout message', () => {
      const msg = messages.timeout();
      expect(msg).toContain('⏱️');
      expect(msg).toContain('слишком много времени');
    });
  });

  describe('cliNotFound', () => {
    it('includes path in error', () => {
      const msg = messages.cliNotFound('/test/path/to/cli');
      expect(msg).toContain('❌');
      expect(msg).toContain('CLI not found');
      expect(msg).toContain('/test/path/to/cli');
      expect(msg).toContain('webSearch.cliPath');
    });
  });
});
```

### File 3: `src/web-search/executor.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWebSearch } from './executor.js';
import { exec } from 'child_process';

vi.mock('child_process', () => ({
  exec: vi.fn()
}));

describe('executeWebSearch', () => {
  const mockExec = vi.mocked(exec);
  
  beforeEach(() => {
    mockExec.mockClear();
  });

  it('executes CLI with query parameter', async () => {
    mockExec.mockImplementation((cmd, opts, callback) => {
      if (callback) {
        callback(null, JSON.stringify({
          response: 'Test result',
          session_id: 'abc-123',
          stats: {
            models: { 'gemini-1.5': {
              api: { totalRequests: 1, totalErrors: 0 },
              tokens: { input: 10, candidates: 20, total: 30 }
            }}
          }
        }), '');
      }
      return {} as any;
    });

    const result = await executeWebSearch('test query');

    expect(result.success).toBe(true);
    expect(result.result?.response).toBe('Test result');
    expect(result.result?.session_id).toBe('abc-123');
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('--request "test query"'),
      expect.objectContaining({ timeout: 30000 }),
      expect.any(Function)
    );
  });

  it('escapes special characters in query', async () => {
    mockExec.mockImplementation((cmd, opts, callback) => {
      if (callback) {
        callback(null, JSON.stringify({
          response: 'Result',
          session_id: 'id-123',
          stats: { models: {} }
        }), '');
      }
      return {} as any;
    });

    await executeWebSearch('test "quoted" query $100');

    const calledCmd = mockExec.mock.calls[0][0] as string;
    expect(calledCmd).toContain('test \\"quoted\\" query \$100');
  });

  it('handles timeout error', async () => {
    mockExec.mockImplementation((cmd, opts, callback) => {
      if (callback) {
        const error: any = new Error('Command timed out');
        error.code = 'ETIMEOUT';
        callback(error, '', '');
      }
      return {} as any;
    });

    const result = await executeWebSearch('test');

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });

  it('handles CLI not found error', async () => {
    mockExec.mockImplementation((cmd, opts, callback) => {
      if (callback) {
        const error: any = new Error('Command not found');
        error.code = 'ENOENT';
        callback(error, '', '');
      }
      return {} as any;
    });

    const result = await executeWebSearch('test');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('supports dry run mode', async () => {
    const result = await executeWebSearch('test query', { dryRun: true });

    expect(result.success).toBe(true);
    expect(result.result?.response).toContain('DRY RUN');
    expect(mockExec).not.toHaveBeenCalled();
  });

  it('handles invalid JSON output gracefully', async () => {
    mockExec.mockImplementation((cmd, opts, callback) => {
      if (callback) {
        callback(null, 'Not JSON - just a string response', '');
      }
      return {} as any;
    });

    const result = await executeWebSearch('test');

    expect(result.success).toBe(true);
    expect(result.result?.response).toBe('Not JSON - just a string response');
    expect(result.result?.session_id).toContain('fallback-');
  });

  it('respects custom timeout', async () => {
    mockExec.mockImplementation((cmd, opts, callback) => {
      if (callback) {
        callback(null, JSON.stringify({
          response: 'Result',
          session_id: 'id-123',
          stats: { models: {} }
        }), '');
      }
      return {} as any;
    });

    await executeWebSearch('test', { timeoutMs: 45000 });

    expect(mockExec).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeout: 45000 }),
      expect.any(Function)
    );
  });
});
```

## 🏃 Running Tests

```bash
# Run all web search tests
pnpm test src/web-search/*.test.ts

# Run with coverage
pnpm test:coverage src/web-search/

# Watch mode
pnpm test:watch src/web-search/detect.test.ts
```

## 📊 Coverage Goals

| Module | Target | Critical Paths |
|--------|--------|----------------|
| detect.ts | 95%+ | Core detection logic |
| messages.ts | 100% | All message templates |
| executor.ts | 90%+ | Error handling, CLI calls |
| **Total** | **≥70%** | Project standard |

## 🔗 Dependencies

- **Previous Cards:** 01-05 (need implementation to test)
- **Next Card:** 07-test-fixtures (need mock data for integration tests)
- **Reference:** `src/deep-research/detect.test.ts` (existing test patterns)

## 📝 Notes

- Mock external dependencies (CLI, network, file system)
- Test edge cases: empty strings, special characters, unicode
- Keep tests fast (web-search module should test in <1s)
- Use descriptive test names
- Group related tests in describes