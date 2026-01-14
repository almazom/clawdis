# Keyword Detection Specification: Web Search

## 📋 Detection Patterns

### Section 1: Explicit Keywords (Always Trigger)
**Confidence:** High (specific intent)

```typescript
const EXPLICIT_KEYWORDS = [
  // Russian - Search verbs
  "погуглить",
  "погугли",
  "загугли",
  "загуглить",
  "поискать",
  "найди",
  "найти",
  "искать",
  
  // Russian - Search nouns
  "гугл",
  "поиск",
  "веб поиск",
  "поиск в сети",
  "поиск в интернете",
  
  // English
  "google",
  "web search",
  "search the web",
  "search online",
  "look up",
  
  // Mixed
  "сделай поиск",
  "сделай поиск в интернете",
  "веб поиск в google"
];
```

**Pattern:** `[trigger word] + [optional preposition] + [query]`

---

### Section 2: Contextual Patterns (Trigger when followed by topic)
**Confidence:** Medium (intent inferred)

```typescript
const CONTEXTUAL_PATTERNS = {
  // Question words + topic = likely needs current info
  "что такое": "what is",
  "кто такой": "who is",
  "где находится": "where is",
  "когда будет": "when will",
  "как работает": "how does",
  
  // Current time indicators
  "текущий": "current",
  "сейчас": "now",
  "в данный момент": "at the moment",
  "в этом году": "this year",
  "в 2024": "in 2024",
  
  // Weather triggers
  "погода в": "weather in",
  "погода на": "weather for",
  "какая погода": "what's the weather",
  
  // News triggers  
  "последние новости": "latest news",
  "новости о": "news about",
  "что нового": "what's new",
  "что происходит": "what's happening",
  
  // Stock/currency triggers
  "курс": "exchange rate",
  "цена": "price",
  "сколько стоит": "how much does",
  
  // Event triggers
  "когда начинается": "when does start",
  "расписание": "schedule",
  "какие фильмы": "what movies"
};
```

**Trigger Rule:** Pattern + noun/topic = trigger search

---

### Section 3: Topic Keywords (High Confidence Search Topics)
**These topics almost always need fresh web data**

```typescript
const HIGH_CONFIDENCE_TOPICS = [
  // Weather
  "погода", "weather", "температура", "temperature",
  "дождь", "rain", "снег", "snow", "ветер", "wind",
  
  // News & Events
  "новости", "news", "события", "events",
  "криптовалюта", "cryptocurrency", "биткоин", "bitcoin",
  "акции", "stocks", "рынок", "market",
  
  // Currency & Prices
  "курс доллара", "exchange rate", "цена золота", "gold price",
  "нефть", "oil", "газ", "gas",
  
  // Sports
  "результаты матча", "match results", "чемпионат", "championship",
  
  // Entertainment
  "премьера", "premiere", "релиз", "release", "концерт", "concert",
  
  // Technology
  "анонс", "announcement", "запуск", "launch"
];
```

---

## 🔍 Flexible Regex Patterns

### Pattern 1: Flexible Russian Trigger
```regex
(?:^|[\s"'“”‘’(（【])
(?:сделай|сделать|запусти|нужно|давай)
(?:\s+\S+){0,3}?\s+
(?:поиск|погугли|гугл|найди)
(?:\s+(?:про|по|на тему))?
(?![\p{L}\p{N}])
```

**Matches:**
- "давай найдем про python"
- "запусти поиск по новостям"
- "нужно гуглить это"

---

### Pattern 2: Contextual Question
```regex
(?:^|[\s"'“”‘’(（【])
(?:что|кто|где|когда|как)
(?:\s+\S+){0,2}?\s+
(?:такой|такое|такая|находится|будет|работает)
(?:\p{L}\p{N})+
(?![\p{L}\p{N}])
```

**Matches:**
- "что такое квантовая физика"
- "кто такой Эйнштейн"
- "когда будет премьера"

---

## 🚫 Negative Patterns (Do NOT Trigger)

```typescript
const NEGATIVE_PATTERNS = [
  // Already handled by deep research
  "депресерч",
  "deep research",
  "глубокий поиск",
  "глубокое исследование",
  
  // Personal questions (no search needed)
  "как тебя зовут",
  "сколько тебе лет",
  "кто твой создатель",
  
  // Past/historical (likely doesn't need fresh search)
  "в прошлом году",
  "в 2020",
  "раньше", // But "раньше в этом году" might trigger
  
  // Conversational
  "привет",
  "как дела",
  "спасибо",
  "пока"
];
```

---

## 🎯 Detection Confidence Scoring

