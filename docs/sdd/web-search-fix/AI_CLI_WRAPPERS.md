# AI CLI Wrappers - Multi-Agent Query System

> Date: 2026-01-06
> Purpose: Unified CLI wrappers for querying 5 different AI agents

## Available Wrappers

| Wrapper | Backend | Speed | Best For |
|---------|---------|-------|----------|
| `ask_gemini` | Gemini CLI | ⚡ Fast (6-10s) | Quick answers, web search |
| `ask_kimi` | Kimi CLI | Fast (10-15s) | Detailed answers, Russian |
| `ask_qwen` | Qwen CLI | Fast (10-15s) | General queries, web search |
| `ask_glm` | Claude + GLM | Medium (15-25s) | Complex reasoning, structured |
| `ask_minimax` | Claude + MiniMax | Medium (15-25s) | Complex reasoning, structured |

## Installation

```bash
# Add to your PATH
export PATH="/home/almaz/zoo_flow/clawdis/scripts/ai-wrappers:$PATH"
```

## Usage

### Web Search Queries
```bash
ask_gemini "git flow principles" --web
ask_kimi "latest news about AI" --web
ask_qwen "python tutorial" --web
```

### General Questions
```bash
ask_gemini "что такое Git Flow?"
ask_kimi "объясни машинное обучение простыми словами"
ask_glm "сравни Python и JavaScript"
ask_minimax "напиши функцию на Python"
ask_qwen "как работает HTTP протокол?"
```

## Wrapper Scripts

### ask_gemini
```bash
#!/bin/bash
# ask_gemini - Query Gemini CLI

QUERY="$1"
MODE="${2:-general}"  # general or web

if [ "$MODE" = "--web" ]; then
  PROMPT="use web search for: $QUERY [ANSWER in Russian]"
else
  PROMPT="$QUERY [ANSWER in Russian]"
fi

gemini "$PROMPT" -m gemini-3-flash-preview --output-format json 2>&1 | \
  jq -r '.response // .'
```

### ask_kimi
```bash
#!/bin/bash
# ask_kimi - Query Kimi CLI

QUERY="$1"
MODE="${2:-general}"

if [ "$MODE" = "--web" ]; then
  EXTRA="-c"
else
  EXTRA="-c"
fi

kimi --final-message-only $EXTRA "$QUERY [ANSWER in Russian]" \
  -y --output-format stream-json --print 2>&1
```

### ask_qwen
```bash
#!/bin/bash
# ask_qwen - Query Qwen CLI

QUERY="$1"

NODE_NO_WARNINGS=1 qwen -p "$QUERY [ANSWER. strictly in russian language]" -y 2>&1
```

### ask_glm
```bash
#!/bin/bash
# ask_glm - Query Claude with GLM model

QUERY="$1"

export ANTHROPIC_DEFAULT_OPUS_MODEL=glm-4.7
export ANTHROPIC_DEFAULT_HAIKU_MODEL=glm-4.7
export ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic
export ANTHROPIC_AUTH_TOKEN="${ANTHROPIC_ZAI_API_KEY:-your-token-here}"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

claude -p "$QUERY [ANSWER in Russian]" \
  --dangerously-skip-permissions --output-format json 2>&1 | \
  jq -r '.[0].text // .'
```

### ask_minimax
```bash
#!/bin/bash
# ask_minimax - Query Claude with MiniMax model

QUERY="$1"

export ANTHROPIC_SMALL_FAST_MODEL=MiniMax-M2.1
export ANTHROPIC_DEFAULT_OPUS_MODEL=MiniMax-M2.1
export ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
export ANTHROPIC_AUTH_TOKEN="${ANTHROPIC_MINIMAX_API_KEY:-your-token-here}"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1

claude -p "$QUERY [ANSWER in Russian]" \
  --dangerously-skip-permissions --output-format json 2>&1 | \
  jq -r '.[0].text // .'
```

## Environment Variables

Add to `.env`:

```bash
# GLM (Z.AI)
ANTHROPIC_ZAI_API_KEY=469c4a87d685405e982debcbcd814eac.O6fldQP7ES3zKxYE
ANTHROPIC_ZAI_BASE_URL=https://api.z.ai/api/anthropic
ANTHROPIC_ZAI_MODEL=glm-4.7

# MiniMax
ANTHROPIC_MINIMAX_API_KEY=sk-api-...
ANTHROPIC_MINIMAX_BASE_URL=https://api.minimax.io/anthropic
ANTHROPIC_MINIMAX_MODEL=MiniMax-M2.1
```

## Advanced: Parallel Query

```bash
#!/bin/bash
# parallel_ask.sh - Ask all AI agents, return first result

QUERY="$1"

echo "Query: $QUERY"
echo "Running 5 agents in parallel..."
echo ""

# Run all, return first success
(
  echo "=== Gemini ===" && ask_gemini "$QUERY"
) &
PID1=$!

(
  echo "=== Kimi ===" && ask_kimi "$QUERY"
) &
PID2=$!

(
  echo "=== Qwen ===" && ask_qwen "$QUERY"
) &
PID3=$!

(
  echo "=== GLM ===" && ask_glm "$QUERY"
) &
PID4=$!

(
  echo "=== MiniMax ===" && ask_minimax "$QUERY"
) &
PID5=$!

# Wait for first complete
wait $PID1 $PID2 $PID3 $PID4 $PID5 2>/dev/null
```

## Quality Ranking by Task

| Task Type | Best Choice | Second Choice |
|-----------|-------------|---------------|
| Quick facts | Gemini | Qwen |
| Detailed explanation | Kimi | GLM |
| Code generation | MiniMax | GLM |
| Web search | Kimi | Gemini |
| Russian text | Kimi | All work |
| Structured data | GLM | MiniMax |

## Troubleshooting

### "API key not found"
```
Solution: Set ANTHROPIC_AUTH_TOKEN in .env
```

### Timeout
```
Solution: Increase timeout in wrapper script
```

### JSON parse error
```
Solution: Check if response is valid JSON
```

## Related Documentation

- [PARALLEL_TEST.md](./PARALLEL_TEST.md) - Multi-agent comparison
- [KIMI_WEB_SEARCH.md](./KIMI_WEB_SEARCH.md) - Kimi web search guide
- [BUGFIX.md](./BUGFIX.md) - Web search bug fix
