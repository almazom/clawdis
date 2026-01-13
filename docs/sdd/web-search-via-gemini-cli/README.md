# Web Search via Gemini CLI - SDD

> **Status:** ✅ IMPLEMENTED - Cards 01-09 Complete  
> **Feature:** Automatic web search integration via Gemini CLI  
> **Total SP:** 24 | **Cards:** 12  
> **Confidence:** 97%

---

## 📖 Executive Summary

This SDD documents the implementation of automatic web search capability for Clawdis AI assistant. The feature detects when users need fresh information, executes web searches via Gemini CLI, and returns results with clear visual distinction.

**Key Value:** Users can get current information (weather, news, events) without leaving Telegram, with results clearly marked as web searches.

**Innovation:** Liberal detection algorithm prioritizes helpfulness over avoiding false positives, making the AI proactive rather than reactive.

---

## 🎯 Feature Overview

### What It Does

```
User: "погода в Москве"
Bot:  "🔍 Выполняю веб-поиск..."
[5-10 seconds later]
Bot:  "🌐 Результат поиска:
      В Москве сейчас +15°C..."
```

**Detection Methods:**
- Explicit keywords: "погугли", "search", "google"
- Contextual patterns: Questions about current info
- Topic keywords: Weather, news, prices, events

**Execution:**
- Calls Gemini CLI tool at configured path
- Timeout: 30 seconds
- Returns JSON with response, session_id, stats

**Visual Distinction:**
- 🔍 Acknowledgment (search in progress)
- 🌐 Result prefix (search result)
- ❌ Error indication (problem occurred)

---

## 📊 Technical Specifications

### Architecture

```
src/web-search/
├── detect.ts      (intent detection + query extraction)
├── messages.ts    (message templates)
├── executor.ts    (CLI execution)
├── deliver.ts     (result formatting)
└── index.ts       (public API)
```

### Configuration

```typescript
webSearch: {
  enabled: boolean (default: true)
  cliPath: string (default: "/home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh")
  timeoutMs: number (default: 30000)
  requireConfirmation: boolean (default: false)
  customPatterns: string[] (optional)
}
```

### Detection Confidence

| Pattern Type | Examples | Confidence |
|--------------|----------|------------|
| Explicit keywords | "погугли погоду" | 95-100% |
| Contextual + topic | "какая погода в Москве" | 85-94% |
| Question pattern | "что такое python" | 75-84% |
| Deep research | "сделай депресерч" | 0% (triggers deep research) |

**Minimum Threshold:** 75% confidence to trigger search

---

## 📋 Requirements Summary

### Functional Requirements (12 total)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-001 | Automatic web search detection | ✅ Defined |
| FR-002 | Intent extraction | ✅ Defined |
| FR-003 | Gemini CLI integration | ✅ Defined |
| FR-004 | Auto-execution (no confirmation) | ✅ Defined |
| FR-005 | Visual result distinction | ✅ Defined |
| FR-006 | Error handling and recovery | ✅ Defined |
| FR-007 | Deep research precedence | ✅ Defined |
| FR-008 | Configuration support | ✅ Defined |
| FR-009 | In-flight request management | ✅ Defined |
| FR-010 | Platform support (Telegram) | ✅ Defined |
| FR-011 | Performance requirements | ✅ Defined |
| FR-012 | Multi-language support | ✅ Defined |

### Success Metrics

- Detection Accuracy: ≥95%
- Search Success Rate: ≥98%
- Avg Response Time: <10 seconds
- False Positive Rate: <5%
- Code Coverage: ≥70%

---

## 🎭 Use Cases

### UC-001: Contextual Web Search
**Trigger:** Natural language question

```
User: "погода в Париже"
Bot:  "🔍 Выполняю веб-поиск..."
[8s later]
Bot:  "🌐 Результат поиска:
      В Париже +18°C, ясно..."
```

**Confidence:** 92% (contextual pattern)

---

### UC-002: Explicit Web Search
**Trigger:** User uses search keywords

```
User: "погугли последние новости по ИИ"
Bot:  "🔍 Выполняю веб-поиск..."
[10s later]
Bot:  "🌐 Результат поиска:
      Основные события в ИИ..."
```

**Confidence:** 98% (explicit keyword)

---

### UC-003: Deep Research Precedence
**When both detected:**

```
User: "сделай депресерч про погоду"
Bot:  "🔍 Вижу запрос на deep research
      Тема: погода"
[Deep research workflow starts]
```

**Rule:** Explicit > Contextual

---

