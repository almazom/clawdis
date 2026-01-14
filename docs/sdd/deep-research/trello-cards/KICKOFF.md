# Deep Research Implementation - AI Agent Kickoff

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🤖 AI AGENT INSTRUCTION                                                    ║
║                                                                              ║
║   Execute ALL 12 cards below in LINEAR order.                                ║
║   Update state.json after EACH card.                                         ║
║   Do NOT stop until all cards are "completed" or an error occurs.            ║
║                                                                              ║
║   START NOW. First action: Read state.json, find first pending card.         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

> **ENTRY POINT**: This is the ONLY file you need. Everything is linked from here.
> This file is SELF-CONTAINED. Do not ask for clarification - all info is here.

## Mission

Implement the Deep Research feature by executing 12 Trello cards in linear order.
Track progress in `state.json`. Update after each step. Never skip cards.
**DRY-RUN MODE IS ON** - no API costs during development.

## Protocol

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGENT EXECUTION LOOP                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. READ state.json → Find current card (status = "pending")            │
│  2. UPDATE state.json → Set card to "in_progress"                       │
│  3. READ card file → Execute all instructions                           │
│  4. VERIFY → Check all acceptance criteria                              │
│  5. UPDATE state.json → Set card to "completed" or "failed"             │
│  6. UPDATE progress.md → Render progress bar                            │
│  7. LOOP → Go to step 1 until all cards completed                       │
│                                                                         │
│  ON ERROR: Set card to "failed", add error message, STOP                │
│  ON COMPLETE: Set overall status to "COMPLETE", celebrate 🎉            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose | Agent Action |
|------|---------|--------------|
| `state.json` | Progress tracking | READ + WRITE after each card |
| `progress.md` | Visual progress | WRITE after each card |
| `01-*.md` to `12-*.md` | Card instructions | READ + EXECUTE |
| `BOARD.md` | Card index | Reference only |

## State Management

### Reading State
```bash
cat docs/sdd/deep-research/trello-cards/state.json
```

### Updating State
After each card, update `state.json` with new status and timestamp.

### State Schema
```json
{
  "version": "1.0",
  "feature": "deep-research",
  "overall_status": "IN_PROGRESS | COMPLETE | FAILED",
  "started_at": "ISO timestamp",
  "completed_at": "ISO timestamp or null",
  "current_card": "01 | 02 | ... | 12 | null",
  "cards": {
    "01": { "status": "pending|in_progress|completed|failed", "started_at": null, "completed_at": null, "error": null },
    ...
  },
  "progress": {
    "completed": 0,
    "total": 12,
    "percentage": 0
  }
}
```

## Execution Rules

### MUST DO
1. ✅ Read state.json before each card
2. ✅ Update state.json after each step
3. ✅ Verify ALL acceptance criteria before marking complete
4. ✅ Run `pnpm build` after code changes
5. ✅ Run `pnpm test` for test cards
6. ✅ Update progress.md with visual bar
7. ✅ Use TodoWrite tool for sub-task tracking within each card

### MUST NOT
1. ❌ Skip cards or execute out of order
2. ❌ Mark card complete without verifying criteria
3. ❌ Continue after a failed card (stop and report)
4. ❌ Modify state.json schema
5. ❌ Execute cards that are already "completed"

## Card Execution Template

For each card, follow this pattern:

```
=== CARD {N} START ===

1. Update state.json: card {N} → "in_progress"
2. Read card file: {N}-*.md
3. Create TodoWrite with card's steps
4. Execute each instruction in order
5. Verify each acceptance criteria (checklist)
6. Run pnpm build (must pass)
7. Update state.json: card {N} → "completed"
8. Update progress.md
9. Log: "Card {N} completed ✅"

=== CARD {N} END ===
```

## Progress Visualization

Update `progress.md` after each card:

```markdown
# Deep Research Implementation Progress

[████████████░░░░░░░░░░░░] 50% (6/12 cards)

| Card | Title | Status |
|------|-------|--------|
| 01 | Config Schema | ✅ |
| 02 | Keyword Detection | ✅ |
| 03 | Detection Tests | ✅ |
| 04 | Telegram Hook | ✅ |
| 05 | Acknowledgment | ✅ |
| 06 | Inline Button | 🔄 IN PROGRESS |
| 07 | Executor | ⏳ |
| ... | ... | ... |

Last updated: {timestamp}
Current: Card 06 - Inline Button
```

## Quick Start

### Step 1: Initialize State
If `state.json` doesn't exist, create it from template.

### Step 2: Start Execution Loop
```
Read state.json
→ Find first "pending" card
→ Execute it
→ Update state
→ Repeat until done
```

### Step 3: Report Completion
When all 12 cards are "completed":
1. Set `overall_status` to "COMPLETE"
2. Update `progress.md` to show 100%
3. Output: "🎉 Deep Research feature implementation complete!"

## Resume Protocol

If execution was interrupted:
1. Read `state.json`
2. Find card with `status: "in_progress"` → Resume from there
3. Or find first `status: "pending"` → Start there
4. Continue normal loop

## Error Protocol

If a card fails:
1. Set card status to "failed"
2. Add error message to card's "error" field
3. Set `overall_status` to "FAILED"
4. STOP execution
5. Output error details for human review

---

## BEGIN EXECUTION

### Exact Steps to Start

**Step 1**: Read state.json
```bash
cat docs/sdd/deep-research/trello-cards/state.json
```

**Step 2**: Find first card with `"status": "pending"` (should be "01")

**Step 3**: Read that card file
```bash
cat docs/sdd/deep-research/trello-cards/01-config-schema.md
```

**Step 4**: Execute card instructions, update state.json after completion

**Step 5**: Repeat for cards 02, 03, ... 12

### State Update Example (Card 01 Start)

Edit `state.json`:
```json
{
  "overall_status": "IN_PROGRESS",
  "started_at": "2026-01-02T...",
  "current_card": "01",
  "cards": {
    "01": {
      "status": "in_progress",
      "started_at": "2026-01-02T..."
    }
  }
}
```

### State Update Example (Card 01 Complete)

Edit `state.json`:
```json
{
  "current_card": "02",
  "cards": {
    "01": {
      "status": "completed",
      "completed_at": "2026-01-02T..."
    }
  },
  "progress": {
    "completed": 1,
    "percentage": 8
  }
}
```

---

## AGENT: START NOW

1. Read `state.json`
2. Execute first pending card
3. Update `state.json` and `progress.md`
4. Loop until all 12 cards completed
5. Never stop, never ask - all info is in the card files
