# WEB-SEARCH-INTERMITTENT Bug Fix - Trello Board

> Scrum Master: AI Agent | Sprint: Linear Execution
> Story Point Cap: 4 SP per card | Method: TDD (RED→GREEN→VERIFY)

## TDD Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                  BUG FIX PIPELINE                       │
│                                                         │
│         TDD: RED → GREEN → VERIFY                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│  │    01    │ → │    02    │ → │    03    │            │
│  │   2 SP   │   │   2 SP   │   │   2 SP   │            │
│  └──────────┘   └──────────┘   └──────────┘            │
│  🔴 RED        🟢 GREEN       ✅ VERIFY                │
│  Regression    Implement      Full                      │
│  Test          Fix            Verification              │
│                                                         │
│  Total: 6 Story Points                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Card Index

| Card | Title | SP | Depends On | Status |
|------|-------|----|-----------:|--------|
| [01](./01-regression-test.md) | Regression Test | 2 | - | TODO |
| [02](./02-implement-fix.md) | Implement Fix | 2 | 01 | TODO |
| [03](./03-verify-fix.md) | Verify & PR | 2 | 02 | TODO |

## Bug Information

| Property | Value |
|----------|-------|
| Bug ID | WEB-SEARCH-INTERMITTENT |
| Summary | Web search intermittent failures |
| Severity | P2 |
| Root Cause | JSON.parse throws on non-JSON stdout |
| Location | `src/web-search/executor.ts:80-86` |

## Key Files

| File | Purpose |
|------|---------|
| `src/web-search/executor.ts` | File with bug |
| `src/web-search/executor.test.ts` | New regression test |
| `scripts/web_search_with_gemini.sh` | Shell script (output format) |

## Execution Order

```
START
  │
  ├─→ Card 01: Regression Test
  │   ├── Write test that exposes bug
  │   ├── Verify test FAILS
  │   └── Commit test
  │
  ├─→ Card 02: Implement Fix
  │   ├── Apply minimal fix
  │   ├── Verify test PASSES
  │   ├── Run all tests
  │   └── Commit fix
  │
  └─→ Card 03: Verify & PR
      ├── Run full verification
      ├── Check reproduction script
      ├── Create PR
      └── Done!
```

## Sprint Summary

| Metric | Value |
|--------|-------|
| Total Cards | 3 |
| Total Story Points | 6 |
| Method | TDD (RED → GREEN → VERIFY) |

## Verification Commands

```bash
# Quick status check
pnpm test src/web-search/executor.test.ts  # Regression test
pnpm test                                   # All tests
./reproduce-web-search-bug.sh               # Should exit 0 (no bug)
```

## Final PR Creation (After Card 03)

**Execute after completing final card:**
```bash
# 1. Verify all committed
git status

# 2. Push branch
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"

# 3. Create Pull Request (MANDATORY)
gh pr create \
  --title "fix: WEB-SEARCH-INTERMITTENT - handle non-JSON stdout" \
  --body "Bug fix for web search intermittent failures.

- Cards: 3
- Status: Ready
- See trello-cards/KICKOFF.md for details"
```

**⚠️ DO NOT MARK COMPLETE WITHOUT PR ⚠️**