## 🔍 Gap Analysis (15 gaps - all filled)

**High Confidence Decisions (10 gaps):**
- Project structure mirrors deep-research ✅
- Detection patterns follow proven approach ✅
- Message format uses emoji standards ✅
- Configuration schema follows Zod pattern ✅
- Auto-execution (no confirmation) ✅
- Telegram integration pattern ✅
- Testing strategy ✅
- Result formatting ✅
- Platform support (v1: Telegram only) ✅
- CLI execution parameters ✅

**Resolved Decisions (5 gaps requiring user input):**
- **Detection Threshold:** Liberal (prioritize helpfulness)
- **Overlap Resolution:** Deep research takes priority
- **Result Caching:** No caching (freshness priority)
- **Multi-language:** Russian/English only
- **Post-processing:** Raw response only (v1)

**Overall Confidence:** 97.8%

---

## 📚 Implementation Guide

### For AI Agent

**Execution Path:**
1. Start with Card 01 (Configuration Schema)
2. Execute linearly through Card 12
3. Follow patterns from deep-research feature
4. Maintain 70%+ code coverage
5. Update BOARD.md as you progress

**Key Files:**
```
src/web-search/
trello-cards/01-12.md
docs/sdd/web-search-via-gemini-cli/*.md
```

**Reference Implementation:**
```bash
# Study deep-research patterns
cat src/deep-research/detect.ts
cat src/deep-research/messages.ts
cat src/deep-research/executor.ts
```

---

## 🚀 Getting Started

### AI Agent Quick Start

```bash
# 1. Setup
cd /home/almaz/zoo_flow/clawdis
git checkout -b feature/web-search-gemini-cli

# 2. Read kickoff guide
cat docs/sdd/web-search-via-gemini-cli/trello-cards/KICKOFF.md

# 3. Begin Card 01
cat docs/sdd/web-search-via-gemini-cli/trello-cards/01-config-schema.md

# 4. Execute each card linearly
```

### Human Quick Start

```bash
# 1. Review SDD
cat docs/sdd/web-search-via-gemini-cli/requirements.md
cat docs/sdd/web-search-via-gemini-cli/gaps.md

# 2. Test after implementation
pnpm test src/web-search/

# 3. Manual Telegram testing
pnpm dev telegram --token $TELEGRAM_BOT_TOKEN
# Send: "погода в Москве" and verify

# 4. Review PR when ready
```

---

## 📖 Documentation Index

| Document | Purpose | Status |
|----------|---------|--------|
| `README.md` | This file - SDD overview | ✅ Complete |
| `requirements.md` | Functional requirements (12 FRs) | ✅ Complete |
| `ui-flow.md` | User journey and message templates | ✅ Complete |
| `keyword-detection.md` | Detection patterns and specs | ✅ Complete |
| `gaps.md` | Gap analysis (15 gaps filled) | ✅ Complete |
| `manual-e2e-test.md` | Test cases (12 TCs) | ✅ Complete |
| `BOARD.md` | Trello board overview | ✅ Complete |
| `KICKOFF.md` | AI Agent execution guide | ✅ Complete |

---

## 🎯 Verification Checklist

### Before Implementation Starts
- [x] All requirements defined
- [x] All gaps filled (97.8% confidence)
- [x] UI flow documented
- [x] Test cases written
- [x] 12 Trello cards created
- [x] Patterns validated against deep-research

### After Implementation
- [ ] All 12 cards marked DONE
- [ ] Code coverage ≥70%
- [ ] All unit tests pass
- [ ] E2E tests pass
- [ ] Manual tests pass
- [ ] Telegram integration works
- [ ] Documentation reviewed
- [ ] PR created and approved
- [ ] Deployed to production
- [ ] Monitoring in place

---

## 🔗 External References

- **Gemini CLI Tool:** `/home/almaz/TOOLS/web_search_by_gemini/`
- **Deep Research SDD:** `docs/sdd/deep-research/`
- **Skills System Wiki:** `.qoder/repowiki/en/content/Skills System.md`
- **Example Skill:** `skills/brave-search/`

---

## 🎉 Success Criteria

**Feature is DONE when:**

✅ All 12 cards executed and marked DONE  
✅ 70%+ test coverage achieved  
✅ Manual E2E tests pass  
✅ Human tested on real Telegram  
✅ Documentation complete  
✅ PR merged to main  
✅ Deployed to production  
✅ Monitoring shows <1% errors  

---

**Status:** 🚀 Ready for Implementation  
**Next Step:** Read `trello-cards/KICKOFF.md` and begin Card 01