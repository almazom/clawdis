# Project Context: Multi-Agent Web Search

**Feature:** Multi-Agent Parallel Web Search for Telegram Bot
**Date:** 2026-01-06

---

## Existing Architecture

### Current Web Search Flow
```
Telegram User
    │
    ▼
/web command → bot.ts (line ~250+)
    │
    ▼
executeWebSearch() [executor.ts]
    │
    ▼
scripts/web_search_with_gemini.sh
    │
    ▼
gemini CLI → JSON result
```

### Current Bot Structure (src/telegram/bot.ts)

**Key patterns observed:**
1. Uses `webSearchInFlight` Set to prevent duplicate searches (line 55)
2. Uses `editMessageText` to update status messages
3. Error handling with `formatErrorMessage` from `../infra/errors.js`
4. Messages from `../web-search/messages.js`
5. Timeout via `executeWebSearchOptions`

**Web Search Handler Location:**
- Lines 250-300 approximately (need to verify)
- Pattern: acknowledgment → execute → deliver result or error

### Web Search Executor (src/web-search/executor.ts)

**Current behavior:**
- Single agent: gemini CLI only
- Timeout: configurable (default 60s)
- Error handling: returns `{success: false, error: message}`
- JSON parsing with fallback for non-JSON output

### Messages (src/web-search/messages.ts)
- `acknowledgment()` - "🔍 Выполняю веб-поиск..."
- `resultDelivery(result)` - formats result for Telegram
- `error(error)` - formats error message

---

## New Components to Create

### 1. Multi-Agent Executor (src/web-search/multi-agent.ts)
**Already created** - needs integration:
```typescript
executeMultiAgentWebSearch(query, onStatus) → MultiAgentResult
  ├── Spawns 5 agents in parallel
  ├── Returns first success + waits for all
  └── Generates HTML report
```

### 2. Updated Bot Handler (src/telegram/bot.ts)
**Need to modify:**
- `/web` command handler to use `executeMultiAgentWebSearch`
- First success publishing logic
- HTML report sending via publish_me

### 3. CLI Wrappers (scripts/ai-wrappers/)
**Already created:**
- `gemini_cli_web` - Gemini CLI
- `kimi_cli_web` - Kimi CLI
- `qwen_cli_web` - Qwen CLI
- `minimax_cli_web` - MiniMax Claude
- `glm_cli_web` - GLM Claude

---

## Integration Points

### Existing
- `executeWebSearch` - single agent (keep for fallback)
- `webSearchInFlight` - duplicate prevention
- Telegram `editMessageText` - message updates

### New
- `executeMultiAgentWebSearch` - multi-agent orchestrator
- `formatTelegramWithAgent(result)` - format first response
- `publish_me` tool - send HTML reports

---

## Error Handling Patterns

From existing code:
```typescript
// executor.ts style
return {
  success: false,
  error: "user-friendly message",
  runId: `error-${Date.now()}`,
  stdout: "",
  stderr: errorStr
};
```

From bot.ts:
```typescript
try {
  // ...
} catch (error) {
  const errorMessage = formatErrorMessage(error);
  await ctx.api.editMessageText(chatId, msgId, errorMessage);
}
```

---

## Logging Requirements

New logging format:
```
[WEB] 🥊 Starting AI Fight: "query"
[WEB] ⚡ Gemini CLI launched
[WEB] 🔍 Kimi CLI launched
[WEB] ✅ Kimi CLI first success (15346ms)
[WEB] 📤 Published to user: Kimi CLI response
[WEB] ⏳ Waiting for remaining 4 agents...
[WEB] 📊 All 5 agents completed
```

---

## Configuration

All models and API keys from `.env`:
```
WEB_SEARCH_GEMINI_MODEL=gemini-3-flash-preview
ANTHROPIC_ZAI_API_KEY=...
ANTHROPIC_ZAI_MODEL=glm-4.7
ANTHROPIC_MINIMAX_API_KEY=sk-api-...
ANTHROPIC_MINIMAX_MODEL=MiniMax-M2.1
```

---

## Files to Modify

1. `src/telegram/bot.ts` - Update /web handler
2. `src/web-search/executor.ts` - Keep for fallback
3. `src/web-search/multi-agent.ts` - Already created

## Files to Create

1. `src/web-search/multi-agent.ts` - Already created ✓
2. Test file for multi-agent functionality
