# WEB-SEARCH-INTERMITTENT Bug Fix - AI Agent Kickoff

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🐛 BUG FIX INSTRUCTION                                                     ║
║                                                                              ║
║   Execute ALL 3 cards below in LINEAR order.                                ║
║   Follow TDD: RED (test) → GREEN (fix) → VERIFY                             ║
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

Fix bug **WEB-SEARCH-INTERMITTENT** by executing 3 Trello cards in linear order using TDD.
Track progress in `trello-cards/state.json`. Update after each card. Never skip cards.

## Bug Summary

- **ID:** WEB-SEARCH-INTERMITTENT
- **Summary:** Web search produces inconsistent results - sometimes fails with generic "Ошибка поиска", sometimes succeeds
- **Severity:** P2
- **Root Cause:** JSON.parse throws when gemini CLI outputs error text instead of JSON at `src/web-search/executor.ts:80-86`

## Git Flow Enforcement - MANDATORY

### ⚡ Phase 1: Start Auto-Commit Daemon (REQUIRED)

**This is NOT optional. DO NOT skip this step.**

```bash
# Navigate to trello-cards directory
cd trello-cards

# Start auto-commit daemon (5-minute intervals)
nohup ./auto-commit-daemon.sh --feature "web-search-fix" &

# Verify daemon is running
ps aux | grep auto-commit-daemon
```

**What this does:**
- ✅ Auto-commits every 5 minutes
- ✅ Never lose work
- ✅ Incremental commit history
- ✅ Zero cognitive overhead

**Manage daemon:**
```bash
# Check status
ps aux | grep auto-commit-daemon

# Stop daemon (when done)
./auto-commit-daemon.sh --stop
```

### 📋 Phase 2: During Implementation

Each card will remind you to check git status. The daemon handles commits automatically.

### 🎯 Phase 3: Final PR Creation (REQUIRED)

**After completing ALL cards:**

```bash
# 1. Verify all changes committed
git status

# 2. Run smart_commit to ensure all changes are captured
./smart_commit.sh --feature "web-search-fix"

# 3. Push branch
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"

# 4. Create PR (MANDATORY - THIS IS NOT OPTIONAL)
gh pr create \
  --title "fix: WEB-SEARCH-INTERMITTENT - handle non-JSON stdout from gemini CLI" \
  --body "## Bug Fix: WEB-SEARCH-INTERMITTENT

**Severity:** P2
**Summary:** Web search intermittent failures

### Root Cause
**Location:** \`src/web-search/executor.ts:80-86\`

When gemini CLI failed, the shell script output plain error text. The executor tried to parse this as JSON and threw, resulting in a generic error message shown to users.

### Fix
Wrapped JSON.parse in try-catch block to handle non-JSON output:
- Returns structured error with actual gemini CLI output
- Validates required fields before success
- No more generic error messages

### Testing
- [x] Regression test added and passes
- [x] All existing tests pass
- [x] Reproduction script confirms fix
- [x] Type check passes
- [x] Lint passes
- [x] Build succeeds

---
🐛 Generated with SDD Bug Fix Flow"

# 5. Verify PR created
echo "PR URL: $(gh pr view --json url -q .url)"
```

### ⚠️ PR Requirements

- [ ] PR title starts with "fix:"
- [ ] PR body contains bug ID and summary
- [ ] PR has testing checklist
- [ ] All cards referenced in PR

### 🚨 FAILURE TO CREATE PR = INCOMPLETE IMPLEMENTATION

**DO NOT mark this implementation as complete until PR is created.**

