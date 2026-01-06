# SDD Bug Fix Flow - Planning Phase

> 📋 **PLANNING DOCUMENT**: This helps you plan bug fixes. For execution, see generated `00_EXECUTE_HERE.md`.

## ⚡ Quick Start (30 seconds)

```bash
# 1. Verify setup
./verify-prereqs.sh

# 2. Get bug report from user
#    Required: summary, steps, error, severity

# 3. Generate bug fix package
./generate-bug-fix.sh --bug-report bug-report.md --validate

# 4. Start execution
cd docs/sdd/bug-fix-$(date +%Y-%m-%d)-001/trello-cards
cat 00_EXECUTE_HERE.md
```

## Core Principle

```
┌─────────────────────────────────────────────────────────┐
│  NO FIX WITHOUT PROOF. EVIDENCE IS EVERYTHING.          │
│                                                         │
│  • Cannot fix what you cannot reproduce                 │
│  • Cannot verify without a failing test                 │
│  • Root cause or no fix                                 │
│  • Minimal change = minimal risk                        │
└─────────────────────────────────────────────────────────┘
```

## Mission

Transform bug reports into verified fixes with regression tests and executable Trello cards.

## 📋 What This Flow Does

**5 Planning Phases → 3 Execution Cards**

### Planning (You are here)
1. **Bug Report** - Collect structured details
2. **Reproduction** - Create ARC script (must be >70% reproducible)
3. **Root Cause** - Find exact location (file:line, ≥90% confidence)
4. **Fix Strategy** - Plan minimal fix + regression test
5. **Output** - Generate executable cards

### Execution (Generated Package)
1. **RED** - Write failing test
2. **GREEN** - Implement fix (minimal change)
3. **VERIFY** - Full test suite + create PR

### Planning Phase Details

### Phase 2: Reproduction (FLOW/02_REPRODUCE.md)
**⚠️ CRITICAL: Do NOT proceed without verified reproduction**

- Follow steps exactly
- Create ARC script (automated reproduction)
- Verify >70% reproduction rate
- Document environment sensitivity

### Phase 3: Root Cause Analysis (FLOW/03_ROOT_CAUSE.md)  
**⚠️ CRITICAL: Do NOT proceed without identified root cause**

- Layer-by-layer investigation
- Find exact location: `file.ts:line`
- Achieve ≥90% confidence
- Document evidence

### Phase 4: Fix Strategy (FLOW/04_FIX_STRATEGY.md)

- Plan minimal fix approach
- Design regression test (TDD RED)
- Identify affected areas
- Define verification criteria

### Phase 5: Output (FLOW/05_OUTPUT.md)

**Generate package via:**
```bash
./generate-bug-fix.sh --bug-report bug-report.md --validate
```

**Package structure:**
```
docs/sdd/<bug-id>/
├── 00_EXECUTE_HERE.md        # ⭐ ENTRY POINT for agent
├── bug-report.md
├── reproduction-case.md
├── root-cause-analysis.md
├── fix-strategy.md
└── trello-cards/
    ├── BOARD.md
    ├── state.json
    ├── smart_commit.sh       # Copied locally
    ├── auto-commit-daemon.sh # Copied locally
    ├── AGENT_PROTOCOL.md
    ├── 01-regression-test.md
    ├── 02-implement-fix.md
    └── 03-verify-fix.md
```

**✅ After generation, agent starts at: `00_EXECUTE_HERE.md` in the package directory**

## Card Count (Agent Decides)

Bug fixes are focused. Calculate based on:

| Factor | Cards |
|--------|-------|
| Simple one-file fix | 2-3 |
| Multi-file fix | 3-5 |
| Integration involved | 4-6 |
| Data migration needed | 5-7 |

**Maximum: 7 cards. If >7, split into multiple bugs.**

## TDD Cycle (Mandatory)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  CARD 01: RED    - Write failing test (exposes bug)    │
│            ↓                                            │
│  CARD 02: GREEN  - Implement minimal fix               │
│            ↓                                            │
│  CARD 03: VERIFY - Full verification + cleanup         │
│                                                         │
│  The failing test becomes permanent regression guard!  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Templates

| Type | Location |
|------|----------|
| Bug fix docs | `TEMPLATES/*.template.md` |
| Trello cards | `TRELLO_TEMPLATES/*.template.md` |

## Rules

1. **ARC mandatory** - No fix without reproduction
2. **Root cause required** - No blind fixes
3. **Test BEFORE fix** - TDD RED first
4. **Minimal change** - Fix only what's broken
5. **Max 7 cards** - Bug fixes are focused
6. **Evidence based** - All conclusions need proof

## 🚀 Start Planning

```bash
# Step 0: Verify your environment (10 seconds)
./verify-prereqs.sh

# Step 1: Get bug report from user
#    Save as: bug-report.md
#    Required fields:
#    - Summary (one line)
#    - Expected vs Actual
#    - Numbered reproduction steps
#    - Exact error output
#    - Severity (P0-P3)

# Step 2: Execute planning phases
#    - Read FLOW/01_BUG_REPORT.md
#    - Read FLOW/02_REPRODUCE.md
#    - Read FLOW/03_ROOT_CAUSE.md
#    - Read FLOW/04_FIX_STRATEGY.md

# Step 3: Generate execution package
./generate-bug-fix.sh --bug-report bug-report.md --validate

# Step 4: Begin execution
cd docs/sdd/bug-fix-*/trello-cards
cat 00_EXECUTE_HERE.md
```

## 💡 Next Steps After Planning

Once you generate the package, the **execution phase** begins. All execution instructions are in the generated `00_EXECUTE_HERE.md` file.

**Need help?** Run `./check-status.sh` from the flow root directory.
