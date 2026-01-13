# Agent Protocol - State Management & Execution

> Reference from KICKOFF.md when needed

## State File: state.json

Update `state.json` after EACH card.

### Start a Card

```bash
jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.cards.01.status = "in_progress" | .cards.01.started_at = $now | .current_card = "01"' \
   state.json > state.json.tmp && mv state.json.tmp state.json
```

### Complete a Card

```bash
jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.cards.01.status = "completed" | .cards.01.completed_at = $now' \
   state.json > state.json.tmp && mv state.json.tmp state.json
```

### Fail a Card

```bash
jq --arg err "Error message here" \
   '.cards.01.status = "failed" | .cards.01.error = $err | .overall_status = "FAILED"' \
   state.json > state.json.tmp && mv state.json.tmp state.json
```

## Execution Checklist

- [ ] Update `state.json` before starting each card
- [ ] Update `progress.md` after completing each card
- [ ] Keep acceptance criteria checked off

## Auto-Commit Daemon

```bash
nohup ./auto-commit-daemon.sh --feature "ai-club-telega-v2-report-fix" &
```
