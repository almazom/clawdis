# Functional Requirements: Web Search via Gemini CLI

> Status: ✅ READY FOR IMPLEMENTATION | Confidence: 97%

## 📋 Requirements

### FR-001: Automatic Web Search Detection
**Priority:** High | **Status:** ✅ Defined

The system shall automatically detect when a user query requires web search based on:
- Explicit keywords: "погуглить", "гугл", "google", "веб поиск", "web search", "search the web", "найди в интернете", "поиск в сети"
- Contextual patterns: Questions about current information, weather, news, events
- Query types: "что такое", "как", "где", "когда" + [topic]
- Current events: "последние новости", "текущая погода", "сегодня"

**Detection Accuracy:** ≥95%
**Confidence Level:** Liberal (prioritize helpfulness over avoiding false positives)

---

### FR-002: Intent Extraction
**Priority:** High | **Status:** ✅ Defined

The system shall extract the actual search query from user messages by:
- Stripping trigger keywords ("погугли", "найди", "поиск")
- Removing polite prefixes ("пожалуйста", "плиз", "пж")
- Cleaning prepositions ("про", "по", "на тему")
- Removing disfluencies ("эм", "ну", "типа", "значит")
- Handling both Russian and English keywords

**Output:** Clean search query suitable for Gemini CLI

---

### FR-003: Gemini CLI Integration
**Priority:** High | **Status:** ✅ Defined

The system shall execute web search using the existing Gemini CLI tool:
- **CLI Path:** `/home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh`
- **Invocation:** `./web-search-by-Gemini.sh --request "<query>"`
- **Timeout:** 30 seconds (configurable via `webSearch.timeoutMs`)
- **Output:** JSON with fields: `{response, session_id, stats}`
- **Language:** Responses always in Russian (per tool configuration)

**Success Rate:** ≥98% (accounting for network/API failures)
**Max Response Time:** 30 seconds

---

### FR-004: Automatic Execution (No Confirmation)
**Priority:** Medium | **Status:** ✅ Defined

The system shall execute web searches automatically without user confirmation because:
- Operation is lightweight (5-10 seconds typical)
- Low API cost per search
- User expectation: immediate answers, not research reports

**Exception:** If search overlaps with detected deep research intent, deep research takes priority

---

### FR-005: Visual Result Distinction
**Priority:** High | **Status:** ✅ Defined

Search results shall be visually distinguished from standard responses:
- **System message:** "🔍 Выполняю веб-поиск..." (when search triggered)
- **Result prefix:** "🌐 Результат поиска:" (globe emoji prefix)
- **Error indication:** "❌ Ошибка поиска:" (error state)
- **Timeout indication:** "⏱️ Поиск занял слишком много времени"

---

### FR-006: Error Handling and Recovery
**Priority:** High | **Status:** ✅ Defined

The system shall handle failures gracefully:
- **CLI not found:** Return clear error with path info and config hint
- **Timeout (30s):** Return timeout message and clean up process
- **API failures:** Return Gemini error message with search ID
- **Invalid output:** Return parsing error and raw output for debugging
- **Network errors:** Return connection issues with retry suggestion

**User Message Format:**
```
❌ Ошибка поиска: [User-friendly error message]
Search ID: [session_id if available]
```

---

### FR-007: Deep Research Precedence
**Priority:** High | **Status:** ✅ Defined

When a query triggers both web search AND deep research intents:
- Deep research takes priority (explicit intent wins)
- Web search is NOT executed
- User receives deep research acknowledgment and flow

**Priority Order:**
1. Deep research (explicit keywords: "депресерч", "deep research")
2. Web search (contextual or explicit search keywords)

---

### FR-008: Configuration Support
**Priority:** Medium | **Status:** ✅ Defined

The system shall support configuration via `clawdis.json`:

```typescript
webSearch: {
  enabled: boolean (default: true)
  cliPath: string (default: "/home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh")
  timeoutMs: number (default: 30000)
  requireConfirmation: boolean (default: false)
  customPatterns: string[] (optional, user-defined keywords)
}
```

---

### FR-009: In-Flight Request Management
**Priority:** Medium | **Status:** ✅ Defined

The system shall prevent duplicate searches from the same user:
- Track in-flight searches per user/chat
- If user sends another message while search is running:
  - Queue the message normally (don't cancel search)
  - Search continues and delivers result

---

### FR-010: Platform Support (v1)
**Priority:** Medium | **Status:** ✅ Defined

The system shall support web search in:
- **Telegram:** Full support including message formatting
- **Discord:** Not in v1 (add in v2 following deep-research pattern)

---

### FR-011: Performance Requirements
**Priority:** Medium | **Status:** ✅ Defined

The system shall meet performance targets:
- **Detection latency:** <100ms (regex matching)
- **Total search time:** <30s (99th percentile)
- **Typical search time:** 5-10s (network + Gemini processing)

---

### FR-012: Multi-language Support
**Priority:** Low | **Status:** ✅ Defined

The system shall support keywords in:
- Russian (primary, based on user base)
- English (secondary, for technical terms)

**Not in v1:** Spanish, German, French keywords (add based on demand)

---

## 🎯 User Stories

### US-001: Typical Web Search
**As a** Telegram user, **I want** to search for current information, **So that** I can get up-to-date answers

**Scenario:**
```
User: "погода в Москве"
Bot: "🔍 Выполняю веб-поиск..."
[5 seconds later]
Bot: "🌐 Результат поиска:
В Москве сейчас +15°C, переменная облачность..."
```

**Acceptance Criteria:**
- ✅ Search triggered by contextual question
- ✅ Visual indicator shows search is happening
- ✅ Result clearly marked as search result
- ✅ Total time <10 seconds

---

### US-002: Explicit Web Search
**As a** user, **I want** to explicitly request a web search, **So that** I know the AI will search fresh info

**Scenario:**
```
User: "погугли последние новости по ИИ"
Bot: "🔍 Выполняю веб-поиск..."
[8 seconds later]
Bot: "🌐 Результат поиска:
Основные события в ИИ за 2024 год..."
```

---

### US-003: Deep Research Precedence
**As a** user, **I want** explicit commands to take priority, **So that** I get the expected heavy research, not quick search

**Scenario:**
```
User: "сделай депресерч про погоду в Москве"
Bot: "🔍 Вижу запрос на deep research
Тема: погода в Москве"
[Deep research workflow begins...]
```

---

### US-004: Search Error Handling
**As a** user, **I want** clear error messages when search fails, **So that** I know what happened and how to fix it

**Scenario:**
```
User: "погода в Москве"
Bot: "🔍 Выполняю веб-поиск..."
[Error occurs]
Bot: "❌ Ошибка поиска:
Не удалось подключиться к Gemini API. Проверьте сетевое соединение.
Search ID: abc-123-def"
```

---

## 📊 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Detection Accuracy | ≥95% | Test suite + logs |
| Search Success Rate | ≥98% | Error tracking per search ID |
| Avg Response Time | <10s | Performance monitoring |
| Timeout Rate | <1% | Timeout count / total searches |
| False Positive Rate | <5% | Incorrect search triggers |

---

## 🔗 References

- **Deep Research SDD:** `/docs/sdd/deep-research/` (gold standard)
- **Skills System:** `/skills/brave-search/` (existing search implementation)
- **Tool README:** `/home/almaz/TOOLS/web_search_by_gemini/README.md`
- **Wiki:** `.qoder/repowiki/en/content/Skills System.md`