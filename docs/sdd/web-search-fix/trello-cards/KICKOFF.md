# KICKOFF: Web Search Intermittent Failures Fix

> Bug ID: `WEB-SEARCH-INTERMITTENT` | Start Date: 2026-01-06

## Before You Start

**Activate Auto-Commit Daemon (MANDATORY):**
```bash
cd /home/almaz/zoo_flow/clawdis
nohup ./auto-commit-daemon.sh --feature "web-search-fix" &
```

This ensures:
- ✅ Changes committed every 5 minutes automatically
- ✅ Never lose work
- ✅ Incremental commit history

## Bug Overview

**Problem:** Web search command `/web` produces inconsistent results - sometimes fails with generic error, sometimes succeeds.

**Root Cause:** `src/web-search/executor.ts:80-86` - JSON.parse throws when gemini CLI outputs error text.

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

| Card | Title | SP | Status |
|------|-------|---:|--------|
| [01](./01-regression-test.md) | Regression Test | 2 | TODO |
| [02](./02-implement-fix.md) | Implement Fix | 2 | TODO |
| [03](./03-verify-fix.md) | Verify & PR | 2 | TODO |

## Quick Start

```bash
# 1. Read Card 01
cat 01-regression-test.md

# 2. Write failing test
code src/web-search/executor.test.ts

# 3. Run test (should fail)
pnpm test src/web-search/executor.test.ts

# 4. Commit test
git add src/web-search/executor.test.ts
git commit -m "test: add failing regression test for WEB-SEARCH-INTERMITTENT"

# 5. Proceed to Card 02
cat 02-implement-fix.md
```

## Documentation

| Document | Purpose |
|----------|---------|
| [bug-report.md](../bug-report.md) | Bug details |
| [reproduction-case.md](../reproduction-case.md) | How to reproduce |
| [root-cause-analysis.md](../root-cause-analysis.md) | Why it happens |
| [fix-strategy.md](../fix-strategy.md) | How to fix |

## Key Files

| File | Purpose |
|------|---------|
| `src/web-search/executor.ts` | File with bug |
| `src/web-search/executor.test.ts` | New regression test |
| `scripts/web_search_with_gemini.sh` | Shell script (root cause) |

## Commands

```bash
# Run tests
pnpm test src/web-search/executor.test.ts

# Run all tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint

# Build
pnpm build
```

## Progress Tracking

Check progress:
```bash
cat state.json | jq '.'
```

Update state:
```bash
jq '.cards."01".status = "completed"' state.json > state.json.tmp && mv state.json.tmp state.json
```

## Next Step

Read Card 01 and start the TDD cycle:
```bash
cat 01-regression-test.md
```
