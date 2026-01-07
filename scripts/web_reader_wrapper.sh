#!/usr/bin/env bash
#
# webReader wrapper script for URL fetching
# Calls the MCP webReader tool to fetch URL content
#

set -euo pipefail

URL="${1:-}"
TIMEOUT="${2:-30}"

if [[ -z "$URL" ]]; then
  echo '[]'
  exit 0
fi

# Use the mcp__web_reader__webReader tool via the Claude Code CLI
# This tool has internet access at the MCP server level

# For now, we'll use curl if available, otherwise return an error
# The actual implementation will call the MCP webReader tool

if command -v curl &>/dev/null; then
  curl -s -L -m "$TIMEOUT" \
    -H "User-Agent: Mozilla/5.0 (compatible; ClawdisBot/1.0)" \
    "$URL" 2>/dev/null || echo "curl-failed"
else
  echo '{"error": "curl not available"}'
fi
