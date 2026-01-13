# Agent Protocol - Detailed Execution Guide

> This document provides detailed instructions for state management.
> Reference from KICKOFF.md when needed.

## State Update Patterns

### Pattern 1: Start Execution (First Run)

When starting fresh, update state.json:

```json
{
  "overall_status": "IN_PROGRESS",
  "started_at": "2026-01-02T10:00:00Z",
  "current_card": "01",
  "agent_session_id": "<use conversation/session id if available>"
}
```

### Pattern 2: Start a Card

Before executing card N:

```json
{
  "current_card": "N",
  "cards": {
    "N": {
      "status": "in_progress",
      "started_at": "2026-01-02T10:05:00Z"
    }
  }
}
```

Add to execution_log:
```json
{
  "execution_log": [
    {"ts": "2026-01-02T10:05:00Z", "event": "card_start", "card": "01", "title": "Config Schema"}
  ]
}
```

### Pattern 3: Complete a Card

After verifying all acceptance criteria:

```json
{
  "cards": {
    "N": {
      "status": "completed",
      "completed_at": "2026-01-02T10:15:00Z",
      "acceptance_criteria_passed": ["criterion1", "criterion2", "..."]
    }
  },
  "progress": {
    "completed": 1,
    "percentage": 8,
    "story_points_completed": 2
  }
}
```

Add to execution_log:
```json
{"ts": "...", "event": "card_complete", "card": "01", "duration_sec": 600}
```

### Pattern 4: Card Failure

If card fails:

```json
{
  "overall_status": "FAILED",
  "cards": {
    "N": {
      "status": "failed",
      "error": "Description of what failed"
    }
  }
}
```

Add to execution_log:
```json
{"ts": "...", "event": "card_failed", "card": "N", "error": "..."}
```

### Pattern 5: All Complete

When card 12 is completed:

```json
{
  "overall_status": "COMPLETE",
  "completed_at": "2026-01-02T12:00:00Z",
  "current_card": null,
  "progress": {
    "completed": 12,
    "percentage": 100,
    "story_points_completed": 30
  }
}
```

---

## Progress Bar Rendering

Use this template to update progress.md:

### Progress Bar Formula

```
completed = number of completed cards
total = 12
percentage = (completed / total) * 100
filled = floor(percentage / 4)  # 25 chars total
empty = 25 - filled

bar = "[" + "█" * filled + "░" * empty + "]"
```

### Examples

```
0%:   [░░░░░░░░░░░░░░░░░░░░░░░░░] 0% (0/12 cards)
25%:  [██████░░░░░░░░░░░░░░░░░░░] 25% (3/12 cards)
50%:  [████████████░░░░░░░░░░░░░] 50% (6/12 cards)
75%:  [██████████████████░░░░░░░] 75% (9/12 cards)
100%: [█████████████████████████] 100% (12/12 cards)
```

### Status Icons

| Status | Icon | Progress.md Text |
|--------|------|------------------|
| pending | ⏳ | `⏳ Pending` |
| in_progress | 🔄 | `🔄 In Progress` |
| completed | ✅ | `✅ Completed` |
| failed | ❌ | `❌ Failed` |

---

## Acceptance Criteria Verification

For each card, verify criteria BEFORE marking complete:

### Verification Checklist

1. **Read criteria** from card's "Acceptance Criteria" section
2. **Check each item** - run commands, inspect files
3. **Record passed criteria** in state.json
4. **Only mark complete** if ALL criteria pass

### Example Verification (Card 01)

```markdown
## Acceptance Criteria (from 01-config-schema.md)

- [ ] `deepResearchSchema` added to config.ts
- [ ] Schema has: `enabled`, `dryRun`, `cliPath`, `outputLanguage`, `keywords`
- [ ] `dryRun` defaults to `true`
- [ ] Env overrides work
- [ ] `pnpm build` passes
- [ ] Type `DeepResearchConfig` is exported
```

Verification steps:
```bash
# Check schema exists
grep -n "deepResearchSchema" src/config/config.ts

# Check dryRun default
grep -n "dryRun.*default.*true" src/config/config.ts

# Check build passes
pnpm build

# Check type export
grep -n "DeepResearchConfig" src/config/config.ts
```

---

## TodoWrite Integration

Use TodoWrite for sub-task tracking within each card:

### Card Start
```typescript
TodoWrite([
  { content: "Read card instructions", status: "completed", activeForm: "Reading instructions" },
  { content: "Step 1: Create file X", status: "in_progress", activeForm: "Creating file X" },
  { content: "Step 2: Modify file Y", status: "pending", activeForm: "Modifying file Y" },
  { content: "Verify acceptance criteria", status: "pending", activeForm: "Verifying criteria" },
])
```

### Card End
```typescript
TodoWrite([
  { content: "Card 01 - Config Schema", status: "completed", activeForm: "Config Schema" },
  { content: "Card 02 - Keyword Detection", status: "in_progress", activeForm: "Keyword Detection" },
  // ... remaining cards as pending
])
```

---

## File Update Order

After each card completion:

1. **state.json** - Update card status, progress, log
2. **progress.md** - Update bar, table, current activity
3. **TodoWrite** - Update internal tracking

---

## Error Recovery

### Scenario: Build Fails

1. Check error message
2. Fix the issue
3. Re-run `pnpm build`
4. If still fails after 3 attempts, mark card as failed

### Scenario: Test Fails

1. Read test error
2. Fix code or test
3. Re-run test
4. If still fails after 3 attempts, mark card as failed

### Scenario: File Conflict

1. Read existing file first
2. Make minimal changes
3. Preserve existing functionality
4. Run tests to verify

---

## Completion Checklist

Before marking overall_status = "COMPLETE":

- [ ] All 12 cards have status = "completed"
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] progress.md shows 100%
- [ ] state.json progress.completed = 12
- [ ] No errors in execution_log

---

## Quick Reference

### Timestamps
Use ISO 8601: `2026-01-02T10:30:00Z`

### Story Points by Card
01=2, 02=3, 03=2, 04=3, 05=2, 06=3, 07=3, 08=2, 09=2, 10=3, 11=3, 12=2

### Card Dependencies
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12
