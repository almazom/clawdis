# Agent Protocol - State Management & Execution

> Reference from KICKOFF.md when needed
> This document provides detailed state update patterns

## State File: state.json

The `state.json` file tracks execution progress. Update it after EACH card.

### State Structure

```json
{
  "overall_status": "IN_PROGRESS|COMPLETE|FAILED",
  "started_at": "2026-01-02T10:00:00Z",
  "completed_at": null,
  "current_card": "01",
  "agent_session_id": "{auto-generated-id}",
  "cards": {
    "01": {
      "status": "pending|in_progress|completed|failed",
      "title": "ADR Documentation",
      "started_at": null,
      "completed_at": null,
      "execution_time_seconds": null,
      "error": null
    },
    "02": { ... },
    ...
  },
  "execution_log": [
    {
      "timestamp": "2026-01-02T10:05:00Z",
      "level": "INFO|WARNING|ERROR",
      "message": "Started card 01",
      "card": "01"
    }
  ]
}
```

## State Update Patterns

### Pattern 1: Start Execution (First Run)

When starting fresh, create initial state:

```bash
cat > state.json << 'EOF'
{
  "overall_status": "IN_PROGRESS",
  "started_at": "2026-01-13T10:00:00Z",
  "current_card": "01",
  "agent_session_id": "session_$(date +%s)",
  "cards": {
    "01": { "status": "pending", "title": "ADR Documentation" },
    "02": { "status": "pending", "title": "Ask Gemini Basic Tool" },
    "03": { "status": "pending", "title": "Ask Gemini Web Tool" },
    "04": { "status": "pending", "title": "Ask Gemini Deep Dive Tool" },
    "05": { "status": "pending", "title": "Ask Gemini PDF Tool" },
    "06": { "status": "pending", "title": "Ask Gemini Collection Tool" },
    "07": { "status": "pending", "title": "Telegram Collection Keyboard" },
    "08": { "status": "pending", "title": "Telegram Collection Menu" },
    "09": { "status": "pending", "title": "Telegram Collection Detail" },
    "10": { "status": "pending", "title": "Telegram Collection Create" },
    "11": { "status": "pending", "title": "Telegram Collection Report" },
    "12": { "status": "pending", "title": "Telegram Collection Callback" },
    "13": { "status": "pending", "title": "SKILL.md Files" },
    "14": { "status": "pending", "title": "E2E Testing" }
  },
  "execution_log": []
}
EOF
```

### Pattern 2: Start a Card

Before executing card N, update its status:

```bash
# Update card status to "in_progress"
jq '.cards.01.status = "in_progress" | .cards.01.started_at = "2026-01-13T10:05:00Z"' \
   state.json > state.json.tmp && mv state.json.tmp state.json

# Update current_card pointer
jq '.current_card = "01"' \
   state.json > state.json.tmp && mv state.json.tmp state.json

# Add to execution log
jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.execution_log += [{timestamp: $now, level: "INFO", message: "Card 01 started", card: "01"}]' \
   state.json > state.json.tmp && mv state.json.tmp state.json
```

### Pattern 3: Complete a Card

After verifying all acceptance criteria:

```bash
# Update card status to "completed"
jq '.cards.01.status = "completed" | .cards.01.completed_at = "2026-01-13T10:30:00Z"' \
   state.json > state.json.tmp && mv state.json.tmp state.json

# Add to execution log
jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.execution_log += [{timestamp: $now, level: "INFO", message: "Card 01 completed", card: "01"}]' \
   state.json > state.json.tmp && mv state.json.tmp state.json
```

### Pattern 4: Complete All Cards

When last card (14) is completed:

```bash
# Update overall status
jq '.overall_status = "COMPLETE" | .completed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' \
   state.json > state.json.tmp && mv state.json.tmp state.json

# Add completion to log
jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.execution_log += [{timestamp: $now, level: "INFO", message: "All 14 cards completed!", card: null}]' \
   state.json > state.json.tmp && mv state.json.tmp state.json
```

### Pattern 5: Handle Error

If a card fails:

```bash
# Update card status to "failed" with error message
jq '.cards.01.status = "failed" | .cards.01.error = "Error description here"' \
   state.json > state.json.tmp && mv state.json.tmp state.json

# Add error to log
jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.execution_log += [{timestamp: $now, level: "ERROR", message: "Card 01 failed: Error description", card: "01"}]' \
   state.json > state.json.tmp && mv state.json.tmp state.json
```

## Quick Reference Commands

```bash
# Start card 01
jq '.cards.01.status = "in_progress" | .cards.01.started_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' state.json > s.json && mv s.json state.json
jq '.current_card = "01"' state.json > s.json && mv s.json state.json

# Complete card 01
jq '.cards.01.status = "completed" | .cards.01.completed_at = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' state.json > s.json && mv s.json state.json

# View current state
cat state.json | jq
```