```typescript
interface DetectionResult {
  shouldSearch: boolean;
  confidence: number; // 0-100
  reason: string;
  extractedQuery: string;
}

// Confidence levels:
// 95-100%: Explicit keywords + topic present
// 85-94%:  Contextual pattern + high-confidence topic
// 75-84%:  Contextual pattern + medium-confidence query
// 60-74%:  Question pattern + any topic
// <60%:   Don't trigger (avoid false positives)
```

**Minimum Confidence Threshold:** 75%

---

## 📊 Detection Examples

### Example 1: High Confidence (Explicit + Topic)
```
Input: "погугли погоду в Москве"
Result: {
  shouldSearch: true,
  confidence: 98,
  reason: "Explicit keyword 'погугли' + weather topic",
  extractedQuery: "погоду в Москве"
}
```

### Example 2: High Confidence (Contextual + High-Confidence Topic)
```
Input: "какая погода в Лондоне"
Result: {
  shouldSearch: true,
  confidence: 92,
  reason: "Contextual pattern 'какая погода' + weather topic",
  extractedQuery: "в Лондоне"
}
```

### Example 3: Medium Confidence (Question Pattern)
```
Input: "кто такой Эйнштейн"
Result: {
  shouldSearch: true,
  confidence: 80,
  reason: "Question pattern 'кто такой'",
  extractedQuery: "Эйнштейн"
}
```

### Example 4: No Search (Low Confidence)
```
Input: "расскажи сказку"
Result: {
  shouldSearch: false,
  confidence: 45,
  reason: "No search indicators detected",
  extractedQuery: ""
}
```

### Example 5: No Search (Deep Research Override)
```
Input: "сделай депресерч про погоду"
Result: {
  shouldSearch: false,
  confidence: 0,
  reason: "Deep research intent detected - takes priority",
  extractedQuery: ""
}
```

---

## 🔧 Implementation Notes

### File: `src/web-search/detect.ts`

```typescript
export function detectWebSearchIntent(message: string): boolean {
  const normalized = message.toLowerCase();
  
  // Check for deep research first (priority)
  if (detectDeepResearchIntent(message)) {
    return false;
  }
  
  // Check explicit keywords
  const explicitMatch = checkExplicitKeywords(normalized);
  if (explicitMatch) return true;
  
  // Check contextual patterns with topics
  const contextualMatch = checkContextualPatterns(normalized);
  if (contextualMatch.confidence >= 75) {
    return true;
  }
  
  return false;
}

export function extractSearchQuery(message: string): string {
  // Strip trigger words, prepositions, polite prefixes
  // Similar to deep-research topic extraction
  let query = message;
  
  // Remove explicit keywords
  for (const keyword of EXPLICIT_KEYWORDS) {
    query = query.replace(new RegExp(keyword, 'gi'), '');
  }
  
  // Remove prepositions
  query = query.replace(/\b(про|по|на тему|о|в|на)\b/gi, '');
  
  // Remove polite prefixes
  query = query.replace(/\b(пожалуйста|плиз|пж)\b/gi, '');
  
  // Clean whitespace
  query = query.replace(/\s+/g, ' ').trim();
  
  // Remove leading punctuation
  query = query.replace(/^[:,.!\-\—]+/, '').trim();
  
  return query;
}
```

---

## ✅ Testing Detection

### Test Cases

```typescript
// test-data.ts
const TEST_CASES = [
  {
    input: "погугли погоду в Москве",
    shouldSearch: true,
    expectedQuery: "погоду в Москве",
    confidence: 95
  },
  {
    input: "какая погода в Лондоне",
    shouldSearch: true,
    expectedQuery: "в Лондоне", // or "какая погода в Лондоне" (decision needed)
    confidence: 90
  },
  {
    input: "последние новости по ИИ",
    shouldSearch: true,
    expectedQuery: "по ИИ",
    confidence: 90
  },
  {
    input: "что такое квантовая физика",
    shouldSearch: true,
    expectedQuery: "квантовая физика",
    confidence: 80
  },
  {
    input: "привет, как дела?",
    shouldSearch: false,
    expectedQuery: "",
    confidence: 0
  },
  {
    input: "сделай депресерч по ИИ",
    shouldSearch: false, // Deep research priority
    expectedQuery: "",
    confidence: 0
  }
];
```

---

## 📚 Related Documentation

- **Design Rationale:** `gaps.md` (Gap-002 and Gap-011 decisions)
- **Implementation:** `requirements.md` (FR-001, FR-002 details)
- **UI Flow:** `ui-flow.md` (User journey with these patterns)
- **Deep Research Patterns:** Reference implementation in `src/deep-research/detect.ts`