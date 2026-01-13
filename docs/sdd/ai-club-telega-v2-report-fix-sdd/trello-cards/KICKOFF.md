# AI Club Telega v2 Report Fix - Implementation Kickoff

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🤖 AI AGENT INSTRUCTION                                                    ║
║                                                                              ║
║   Execute ALL 4 cards below in LINEAR order.                                 ║
║   Update state.json after EACH card.                                         ║
║   Do NOT stop until all cards are "completed".                               ║
║                                                                              ║
║   START NOW. First action: Read state.json, find first pending card.         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

> **ENTRY POINT**: This is the ONLY file you need. Everything is linked from here.
> This file is SELF-CONTAINED. Do not ask for clarification - all info is here.

## Mission

Implement the AI Club Telega v2 Report Fix by executing 4 Trello cards in linear order.
Track progress in `state.json`. Update after each step. Never skip cards.

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
│  ON ERROR: Set card to "failed", add error message, STOP for help        │
│  ON COMPLETE: Set overall status to "COMPLETE"                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose | Agent Action |
|------|---------|--------------|
| [BOARD.md](./BOARD.md) | Card overview and pipeline | Read once at start |
| [state.json](./state.json) | Progress tracking | Read+write each card |
| [AGENT_PROTOCOL.md](./AGENT_PROTOCOL.md) | State update patterns | Reference when needed |
| [01-*.md](./01-investigate-failure.md) | First card | **Execute** |
| [02-*.md](./02-command-aliases.md) | Second card | **Execute** |
| [03-*.md](./03-telega-v2-pipeline.md) | Third card | **Execute** |
| [04-*.md](./04-delivery-tests-docs.md) | Last card | **Execute** |

## Getting Started

```bash
cd trello-cards
ls -la
```

**First action:** Read [BOARD.md](./BOARD.md) to understand card sequence.

**Second action:** Read [state.json](./state.json) to find current card.

**Then:** Execute cards in order: 01 → 02 → 03 → 04

## Completion Criteria

- [ ] All cards in state.json show "completed"
- [ ] No errors in execution log
- [ ] Manual E2E test passes (see card 04)

---

## 🎯 Git Flow Enforcement - MANDATORY

**You MUST follow git flow and create a Pull Request. This is NOT optional.**

### Phase 1: Auto-Commit Setup (Start Immediately)

Before executing cards, start the auto-commit daemon:

```bash
nohup ./auto-commit-daemon.sh --feature "ai-club-telega-v2-report-fix" &
```

### Phase 2: Final Git Flow Steps (After Final Card)

**After completing card 04, you MUST execute these commands:**

```bash
# 1. Ensure all changes are committed
git status

# 2. If any remaining changes, commit manually
./smart_commit.sh --feature "ai-club-telega-v2-report-fix"

# 3. Push branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push -u origin "$CURRENT_BRANCH"

# 4. Create Pull Request (FORCEFUL - DO NOT SKIP)
if command -v gh &> /dev/null; then
    gh pr create \
        --title "feat: ai-club-telega-v2-report-fix implementation" \
        --body "Implementation complete\n\n- Feature: AI Club Telega v2 Report Fix\n- Cards completed: 4\n- Status: Ready" \
        --base main
else
    echo "gh not installed; run gh pr create manually"
    exit 1
fi
```

---

**NOW BEGIN.** First card: [01-investigate-failure.md](./01-investigate-failure.md)
