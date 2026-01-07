#!/bin/bash
# parallel_web_search.sh - Run all 4 web search wrappers in parallel
# Returns FIRST successful result (fastest wins)
# Usage: parallel_web_search.sh "your query"

QUERY="$1"
WRAPPER_DIR="$(dirname "$0")"

if [ -z "$QUERY" ]; then
  echo '{"error": "No query provided"}'
  exit 1
fi

echo "=== Parallel Web Search ===" >&2
echo "Query: $QUERY" >&2
echo "Running 4 agents in parallel..." >&2
echo "" >&2

run_wrapper() {
  local name=$1
  local script=$2
  local start=$(date +%s%3N)

  result=$("$script" "$QUERY" 2>&1)
  local exit_code=$?
  local end=$(date +%s%3N)
  local duration=$((end - start))

  if [ $exit_code -eq 0 ] && [ -n "$result" ]; then
    echo "$result" | jq -c --arg name "$name" --arg duration "$duration" \
      '{source: $name, duration_ms: ($duration | tonumber), response: .}'
    return 0
  fi
  return 1
}

# Run all 4 in parallel, return first success
(
  run_wrapper "gemini" "$WRAPPER_DIR/gemini_cli_web"
) &
PID1=$!

(
  run_wrapper "kimi" "$WRAPPER_DIR/kimi_cli_web"
) &
PID2=$!

(
  run_wrapper "minimax" "$WRAPPER_DIR/minimax_cli_web"
) &
PID3=$!

(
  run_wrapper "glm" "$WRAPPER_DIR/glm_cli_web"
) &
PID4=$!

# Wait for first success
winner=""
while [ -z "$winner" ]; do
  for pid in $PID1 $PID2 $PID3 $PID4; do
    if ! kill -0 $pid 2>/dev/null; then
      # Process finished
      wait $pid 2>/dev/null
      exit_code=$?
      if [ $exit_code -eq 0 ]; then
        winner="found"
        break
      fi
    fi
  done
  [ -n "$winner" ] && break
  sleep 0.1
done

# Kill all others
for pid in $PID1 $PID2 $PID3 $PID4; do
  kill $pid 2>/dev/null
  wait $pid 2>/dev/null
done

echo "" >&2
echo "=== First result received ===" >&2
