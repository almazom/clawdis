# Card 02: Create Keyword Detection Module

| Field | Value |
|-------|-------|
| **ID** | DR-02 |
| **Story Points** | 3 |
| **Depends On** | [01-config-schema.md](./01-config-schema.md) |
| **Sprint** | 1 - Foundation |

## User Story

> As the system, I want to detect deep research intent from user messages so that I can trigger the research pipeline.

## Context

Read before starting:
- [keyword-detection.md](../keyword-detection.md) - 20 patterns + code template

Detection is case-insensitive substring matching. No ML, no regex - just `String.includes()`.

## Instructions

### Step 1: Create module directory
```bash
mkdir -p src/deep-research
```

### Step 2: Create detect.ts
Create file `src/deep-research/detect.ts`:

```typescript
/**
 * Deep Research keyword detection
 * @see docs/sdd/deep-research/keyword-detection.md
 */

const DEEP_RESEARCH_PATTERNS = [
  // Group 1: Russian "депресерч"
  'сделай депресерч',
  'сделать депресерч',
  'сделайте депресерч',
  'запусти депресерч',
  'нужен депресерч',
  'депресерч по',
  'депресерч на тему',
  'депресерч про',
  // Group 2: Russian phonetic
  'сделай дип рисерч',
  'сделать дип рисерч',
  // Group 3: English
  'do deep research',
  'run deep research',
  'start deep research',
  'conduct deep research',
  'perform deep research',
  // Group 4: Mixed
  'сделай deep research',
  'сделать deep research',
  'запусти deep research',
  // Group 5: Russian typo variants
  'сделай дипресерч',
  'сделать дипресерч',
] as const;

/**
 * Detect if message contains deep research intent
 * @param message - User message text
 * @param customPatterns - Optional custom patterns from config
 * @returns true if deep research intent detected
 */
export function detectDeepResearchIntent(
  message: string,
  customPatterns?: readonly string[],
): boolean {
  const patterns = customPatterns ?? DEEP_RESEARCH_PATTERNS;
  const normalized = message.toLowerCase();
  return patterns.some(pattern => normalized.includes(pattern.toLowerCase()));
}

/**
 * Extract topic from message by removing trigger keywords
 * @param message - Original user message
 * @returns Extracted topic or original message
 */
export function extractTopicFromMessage(message: string): string {
  let topic = message;
  const normalized = message.toLowerCase();

  // Find and remove the longest matching pattern
  let longestMatch = '';
  for (const pattern of DEEP_RESEARCH_PATTERNS) {
    if (normalized.includes(pattern.toLowerCase()) && pattern.length > longestMatch.length) {
      longestMatch = pattern;
    }
  }

  if (longestMatch) {
    // Remove pattern (case-insensitive) and clean up
    const regex = new RegExp(longestMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    topic = message.replace(regex, '').trim();
    // Remove leading punctuation/whitespace
    topic = topic.replace(/^[\s:,.\-—]+/, '').trim();
  }

  return topic || message;
}

/**
 * Get all default patterns (for testing/config)
 */
export function getDefaultPatterns(): readonly string[] {
  return DEEP_RESEARCH_PATTERNS;
}
```

### Step 3: Create index.ts for module
Create file `src/deep-research/index.ts`:

```typescript
export {
  detectDeepResearchIntent,
  extractTopicFromMessage,
  getDefaultPatterns,
} from './detect.js';
```

### Step 4: Verify build
```bash
pnpm build
```

## Acceptance Criteria

- [ ] File `src/deep-research/detect.ts` created
- [ ] File `src/deep-research/index.ts` created
- [ ] `detectDeepResearchIntent()` exported
- [ ] `extractTopicFromMessage()` exported
- [ ] All 20 patterns included
- [ ] Case-insensitive matching works
- [ ] `pnpm build` passes

## Files Created

- `src/deep-research/detect.ts`
- `src/deep-research/index.ts`

## Next Card

→ [03-detection-tests.md](./03-detection-tests.md)
