# Card 03: Write Detection Unit Tests

| Field | Value |
|-------|-------|
| **ID** | DR-03 |
| **Story Points** | 2 |
| **Depends On** | [02-keyword-detection.md](./02-keyword-detection.md) |
| **Sprint** | 1 - Foundation |

## User Story

> As a developer, I want unit tests for keyword detection so that I can verify detection works correctly.

## Context

Read before starting:
- [keyword-detection.md#edge-cases](../keyword-detection.md) - Test cases table
- Existing test patterns in `src/**/*.test.ts`

## Instructions

### Step 1: Create test file
Create file `src/deep-research/detect.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  detectDeepResearchIntent,
  extractTopicFromMessage,
  getDefaultPatterns,
} from './detect.js';

describe('detectDeepResearchIntent', () => {
  describe('Russian patterns', () => {
    it('detects "сделай депресерч"', () => {
      expect(detectDeepResearchIntent('Сделай депресерч про AI')).toBe(true);
    });

    it('detects "дип рисерч" phonetic', () => {
      expect(detectDeepResearchIntent('Сделай дип рисерч про криптовалюты')).toBe(true);
    });

    it('detects typo variant "дипресерч" with verb', () => {
      expect(detectDeepResearchIntent('Сделай дипресерч про рынок')).toBe(true);
    });
  });

  describe('English patterns', () => {
    it('detects "do deep research"', () => {
      expect(detectDeepResearchIntent('Do deep research on quantum computing')).toBe(true);
    });

    it('detects "conduct deep research"', () => {
      expect(detectDeepResearchIntent('Conduct deep research for AI trends')).toBe(true);
    });
  });

  describe('Mixed patterns', () => {
    it('detects "сделай deep research"', () => {
      expect(detectDeepResearchIntent('Сделай deep research про блокчейн')).toBe(true);
    });
  });

  describe('Case insensitivity', () => {
    it('detects uppercase "ДЕПРЕСЕРЧ"', () => {
      expect(detectDeepResearchIntent('Сделай ДЕПРЕСЕРЧ')).toBe(true);
    });

    it('detects mixed case "Deep Research"', () => {
      expect(detectDeepResearchIntent('Do Deep Research please')).toBe(true);
    });
  });

  describe('Substring matching', () => {
    it('matches patterns inside a longer sentence', () => {
      expect(detectDeepResearchIntent('Пожалуйста, сделай депресерч сегодня')).toBe(true);
    });
  });

  describe('Non-matching cases', () => {
    it('does NOT match "депресерч" standalone', () => {
      expect(detectDeepResearchIntent('депресерч')).toBe(false);
    });

    it('does NOT match "дип рисерч" standalone', () => {
      expect(detectDeepResearchIntent('дип рисерч')).toBe(false);
    });

    it('does NOT match "deep research" mention', () => {
      expect(detectDeepResearchIntent('What is deep research?')).toBe(false);
    });

    it('does NOT match "deepsearch" (different word)', () => {
      expect(detectDeepResearchIntent('deepsearch something')).toBe(false);
    });

    it('does NOT match "исследование" (not in patterns)', () => {
      expect(detectDeepResearchIntent('Сделай исследование')).toBe(false);
    });

    it('does NOT match empty string', () => {
      expect(detectDeepResearchIntent('')).toBe(false);
    });

    it('does NOT match random text', () => {
      expect(detectDeepResearchIntent('Hello, how are you?')).toBe(false);
    });
  });

  describe('Custom patterns', () => {
    it('uses custom patterns when provided', () => {
      expect(detectDeepResearchIntent('custom trigger', ['custom trigger'])).toBe(true);
      expect(detectDeepResearchIntent('депресерч', ['custom trigger'])).toBe(false);
    });
  });
});

describe('extractTopicFromMessage', () => {
  it('extracts topic after "сделай депресерч про"', () => {
    expect(extractTopicFromMessage('Сделай депресерч про квантовые компьютеры'))
      .toBe('квантовые компьютеры');
  });

  it('extracts topic after "deep research on"', () => {
    expect(extractTopicFromMessage('Do deep research on AI safety'))
      .toBe('on AI safety'); // removes "do deep research", keeps rest
  });

  it('returns original if no pattern found', () => {
    expect(extractTopicFromMessage('random message'))
      .toBe('random message');
  });

  it('handles pattern at end of message', () => {
    expect(extractTopicFromMessage('Нужен депресерч'))
      .toBe('');
  });

  it('treats punctuation-only topics as empty', () => {
    expect(extractTopicFromMessage('Сделай депресерч?'))
      .toBe('');
    expect(extractTopicFromMessage('Do deep research?'))
      .toBe('');
  });

  it('cleans leading punctuation', () => {
    expect(extractTopicFromMessage('Сделай депресерч: тема исследования'))
      .toBe('тема исследования');
  });
});

describe('getDefaultPatterns', () => {
  it('returns 20 patterns', () => {
    expect(getDefaultPatterns()).toHaveLength(20);
  });

  it('includes key patterns', () => {
    const patterns = getDefaultPatterns();
    expect(patterns).toContain('сделай депресерч');
    expect(patterns).toContain('perform deep research');
    expect(patterns).toContain('сделай дипресерч');
  });
});
```

### Step 2: Run tests
```bash
pnpm test src/deep-research/detect.test.ts
```

### Step 3: Verify all pass
All tests must pass before proceeding.

## Acceptance Criteria

- [ ] File `src/deep-research/detect.test.ts` created
- [ ] Tests cover Russian patterns (5+ cases)
- [ ] Tests cover English patterns (2+ cases)
- [ ] Tests cover mixed patterns (1+ cases)
- [ ] Tests cover case insensitivity (2+ cases)
- [ ] Tests cover non-matching cases (4+ cases)
- [ ] Tests cover topic extraction (4+ cases)
- [ ] All tests pass: `pnpm test src/deep-research/detect.test.ts`

## Files Created

- `src/deep-research/detect.test.ts`

## Next Card

→ [04-telegram-hook.md](./04-telegram-hook.md)
