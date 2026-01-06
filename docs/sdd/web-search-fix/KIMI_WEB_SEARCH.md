# Kimi Web Search - Usage Guide

> Date: 2026-01-06
> Agent: Kimi (moonshot ai)
> Status: ✅ WORKING

## Quick Start

```bash
kimi --final-message-only -c "your query with web search instructions" -y --output-format stream-json --print
```

## Syntax

```bash
kimi \
  --final-message-only \
  -c "use web search for: YOUR_QUERY [OPTIONS]" \
  -y \
  --output-format stream-json \
  --print
```

## Tested Prompts (5 attempts)

### Attempt 1: Git Flow Principles
```bash
kimi --final-message-only -c "use buildin tools, web_search, web_fetch, for looking for: git flow principles [ANSWER. strictly in russian language]" -y --output-format stream-json --print
```
**Result:** ✅ SUCCESS - Detailed Russian explanation of Git Flow

### Attempt 2: Latest News
```bash
kimi --final-message-only -c "find 3 latest news about AI in 2025, use web search [ANSWER in Russian]" -y --output-format stream-json --print
```
**Result:** ✅ SUCCESS - 3 recent AI news with dates

### Attempt 3: Simple Question
```bash
kimi --final-message-only -c "what is the capital of France? use web search to verify [ANSWER in Russian]" -y --output-format stream-json --print
```
**Result:** ✅ SUCCESS - Fast response (Paris)

### Attempt 4: Site Filter
```bash
kimi --final-message-only -c "find python tutorial for beginners, use web search with site:github.com [ANSWER in Russian]" -y --output-format stream-json --print
```
**Result:** ✅ SUCCESS - GitHub repositories found

### Attempt 5: Pricing Info
```bash
kimi --final-message-only -c "find latest Claude AI pricing 2025, use web search [ANSWER in Russian, short]" -y --output-format stream-json --print
```
**Result:** ✅ SUCCESS - Claude pricing details

## Tips

### 1. Always Use `-y` Flag
```bash
# Without -y: may prompt for confirmation
# With -y: auto-confirm
kimi -c "..." -y
```

### 2. Use `--final-message-only` for Clean Output
```bash
# Without: includes internal tool calls
# With: only final answer
kimi --final-message-only -c "..." -y
```

### 3. Use `--output-format stream-json --print`
```bash
# Clean JSON output
kimi --final-message-only -c "..." -y --output-format stream-json --print
```

### 4. Specify Language in Prompt
```bash
# Russian
[ANSWER. strictly in russian language]

# English (default)
[ANSWER in English]
```

### 5. Request Specific Format
```bash
# Short answer
[ANSWER in Russian, short]

# Detailed answer
[ANSWER in Russian, detailed]
```

## Useful Patterns

### Find Latest News
```bash
kimi --final-message-only -c "find 5 latest news about TOPIC in 2025, use web search [ANSWER in Russian]" -y --output-format stream-json --print
```

### Find Tutorials
```bash
kimi --final-message-only -c "find best TUTORIAL_TYPE for TOPIC on GitHub, use web search with site:github.com [ANSWER in Russian]" -y --output-format stream-json --print
```

### Verify Facts
```bash
kimi --final-message-only -c "verify: FACT? use web search [ANSWER in Russian]" -y --output-format stream-json --print
```

### Compare Options
```bash
kimi --final-message-only -c "compare OPTION1 vs OPTION2, use web search [ANSWER in Russian]" -y --output-format stream-json --print
```

## Comparison: Qwen vs Kimi

| Feature | Qwen | Kimi |
|---------|------|------|
| web_search tool | ✅ Works | ✅ Works |
| web_fetch tool | ❌ Aborts | ✅ Works |
| Response quality | Good | Excellent |
| Russian language | Good | Excellent |
| Speed | Fast | Fast |

## Troubleshooting

### Qwen web_fetch fails
```
Error: "This operation was aborted"
```
**Solution:** Use only `web_search`, avoid `web_fetch`

### Slow responses
**Cause:** Complex queries take time
**Solution:** Add `[short]` to prompt for concise answers

### No web search results
**Cause:** Query may not trigger web search
**Solution:** Explicitly add "use web search" in prompt

## Related

- Kimi CLI: `kimi`
- Qwen CLI: `qwen`
- Alternative: Use gemini CLI directly
