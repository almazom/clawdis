#!/bin/bash

# URL fetch via Gemini CLI (using web_search pattern)
# Uses gemini's google_web_search tool to fetch URL content

set -euo pipefail

# Debug: log that script started
echo "SCRIPT_START: $(date)" >> /tmp/web_fetch_debug.log

# Ensure fnm/node PATH is available
export PATH="/home/almaz/.local/share/fnm/node-versions/v22.21.1/installation/bin:$PATH"

MODEL="${WEB_FETCH_GEMINI_MODEL:-gemini-3-flash-preview}"
TIMEOUT="${WEB_FETCH_TIMEOUT_SECONDS:-110}"
GOAL="${WEB_FETCH_GOAL:-summary}"

URL=""

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    -g|--goal)
      GOAL="${2:-summary}"
      shift 2
      ;;
    *)
      if [[ -z "$URL" ]]; then
        URL="$1"
      fi
      shift
      ;;
  esac
done
echo "URL_PARAM: $URL" >> /tmp/web_fetch_debug.log

if [[ -z "$URL" ]]; then
  echo '{"error": "No URL provided"}'
  exit 1
fi

# Validate URL format
if [[ ! "$URL" =~ ^https?:// ]]; then
  echo '{"error": "Invalid URL format"}'
  exit 1
fi

# Build goal-specific instructions
case "$GOAL" in
  summary)
    GOAL_DESC="Сделай краткое резюме (3-6 предложений) и выдели ключевые темы."
    OUTPUT_BLOCKS="**Краткое резюме:**\n[текст]\n\n**Ключевые темы:**\n• ...\n• ..."
    ;;
  extract)
    GOAL_DESC="Извлеки ключевые факты, имена, цифры и темы без лишней воды."
    OUTPUT_BLOCKS="**Ключевые факты:**\n• ...\n• ...\n\n**Ключевые темы:**\n• ..."
    ;;
  analyze)
    GOAL_DESC="Проанализируй материал: основные тезисы, контекст и возможные выводы."
    OUTPUT_BLOCKS="**Основные тезисы:**\n• ...\n\n**Контекст:**\n[текст]\n\n**Выводы:**\n• ..."
    ;;
  full)
    GOAL_DESC="Верни основной контент страницы максимально полно (с заголовком)."
    OUTPUT_BLOCKS="**Заголовок:**\n...\n\n**Содержание:**\n[текст]"
    ;;
  *)
    GOAL_DESC="Сделай краткое резюме и выдели ключевые темы."
    OUTPUT_BLOCKS="**Краткое резюме:**\n[текст]\n\n**Ключевые темы:**\n• ..."
    ;;
esac

# Create prompt that uses google_web_search to fetch the URL content
# This is similar to how web_search works, but focused on a single page.
PROMPT="Используй инструмент google_web_search для получения содержимого страницы: $URL

Цель: $GOAL_DESC

Формат ответа:
$OUTPUT_BLOCKS

Требования:
- Отвечай ТОЛЬКО на русском языке.
- Используй markdown для форматирования.
- Если страница недоступна, явно сообщи об этом."

# Execute gemini CLI
# Capture stdout only - discard stderr to avoid JSON parse issues
# Also capture exit code
OUTPUT=$(timeout "$TIMEOUT" gemini "$PROMPT" -m "$MODEL" --output-format json 2>/dev/null)
EXIT_CODE=$?

# Debug: write to temp file for troubleshooting
echo "EXIT_CODE=$EXIT_CODE" > /tmp/web_fetch_debug.log
echo "OUTPUT_LENGTH=${#OUTPUT}" >> /tmp/web_fetch_debug.log
echo "OUTPUT_PREVIEW=${OUTPUT:0:200}" >> /tmp/web_fetch_debug.log

# Check if we got valid output
if [[ -z "$OUTPUT" ]]; then
    echo '{"error": "Failed to fetch URL via gemini - no output"}'
    exit 1
fi

# Check if gemini exited with error (but still produced output)
if [[ $EXIT_CODE -ne 0 && ${#OUTPUT} -lt 50 ]]; then
    echo "{\"error\": \"gemini exited with code $EXIT_CODE, output too short\"}"
    exit 1
fi

# Check if output contains valid JSON
if [[ ! "$OUTPUT" =~ ^\{ ]]; then
    # Maybe gemini returned text before JSON, try to extract JSON
    JSON_PART=$(echo "$OUTPUT" | grep -o '{' | tail -1 | sed 's/^/[/;s/$/]/')
    if [[ -n "$JSON_PART" ]]; then
        OUTPUT="$JSON_PART"
    fi
fi

echo "$OUTPUT"
