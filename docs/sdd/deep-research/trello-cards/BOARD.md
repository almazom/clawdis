# Deep Research - Trello Board

> Scrum Master: AI Agent | Sprint Duration: Linear Execution
> Story Point Cap: 4 SP per card | Principle: KISS

## Execution Order

Cards MUST be executed sequentially. Each card is self-contained with full context.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXECUTION PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SPRINT 1: Foundation (Config + Detection)                              │
│  ┌─────┐   ┌─────┐   ┌─────┐                                           │
│  │ 01  │ → │ 02  │ → │ 03  │                                           │
│  │ 2SP │   │ 3SP │   │ 2SP │                                           │
│  └─────┘   └─────┘   └─────┘                                           │
│  Config    Detect    Tests                                              │
│                                                                         │
│  SPRINT 2: Telegram Integration                                         │
│  ┌─────┐   ┌─────┐   ┌─────┐                                           │
│  │ 04  │ → │ 05  │ → │ 06  │                                           │
│  │ 3SP │   │ 2SP │   │ 3SP │                                           │
│  └─────┘   └─────┘   └─────┘                                           │
│  Hook      Ack       Button                                             │
│                                                                         │
│  SPRINT 3: Execution Engine                                             │
│  ┌─────┐   ┌─────┐   ┌─────┐                                           │
│  │ 07  │ → │ 08  │ → │ 09  │                                           │
│  │ 3SP │   │ 2SP │   │ 2SP │                                           │
│  └─────┘   └─────┘   └─────┘                                           │
│  Executor  Parser    Deliver                                            │
│                                                                         │
│  SPRINT 4: Integration & Polish                                         │
│  ┌─────┐   ┌─────┐   ┌─────┐                                           │
│  │ 10  │ → │ 11  │ → │ 12  │                                           │
│  │ 3SP │   │ 3SP │   │ 2SP │                                           │
│  └─────┘   └─────┘   └─────┘                                           │
│  Wire      Errors    E2E                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Card Index

| Card | Title | SP | Depends On | Status |
|------|-------|----|-----------:|--------|
| [01](./01-config-schema.md) | Add deepResearch config schema | 2 | - | TODO |
| [02](./02-keyword-detection.md) | Create keyword detection module | 3 | 01 | TODO |
| [03](./03-detection-tests.md) | Write detection unit tests | 2 | 02 | TODO |
| [04](./04-telegram-hook.md) | Hook detection into Telegram handler | 3 | 03 | TODO |
| [05](./05-acknowledgment.md) | Send detection acknowledgment message | 2 | 04 | TODO |
| [06](./06-inline-button.md) | Create confirmation inline button | 3 | 05 | TODO |
| [07](./07-executor.md) | Create gdr.sh executor wrapper | 3 | 06 | TODO |
| [08](./08-result-parser.md) | Parse result.json for delivery | 2 | 07 | TODO |
| [09](./09-result-delivery.md) | Format and send result message | 2 | 08 | TODO |
| [10](./10-wire-pipeline.md) | Wire complete pipeline | 3 | 09 | TODO |
| [11](./11-error-handling.md) | Add error handling + retry button | 3 | 10 | TODO |
| [12](./12-e2e-test.md) | E2E test with dry-run | 2 | 11 | TODO |

**Total: 30 Story Points**

## References

- [requirements.md](../requirements.md) - Full functional spec
- [ui-flow.md](../ui-flow.md) - User journey diagram
- [keyword-detection.md](../keyword-detection.md) - 20 patterns + code
- [gaps.md](../gaps.md) - All decisions documented

## Agent Execution System

| File | Purpose |
|------|---------|
| [KICKOFF.md](./KICKOFF.md) | **ENTRY POINT** - Start here |
| [state.json](./state.json) | Progress tracking (JSON) |
| [progress.md](./progress.md) | Visual progress bar |
| [AGENT_PROTOCOL.md](./AGENT_PROTOCOL.md) | Detailed state management |

### To Start Implementation

Tell AI Agent:
```
Read docs/sdd/deep-research/trello-cards/KICKOFF.md and execute all cards.
```

### Agent Instructions

1. Execute cards in order (01 → 02 → ... → 12)
2. Update `state.json` after each card
3. Update `progress.md` with visual bar
4. Verify ALL acceptance criteria before marking complete
5. Use `DEEP_RESEARCH_DRY_RUN=true` throughout development
6. Run `pnpm build` and `pnpm test` after code changes
