# Parallel Web Search Test - Multi-AI Comparison

> Date: 2026-01-06
> Purpose: Compare web search quality across 5 AI agents
> Query: "git flow principles" (Russian response)

## Results Summary (All 5 ✅ WORK!)

| # | Agent | Time | Quality | Notes |
|---|-------|------|---------|-------|
| 1 | **Gemini CLI** | 6.7s | ⭐⭐⭐⭐ | Fast, concise, built-in web search |
| 2 | **Kimi CLI** | ~12s | ⭐⭐⭐⭐⭐ | Best quality, includes git commands |
| 3 | **Qwen CLI** | ~12s | ⭐⭐⭐ | web_fetch has issues, needs fallback |
| 4 | **MiniMax (Claude)** | ~20s | ⭐⭐⭐⭐ | Good, includes sources |
| 5 | **GLM (Claude)** | ~20s | ⭐⭐⭐⭐ | Good, includes sources |

## Individual Results

### 1. Gemini CLI (FASTEST - 6.7s)
```bash
gemini "use web search for: git flow principles [ANSWER in Russian]" \
  -m gemini-3-flash-preview --output-format json
```
**Result:** Concise, well-structured response. 2 API requests (fallback model used).

### 2. Kimi CLI (BEST QUALITY - ~12s)
```bash
kimi --final-message-only -c "use web search for: git flow principles [ANSWER in Russian]" \
  -y --output-format stream-json --print
```
**Result:** Most detailed, includes git commands, installation, criticism, alternatives.

### 3. Qwen CLI (WORKS - ~12s)
```bash
NODE_NO_WARNINGS=1 qwen -p "use web_search for: git flow principles [ANSWER. strictly in russian language]" -y
```
**Note:** `web_fetch` tool fails, but `web_search` works. Response quality good.

### 4. MiniMax Claude (WORKS - ~20s)
```bash
export ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
export ANTHROPIC_AUTH_TOKEN=sk-api-...
claude -p "use builtin tools, web_search, web_fetch, for looking for: git flow principles" \
  --dangerously-skip-permissions --output-format json
```
**Result:** Good, includes sources from Habr.

### 5. GLM Claude (WORKS - ~20s)
```bash
export ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
export ANTHROPIC_AUTH_TOKEN=...
claude -p "use builtin tools, web_search, web_fetch, for looking for: git flow principles" \
  --dangerously-skip-permissions --output-format json
```
**Result:** Good, includes 5 sources, table format.

## Architecture Proposal: CLI Wrappers

### Concept
Create unified CLI wrappers so PI agent can use any web search backend:

```
pi-agent
  ├── gemini_cli_web    → gemini CLI with web search
  ├── kimi_cli_web      → kimi CLI with web search
  ├── qwen_cli_web      → qwen CLI with web search
  ├── minimax_cli_web   → Claude + MiniMax API
  └── glm_cli_web       → Claude + GLM API
```

### Wrapper Design
```bash
#!/bin/bash
# gemini_cli_web - Gemini CLI web search wrapper

QUERY="$1"
PROMPT="use web search for: $QUERY [ANSWER in Russian]"

# Execute with timeout fallback
timeout 60 gemini "$PROMPT" -m gemini-3-flash-preview -o json \
  || timeout 90 gemini "$PROMPT" -m gemini-2.5-flash -o json \
  || echo '{"error": "gemini failed"}'
```

### Fallback Strategy
1. **First-result-wins** - Return fastest response
2. **Cascade** - If primary fails, try next
3. **Quality vote** - All run in parallel, best wins

## Related Documentation

- [KIMI_WEB_SEARCH.md](./KIMI_WEB_SEARCH.md) - Kimi usage guide
- [BUGFIX.md](./BUGFIX.md) - Web search bug fix details
