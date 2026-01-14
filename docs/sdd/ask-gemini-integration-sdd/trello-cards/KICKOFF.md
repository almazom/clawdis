# Ask Gemini CLI Integration - AI Agent Kickoff

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🤖 AI AGENT INSTRUCTION                                                    ║
║                                                                              ║
║   Execute ALL 14 cards below in LINEAR order.                                ║
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

Implement the Ask Gemini CLI Integration feature by executing 14 Trello cards in linear order.
Track progress in `state.json`. Update after each step. Never skip cards.

## Protocol

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGENT EXECUTION LOOP                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. READ state.json → Find current card (status = "pending")           │
│  2. UPDATE state.json → Set card to "in_progress"                      │
│  3. READ card file → Execute all instructions                          │
│  4. VERIFY → Check all acceptance criteria                             │
│  5. UPDATE state.json → Set card to "completed" or "failed"            │
│  6. UPDATE progress.md → Render progress bar                           │
│  7. LOOP → Go to step 1 until all cards completed                      │
│                                                                         │
│  ON ERROR: Set card to "failed", add error message, STOP for help       │
│  ON COMPLETE: Set overall status to "COMPLETE", celebrate 🎉            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose | Agent Action |
|------|---------|--------------|
| [BOARD.md](./BOARD.md) | Card overview and pipeline | Read once at start |
| [state.json](./state.json) | Progress tracking | Read+write each card |
| [AGENT_PROTOCOL.md](./AGENT_PROTOCOL.md) | State update patterns | Reference when needed |
| [01-adr-documentation.md](./01-adr-documentation.md) | First card | **Execute** |
| [02-ask-gemini-basic-tool.md](./02-ask-gemini-basic-tool.md) | Second card | **Execute** |
| ... | ... | ... |
| [14-e2e-testing.md](./14-e2e-testing.md) | Last card | **Execute** |

## Getting Started

```bash
cd trello-cards
ls -la
```

**First action:** Read [BOARD.md](./BOARD.md) to understand card sequence.

**Second action:** Read [state.json](./state.json) to find current card.

**Then:** Execute cards in order: 01 → 02 → ... → 14

## Completion Criteria

- [ ] All 14 cards in state.json show "completed"
- [ ] No errors in execution log
- [ ] Manual E2E test passes (see card 14)
- [ ] Ready for production

## Success Definition

This implementation is **SUCCESSFUL** when:

1. ✅ All 14 cards completed
2. ✅ 5 backend tools registered in pi-tools.ts
3. ✅ 6 Telegram UI modules created
4. ✅ 5 SKILL.md files for discovery
5. ✅ Manual E2E test passes
6. ✅ Code review shows no issues

---

**NOW BEGIN.** First card: [01-adr-documentation.md](./01-adr-documentation.md)
