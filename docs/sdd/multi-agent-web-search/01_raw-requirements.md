# Raw Requirements: Multi-Agent Web Search

**Feature:** Multi-Agent Parallel Web Search for Telegram Bot
**Date:** 2026-01-06
**Source:** User conversation (Russian)

---

## Core Requirement

When user sends `/web "query"` command to Telegram bot:

### Step 1: Parallel Execution
- Spawn 5 AI agents simultaneously:
  1. `gemini_cli_web` - Google Gemini CLI
  2. `kimi_cli_web` - Kimi CLI (best quality)
  3. `qwen_cli_web` - Qwen CLI (fast, reliable)
  4. `minimax_cli_web` - MiniMax Claude API
  5. `glm_cli_web` - GLM Claude API (Z.AI)

### Step 2: First Success Publishing
- Track all 5 agents in real-time
- When first agent succeeds → PUBLISH immediately to user
- Log: "🥊 Starting AI Fight: 'query'"
- Log each agent status as they respond
- Technical message: "First responder: Kimi CLI (15.3s)"

### Step 3: Continue Waiting
- Continue waiting for remaining 4 agents
- Log: "⏳ Waiting for remaining agents..."
- Track all responses and errors

### Step 4: HTML Report Generation
- Generate comprehensive HTML report in Russian
- Include:
  - Bar chart visualization of response times
  - Agent comparison table
  - Winner highlight
  - Quality scores (⭐)
  - Full responses from each agent
  - **AI Analysis Block** (NEW):
    - Use Kimi or best-quality agent to analyze all 5 responses
    - Generate summary comparing:
      - Different perspectives from each agent
      - Consensus points and contradictions
      - Best answer recommendation

### Step 5: Publish via publish_me
- Send HTML report using `/publish_me` tool
- Show all 5 agents results
- Include AI-generated summary and analysis
- Include timing analytics and insights

---

## Quality Requirements

### Logging
```
[WEB] 🥊 Starting AI Fight: "Python 3.12 features"
[WEB] ⚡ Gemini CLI launched
[WEB] 🔍 Kimi CLI launched
[WEB] 🐉 Qwen CLI launched
[WEB] 🧠 MiniMax Claude launched
[WEB] 🪄 GLM Claude launched
[WEB] ✅ Kimi CLI first success (15346ms)
[WEB] 📤 Published to user: Kimi CLI response
[WEB] ⏳ Waiting for remaining 4 agents...
[WEB] ✅ Qwen CLI success (20668ms)
[WEB] ✅ Gemini CLI success (27340ms)
[WEB] ❌ MiniMax Claude failed (API error)
[WEB] ✅ GLM Claude success (50671ms)
[WEB] 📊 All 5 agents completed
[WEB] 📄 Generating HTML report...
[WEB] 📨 Sending to publish_me...
```

### Error Handling
- Each agent independently error-handled
- No single point of failure
- Timeout per agent: 180 seconds
- Graceful degradation if agent fails
- Log all errors with context

---

## Technical Context

### Existing Components
- `src/web-search/executor.ts` - Current web search executor
- `src/web-search/multi-agent.ts` - Multi-agent orchestrator (created)
- `scripts/ai-wrappers/` - CLI wrappers for each agent

### Integrations
- Telegram Bot API (grammy)
- Claude Code Task tool (for subagents)
- publish_me tool (for HTML reports)
- telegramify-markdown (for formatting)

---

## Out of Scope (MVP)
- User feedback collection
- Caching of results

---

## Success Criteria
1. `/web` spawns 5 agents in parallel
2. First successful response published within 15-30 seconds
3. HTML report generated with all results
4. All errors logged with context
5. System continues if 1-2 agents fail
