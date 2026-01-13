# Deep Research - Keyword Detection Spec

> Status: DRAFT | Last updated: 2026-01-02

## Purpose

Define the exact keyword patterns that trigger the deep research pipeline.

## Detection Strategy

**Approach**: Hardcoded pattern matching + minimal regex fallback for RU verb+keyword (no ML/fuzzy matching in v1). Regex also catches voice transcript variants like "глубокий поиск" and mixed латиница/кириллица.

## Keyword Combinations (FINAL LIST)

**Total: 20 patterns** - Case-insensitive substring match

### Group 1: Russian "депресерч" (transliteration)
| # | Pattern | Example Message |
|---|---------|-----------------|
| 1 | `сделай депресерч` | "Сделай депресерч про AI" |
| 2 | `сделать депресерч` | "Можешь сделать депресерч?" |
| 3 | `сделайте депресерч` | "Сделайте депресерч пожалуйста" |
| 4 | `запусти депресерч` | "Запусти депресерч на тему..." |
| 5 | `нужен депресерч` | "Мне нужен депресерч" |
| 6 | `депресерч по` | "Депресерч по квантовым компьютерам" |
| 7 | `депресерч на тему` | "Депресерч на тему нейросетей" |
| 8 | `депресерч про` | "Депресерч про блокчейн" |

### Group 2: Russian "дип рисерч" (phonetic)
| # | Pattern | Example Message |
|---|---------|-----------------|
| 9 | `сделай дип рисерч` | "Сделай дип рисерч про криптовалюты" |
| 10 | `сделать дип рисерч` | "Можешь сделать дип рисерч?" |

### Group 3: English "deep research"
| # | Pattern | Example Message |
|---|---------|-----------------|
| 11 | `do deep research` | "Can you do deep research?" |
| 12 | `run deep research` | "Run deep research please" |
| 13 | `start deep research` | "Start deep research on..." |
| 14 | `conduct deep research` | "Conduct deep research on..." |
| 15 | `perform deep research` | "Perform deep research on..." |

### Group 4: Mixed RU+EN
| # | Pattern | Example Message |
|---|---------|-----------------|
| 16 | `сделай deep research` | "Сделай deep research про..." |
| 17 | `сделать deep research` | "Можешь сделать deep research?" |
| 18 | `запусти deep research` | "Запусти deep research" |

### Group 5: Russian typo variants
| # | Pattern | Example Message |
|---|---------|-----------------|
| 19 | `сделай дипресерч` | "Сделай дипресерч про..." |
| 20 | `сделать дипресерч` | "Сделать дипресерч по..." |

## Matching Rules (CONFIRMED)

- [x] **Case-insensitive**: `toLowerCase()` before matching
- [x] **Substring match**: pattern anywhere in message
- [x] **Substring match**: pattern can appear anywhere in message
- [x] **No standalone triggers**: bare mentions like "депресерч" or "deep research" do NOT match
- [x] **RU verb+keyword fallback**: allows up to 4 filler words between verb and keyword (e.g. "сделай для этого дипресерч")
- [x] **RU typo variants**: handles "дипресерч" and "гипресерч" only when paired with a verb
- [x] **Voice transcript synonyms**: catches "глубокий поиск" and "глубокое исследование" only when paired with a verb
- [x] **Mixed transcript spelling**: handles mixed латиница/кириллица fragments like "дип-реeseерch"
- [x] **Hyphenated "дип-ресерч"**: recognized via regex fallback when paired with a verb
- [x] **Topic cleanup**: strips leading voice disfluencies ("ну", "э-э-э") and trailing punctuation after extraction

## Implementation Code

```typescript
// src/deep-research/detect.ts

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
];

// Verb + keyword (RU) regex fallback, includes voice synonyms
const FLEXIBLE_RU_TRIGGER_RE = /...глубокий поиск|глубокое исследование.../iu;
// Mixed transcript spelling fallback (латиница/кириллица fragments)
const FLEXIBLE_MIXED_TRIGGER_RE = /...dip-реeseерch.../iu;

export function detectDeepResearchIntent(message: string): boolean {
  const normalized = message.toLowerCase();
  const matchesPattern = DEEP_RESEARCH_PATTERNS.some(pattern =>
    normalized.includes(pattern),
  );
  if (matchesPattern) return true;
  return (
    FLEXIBLE_RU_TRIGGER_RE.test(normalized) ||
    FLEXIBLE_MIXED_TRIGGER_RE.test(normalized)
  );
}

export function extractTopicFromMessage(message: string): string {
  // Remove the trigger keyword (or flexible match) and extract remaining text as topic
  let topic = message;
  for (const pattern of DEEP_RESEARCH_PATTERNS) {
    topic = topic.toLowerCase().replace(pattern, '').trim();
  }
  return topic || message; // fallback to full message if extraction fails
}
```

## Edge Cases (CONFIRMED)

| Input | Expected | Reason |
|-------|----------|--------|
| "Сделай ДЕПРЕСЕРЧ" | ✓ match | case insensitive |
| "Сделай дипресерч" | ✓ match | typo variant supported |
| "Сделай для этого дипресерч" | ✓ match | filler words allowed |
| "Сделай гипресерч" | ✓ match | typo variant supported |
| "Сделай дип-ресерч" | ✓ match | hyphenated variant |
| "Сделай глубокий поиск" | ✓ match | voice synonym with verb |
| "Сделай глубокое исследование" | ✓ match | voice synonym with verb |
| "Сделай дип-реeseерch" | ✓ match | mixed transcript spelling |
| "депресерч" | ✗ no match | standalone mention |
| "deep research" | ✗ no match | standalone mention |
| "глубокий поиск по рынку" | ✗ no match | no verb |
| "Сделай депресерч?" | ✓ match | trigger matches, topic empty |
| "deep researching" | ✗ no match | not an exact pattern |
| "deepsearch" | ✗ no match | different word |
| "исследование" | ✗ no match | not in pattern list |

## Performance

- Detection SLA: <10ms (string includes + one regex)
- Runs on every incoming message from allowed users
- No ML/fuzzy matching