## TDD Protocol

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TDD BUG FIX CYCLE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CARD 01: RED                                                           │
│  ├── Write failing test that exposes the bug                           │
│  ├── Run test - it MUST fail                                           │
│  ├── git add + ./smart_commit.sh --feature "web-search-fix"            │
│  └── Commit: "test: add failing test for WEB-SEARCH-INTERMITTENT"      │
│                                                                         │
│  CARD 02: GREEN                                                         │
│  ├── Write minimal code to make test pass                              │
│  ├── Run test - it MUST pass                                           │
│  ├── Run ALL tests - no regressions                                    │
│  └── git add + ./smart_commit.sh --feature "web-search-fix"            │
│                                                                         │
│  CARD 03: VERIFY                                                        │
│  ├── Run full verification checklist                                   │
│  ├── Run reproduction script - bug should NOT reproduce                │
│  ├── Create PR (see Git Flow Enforcement above)                       │
│  └── Commit: "chore: verification complete for WEB-SEARCH-INTERMITTENT"│
│                                                                         │
│  ON ERROR: Set card to "failed", add error message, STOP for help       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose | Agent Action |
|------|---------|--------------|
| [trello-cards/BOARD.md](./trello-cards/BOARD.md) | Card overview and pipeline | Read once at start |
| [trello-cards/state.json](./trello-cards/state.json) | Progress tracking | Read+write each card |
| [trello-cards/AGENT_PROTOCOL.md](./trello-cards/AGENT_PROTOCOL.md) | State update patterns | Reference when needed |
| [trello-cards/smart_commit.sh](./trello-cards/smart_commit.sh) | Smart commit tool | Use for all commits |
| [trello-cards/auto-commit-daemon.sh](./trello-cards/auto-commit-daemon.sh) | Auto-commit daemon | Start at beginning |
| [trello-cards/01-regression-test.md](./trello-cards/01-regression-test.md) | TDD RED | **Execute first** |
| [trello-cards/02-implement-fix.md](./trello-cards/02-implement-fix.md) | TDD GREEN | **Execute second** |
| [trello-cards/03-verify-fix.md](./trello-cards/03-verify-fix.md) | Verification | **Execute last** |

## Key Locations

| Item | Path |
|------|------|
| Bug Location | `src/web-search/executor.ts:80-86` |
| Test Location | `src/web-search/executor.test.ts` |
| Reproduction Script | `./reproduce-web-search-bug.sh` |

## Getting Started

```bash
# 1. Start auto-commit daemon (REQUIRED)
cd trello-cards
nohup ./auto-commit-daemon.sh --feature "web-search-fix" &

# 2. Read current state
cat state.json

# 3. Read board
cat BOARD.md
```

**First action:** Read [trello-cards/BOARD.md](./trello-cards/BOARD.md) to understand card sequence.

**Second action:** Read [trello-cards/state.json](./trello-cards/state.json) to find current card.

**Then:** Execute cards: 01 → 02 → 03

## Completion Criteria

- [ ] Auto-commit daemon started (REQUIRED)
- [ ] Card 01: Regression test written and FAILS
- [ ] Card 02: Fix applied, regression test PASSES
- [ ] Card 03: All verification passed
- [ ] state.json shows all cards "completed"
- [ ] Reproduction script shows bug NOT reproducible
- [ ] **PR created on GitHub (MANDATORY)**

## Success Definition

This bug fix is **SUCCESSFUL** when:

1. ✅ Auto-commit daemon ran throughout implementation
2. ✅ Regression test exists and passes
3. ✅ All existing tests pass
4. ✅ Reproduction script shows bug fixed
5. ✅ Type checking passes
6. ✅ Linting passes
7. ✅ Build succeeds
8. ✅ **PR created on GitHub**

## Documentation

| Doc | Purpose |
|-----|---------|
| [bug-report.md](./bug-report.md) | Bug details and evidence |
| [reproduction-case.md](./reproduction-case.md) | Steps to reproduce |
| [root-cause-analysis.md](./root-cause-analysis.md) | Root cause analysis |
| [fix-strategy.md](./fix-strategy.md) | Fix approach |

---

**NOW BEGIN.**

1. Start daemon: `cd trello-cards && nohup ./auto-commit-daemon.sh --feature "web-search-fix" &`
2. Read state: `cat trello-cards/state.json`
3. First card: [trello-cards/01-regression-test.md](./trello-cards/01-regression-test.md)
