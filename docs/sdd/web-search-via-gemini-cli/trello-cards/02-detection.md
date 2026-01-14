# Card 02: Web Search Detection Engine

**Story Points:** 3 | **Priority:** P0 (Blocker) | **Owner:** AI Agent

## 📋 Description

Implement the core detection engine for identifying web search intent from user messages. This includes keyword matching, contextual patterns, query extraction, and deep research precedence.

## ✅ Acceptance Criteria

- [ ] Detection function implemented in `src/web-search/detect.ts`
- [ ] Explicit keyword detection works
- [ ] Contextual pattern detection works
- [ ] Query extraction function works
- [ ] Deep research precedence implemented
- [ ] All patterns tested and working
- [ ] TypeScript types correct

## 🔧 Implementation

### File: `src/web-search/detect.ts`

**Create new file:**

```typescript
/**
 * Web Search keyword detection
 */

const EXPLICIT_KEYWORDS = [
  "погуглить", "погугли", "загугли", "загуглить",
  "поискать", "найди", "найти", "искать",
  "гугл", "поиск", "веб поиск", "вебпоиск",
  "web search", "search the web", "search online",
  "look up", "google"
];

const CONTEXTUAL_PATTERNS = [
  /\b(?:погода|weather|температура|temperature)\b/i,
  /\b(?:новости|news|события|events)\b/i,
  /\b(?:что такое|who is|what is|где|where|когда|when|как|how)\b/i,
  /\b(?:текущий|current|сейчас|now|сегодня|today)\b/i,
];

/**
 * Detect if message contains web search intent
 * Returns false if deep research intent detected (deep research takes priority)
 */
export function detectWebSearchIntent(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  
  // Priority 1: If deep research detected, no web search
  if (detectDeepResearchIntent(normalized)) {
    return false;
  }
  
  // Priority 2: Explicit keywords
  for (const keyword of EXPLICIT_KEYWORDS) {
    if (normalized.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  // Priority 3: Contextual patterns
  for (const pattern of CONTEXTUAL_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  
  // Priority 4: High-confidence topics with question words
  const questionWords = ["что", "кто", "где", "когда", "как"];
  const topics = ["погода", "weather", "новости", "news", "курс", "price"];
  
  const hasQuestion = questionWords.some(w => normalized.includes(w));
  const hasTopic = topics.some(t => normalized.includes(t));
  
  if (hasQuestion && hasTopic) {
    return true;
  }
  
  return false;
}

/**
 * Extract clean search query from message
 */
export function extractSearchQuery(message: string): string {
  let query = message.toLowerCase();
  
  // Remove explicit keywords
  for (const keyword of EXPLICIT_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    query = query.replace(regex, '');
  }
  
  // Remove prepositions and connecting words
  query = query.replace(/\b(про|по|на тему|о|в|на|и|или|да|нет)\b/g, '');
  
  // Remove polite words
  query = query.replace(/\b(пожалуйста|плиз|пж|спасибо)\b/g, '');
  
  // Remove disfluencies
  query = query.replace(/\b(эм|ну|типа|значит|короче|в общем)\b/g, '');
  
  // Clean whitespace and punctuation
  query = query.replace(/\s+/g, ' ').trim();
  query = query.replace(/^[:,.!\-\—]+/, '').trim();
  
  return query || message; // Fallback to original if empty
}

/**
 * Get default patterns for testing/config
 */
export function getWebSearchPatterns() {
  return {
    explicit: EXPLICIT_KEYWORDS,
    contextual: CONTEXTUAL_PATTERNS
  };
}
```

## 🧪 Testing

### Unit Tests: `src/web-search/detect.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { detectWebSearchIntent, extractSearchQuery } from './detect.js';

describe('detectWebSearchIntent', () => {
  it('detects explicit keyword', () => {
    expect(detectWebSearchIntent('погугли погоду')).toBe(true);
  });
  
  it('detects contextual pattern', () => {
    expect(detectWebSearchIntent('погода в Москве')).toBe(true);
  });
  
  it('returns false for normal conversation', () => {
    expect(detectWebSearchIntent('привет как дела')).toBe(false);
  });
  
  it('returns false when deep research detected', () => {
    expect(detectWebSearchIntent('сделай депресерч по python')).toBe(false);
  });
});

describe('extractSearchQuery', () => {
  it('strips explicit keywords', () => {
    expect(extractSearchQuery('погугли погоду в Москве')).toBe('погоду в Москве');
  });
  
  it('removes polite words', () => {
    expect(extractSearchQuery('пожалуйста найди новости')).toBe('новости');
  });
});
```

### Manual Testing Commands
```bash
# Test detection
pnpm test src/web-search/detect.test.ts

# Check coverage
pnpm test:coverage src/web-search/
```

## 🎯 Verification Checklist

After implementation, verify:

- [ ] Detection accuracy ≥95% on test data
- [ ] False positive rate <5%
- [ ] Query extraction returns sensible results
- [ ] Deep research always wins over web search
- [ ] All unit tests pass

## 🔗 Dependencies

- **Previous Card:** 01-config-schema (configuration must exist)
- **Next Card:** 03-messages (detection needed before UI)
- **External:** `src/deep-research/detect.ts` (for precedence logic)

## 📝 Notes

- Start with simple patterns, add complexity iteratively
- Test with real user queries from logs
- Consider adding customPatterns from config for user extensions