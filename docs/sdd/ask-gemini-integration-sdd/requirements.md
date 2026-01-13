# Ask Gemini CLI Integration - Requirements

**Feature:** Ask Gemini CLI Integration
**Status:** Approved
**Confidence:** 95%

---

## 1. Problem Statement

Need to integrate Ask Gemini CLI tool into Clawdis system to provide AI agents with:
- Basic AI queries with dynamic mindset selection
- Web search capabilities
- Deep research with URL collections
- PDF document analysis with OCR
- Rich Telegram UI for collection management

---

## 2. Goals and Success Criteria

| Goal | Success Criteria |
|------|------------------|
| Provide basic AI queries | `ask_gemini_basic` tool works with all mindsets |
| Enable web research | `ask_gemini_web` tool performs web search |
| Deep research capability | `ask_gemini_deep_dive` uses research mindset + web |
| PDF analysis | `ask_gemini_pdf` tool handles OCR and page selection |
| Collection management | Rich Telegram UI with inline buttons |

---

## 3. Scope

### In Scope

- Backend tools in `pi-tools.ts`:
  - `createAskGeminiTool()`
  - `createAskGeminiWebTool()`
  - `createAskGeminiDeepDiveTool()`
  - `createAskGeminiPdfTool()`
  - `createAskGeminiCollectionTool()`

- Telegram UI modules:
  - `collection-keyboard.ts`
  - `collection-menu.ts`
  - `collection-detail.ts`
  - `collection-create.ts`
  - `collection-report.ts`
  - `collection-callback.ts`

- SKILL.md files for discovery

### Out of Scope

- publish_me integration (explicitly excluded)
- Real-time notifications system
- Mobile-specific UI layouts

---

## 4. User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-01 | As an AI agent, I want to send basic queries to Gemini with dynamic mindset | High |
| US-02 | As an AI agent, I want to perform web searches with Gemini | High |
| US-03 | As an AI agent, I want to conduct deep research using collections | Medium |
| US-04 | As an AI agent, I want to analyze PDF documents with OCR | High |
| US-05 | As a user, I want to manage collections via Telegram inline buttons | Medium |

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Response time < 5s for basic queries |
| Reliability | Graceful error handling for CLI failures |
| Maintainability | Clear separation between tools and UI |
| Security | No hardcoded credentials |

---

## 6. Constraints

- Must use existing `ask_gemini` CLI at `/home/almaz/TOOLS/ask_cli_agents/`
- Must integrate with existing `url_collections.py` module
- Must follow existing patterns in `pi-tools.ts`
