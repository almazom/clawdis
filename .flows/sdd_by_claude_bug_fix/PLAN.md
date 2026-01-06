# AI Agent Smoothness Plan: SDD Bug Fix Flow

**Status**: Implementation Plan (Analysis Phase)  
**Goal**: Transform bug fix flow from 4/10 → 9/10 smoothness score  
**Approach**: Adapt proven smoothness patterns from codex flow without modifying it

---

## Current State Analysis

### Flow Smoothness Score: 4/10

**Critical Blockers:**
- ❌ Two competing entry points (START.md vs KICKOFF.md)
- ❌ Missing generation command in START.md
- ❌ Broken paths (scripts not in generated packages)
- ❌ No prerequisite validation
- ❌ Brittle state management
- ❌ Zero error recovery paths

**Agent Experience:**
- Agent reads START.md → tries to execute → fails at step 4 (no generate command)
- Agent discovers generate-bug-fix.sh → generates package → tries to start daemon → fails (wrong path)
- Agent tries to update state.json → jq error → state corrupted → flow stalls

**Success Rate:** ~30% autonomous completion

---

## Smoothness Principles from Codex Flow (Inspiration)

### What Makes Codex Flow Smooth (9/10 score):

1. **Single Entry Point** → `START.md` → `./generate-sdd.sh` → KICKOFF.md
2. **Clear Prerequisites** → Listed in help, validated before start
3. **Quality Gates** → `--validate` flag with scoring (0-20, needs 17+)
4. **Resume Capability** → `--resume` flag for failures
5. **Auto-Assessment** → `--auto-assess` for complexity
6. **Git Workflow** → `--git-workflow` flag for clean state
7. **Robust Scripts** → `set -e`, stderr logging, argument validation
8. **Forceful Git Flow** → KICKOFF.md says "MANDATORY" in bold
9. **Better Help** → Examples, prerequisites, exit codes
10. **Status Checking** → `check_workflow_status.sh` equivalent

---

## Implementation Plan: Non-Stop Agent Experience

### Phase 1: Fix Entry Point Confusion (Priority: CRITICAL)

**Goal**: One clear path: START.md → generate → KICKOFF.md

**Changes:**

1. **Rewrite START.md** → Focus on planning ONLY
   ```markdown
   ## Mission (Bug Fix Planning)
   This document helps you PLAN bug fixes. For EXECUTION, use generated KICKOFF.md.
   
   ## Planning Steps
   1. Get bug report
   2. Run: `./generate-bug-fix.sh --bug-report <file> --validate`
   3. Agent starts at: `docs/sdd/<bug-id>/trello-cards/KICKOFF.md`
   ```

2. **Rename generated KICKOFF.md** → `00_EXECUTE_HERE.md` to avoid confusion
   - Clear numbering: "00" = start here
   - Removes "two kickoffs" problem

3. **Delete lines 96-99 from START.md** → Don't document KICKOFF.md requirements there

**Smoothness Impact**: HIGH - Removes #1 source of confusion

---

### Phase 2: Add Validation & Prerequisites (Priority: CRITICAL)

**Goal**: Catch missing tools before flow starts

**New Script**: `verify-prereqs.sh`
```bash
#!/bin/bash
# Check all prerequisites before flow starts

ERRORS=0

# Check tools
echo "🔧 Checking tools..."
command -v jq >/dev/null || { echo "❌ jq not installed"; ERRORS=$((ERRORS+1)); }
command -v gh >/dev/null || { echo "❌ gh CLI not installed"; ERRORS=$((ERRORS+1)); }
command -v git >/dev/null || { echo "❌ git not installed"; ERRORS=$((ERRORS+1)); }

# Check templates
echo "📋 Checking templates..."
[ -f "TEMPLATES/bug-report.template.md" ] || { echo "❌ Bug report template missing"; ERRORS=$((ERRORS+1)); }
[ -f "TRELLO_TEMPLATES/card-01-regression-test.template.md" ] || { echo "❌ Card template missing"; ERRORS=$((ERRORS+1)); }

# Check scripts executable
echo "🔍 Checking scripts..."
[ -x "generate-bug-fix.sh" ] || { echo "❌ generate-bug-fix.sh not executable"; ERRORS=$((ERRORS+1)); }
[ -x "smart_commit.sh" ] || { echo "❌ smart_commit.sh not executable"; ERRORS=$((ERRORS+1)); }

if [ $ERRORS -eq 0 ]; then
    echo "✅ All prerequisites met"
    exit 0
else
    echo "❌ Found $ERRORS prerequisite errors. Fix before proceeding."
    exit 1
fi
```

**Integration Points:**
- Add `--validate` flag to `generate-bug-fix.sh` (runs verify-prereqs.sh + quality gates)
- Update START.md: "Step 0: Run `./verify-prereqs.sh`"
- Add help text showing prerequisites

**Smoothness Impact**: HIGH - Prevents mid-flow failures

---

### Phase 3: Fix Path & Script Distribution (Priority: CRITICAL)

**Goal**: Scripts work from generated packages without path issues

**Option A (Recommended): Copy Scripts to Packages**

Modify `generate-bug-fix.sh` to copy scripts:
```bash
# In generate-bug-fix.sh, after creating trello-cards/
cp "$SCRIPT_DIR/smart_commit.sh" "$OUTPUT_DIR/trello-cards/"
cp "$SCRIPT_DIR/auto-commit-daemon.sh" "$OUTPUT_DIR/trello-cards/"
cp "$SCRIPT_DIR/AGENT_PROTOCOL.md" "$OUTPUT_DIR/trello-cards/"
chmod +x "$OUTPUT_DIR/trello-cards/"*.sh
```

Benefits:
- Scripts are local → no path issues
- Each package is self-contained
- Can modify scripts per package if needed

**Option B (Alternative): Use Absolute Paths**

Modify templates to use absolute paths:
```bash
# In KICKOFF.template.md
REPO_ROOT=$(git rev-parse --show-toplevel)
nohup "$REPO_ROOT/.flows/sdd_by_claude_bug_fix/auto-commit-daemon.sh" --feature "{BUG_ID}" &
```

Benefits:
- Single source of truth for scripts
- Smaller package size

**Decision**: Option A is better for agent experience (self-contained = less failure modes)

**Smoothness Impact**: CRITICAL - Fixes broken daemon commands

---

### Phase 4: Robust State Management (Priority: HIGH)

**Goal**: Eliminate brittle jq one-liners

**New Script**: `update-state.sh`
```bash
#!/bin/bash
# Safe state.json update with validation

STATE_FILE="state.json"
CARD_ID="$1"
STATUS="$2"

# Validate inputs
if [ -z "$CARD_ID" ] || [ -z "$STATUS" ]; then
    echo "Usage: update-state.sh <card-id> <status>"
    exit 1
fi

# Create backup
cp "$STATE_FILE" "${STATE_FILE}.backup"

# Update with temp file
jq --arg card "$CARD_ID" --arg status "$STATUS" \
   '.cards[$card].status = $status | .cards[$card].completed_at = now | .current_card = ($card|tonumber+1|tostring)' \
   "$STATE_FILE" > "${STATE_FILE}.tmp"

# Validate JSON
if jq empty "${STATE_FILE}.tmp" 2>/dev/null; then
    mv "${STATE_FILE}.tmp" "$STATE_FILE"
    echo "✅ Updated state.json: card $CARD_ID = $STATUS"
else
    echo "❌ State update failed - JSON invalid"
    mv "${STATE_FILE}.backup" "$STATE_FILE"
    exit 1
fi
```

**Update All Card Templates:**
Replace jq one-liners with:
```bash
# BEFORE
jq '.cards."02".status = "completed" | .cards."02".completed_at = "'$(date -Iseconds)'" | .tdd_phase = "VERIFY" | .current_card = "03"' state.json > state.json.tmp && mv state.json.tmp state.json

# AFTER
./update-state.sh 02 completed
```

**Add State Validation:**
```bash
# In validate-sdd.sh (quality gate)
log_info "Validating state.json..."
jq '.cards | keys[] as $k | select(.[$k].status == "completed") | $k' state.json | wc -l
# Must have at least 3 completed cards for bug fix
```

**Smoothness Impact**: HIGH - Eliminates #2 source of failures

---

### Phase 5: Add Quality Gates (Priority: HIGH)

**Goal**: Catch problems early with validation

**Enhance `validate-sdd.sh`** (adapt from codex flow):
```bash
#!/bin/bash
# Quality gates for bug fix SDD

MAX_SCORE=20
QUALITY_THRESHOLD=18  # 90% for bug fixes
SCORE=0
ERRORS=()

# Check 1: All required files exist
for file in bug-report.md reproduction-case.md root-cause-analysis.md fix-strategy.md; do
    [ -f "$file" ] && SCORE=$((SCORE+2)) || ERRORS+=("Missing $file")
done

# Check 2: Reproduction rate >= 70%
if grep -q "Reproduction rate: [7-9][0-9]%\|100%" reproduction-case.md; then
    SCORE=$((SCORE+3))
else
    ERRORS+=("Reproduction rate < 70%")
fi

# Check 3: Root cause has file:line
if grep -qE '^Location: \S+:\d+$' root-cause-analysis.md; then
    SCORE=$((SCORE+3))
else
    ERRORS+=("Root cause missing file:line")
fi

# Check 4: Fix strategy mentions regression test
if grep -iq "regression test" fix-strategy.md; then
    SCORE=$((SCORE+2))
else
    ERRORS+=("Fix strategy missing regression test")
fi

# Check 5: Cards exist and follow numbering
CARD_COUNT=$(ls trello-cards/0*.md 2>/dev/null | wc -l)
if [ "$CARD_COUNT" -ge 3 ] && [ "$CARD_COUNT" -le 7 ]; then
    SCORE=$((SCORE+2))
else
    ERRORS+=("Invalid card count: $CARD_COUNT")
fi

# Check 6: state.json valid
if jq empty trello-cards/state.json 2>/dev/null; then
    SCORE=$((SCORE+2))
else
    ERRORS+=("state.json invalid JSON")
fi

# Final score
echo "Quality Score: $SCORE/$MAX_SCORE"
if [ $SCORE -ge $QUALITY_THRESHOLD ]; then
    echo "✅ PASSED - Ready for implementation"
    exit 0
else
    echo "❌ FAILED - Quality too low"
    printf '%s\n' "${ERRORS[@]}"
    exit 1
fi
```

**Integration:**
- Add `--validate` flag to `generate-bug-fix.sh`
- Run automatically before card generation
- Block card creation if quality < 90%

**Smoothness Impact**: MEDIUM - Prevents bad SDDs from being used

---

### Phase 6: Resume & Recovery (Priority: MEDIUM)

**Goal**: Handle failures gracefully

**Add to `generate-bug-fix.sh`:**
```bash
--resume)  # New flag
    RESUME=true
    shift
    ;;
```

**Resume Logic:**
```bash
if [ "$RESUME" = true ]; then
    # Find last generated bug-fix directory
    LAST_BUG=$(ls -dt docs/sdd/bug-fix-* 2>/dev/null | head -1)
    if [ -n "$LAST_BUG" ]; then
        echo "Resuming from: $LAST_BUG"
        cd "$LAST_BUG/trello-cards"
        # Check last completed card
        LAST_CARD=$(jq -r '.cards | to_entries | max_by(.key|tonumber) | .key' state.json)
        echo "Last completed card: $LAST_CARD"
        echo "Next action: Continue with card $((LAST_CARD+1))"
    fi
    exit 0
fi
```

**Agent Recovery Steps:**
```bash
# If agent crashes or gets stuck:
1. cd docs/sdd/bug-fix-<id>/trello-cards
2. Check state.json: cat state.json | jq .
3. Run: ../../verify-flow.sh  # New script to check what's missing
4. Continue with next card
```

**Smoothness Impact**: MEDIUM - Reduces rework after failures

---

### Phase 7: Enhanced Git Flow (Priority: MEDIUM)

**Goal**: Force PR creation, inform about CI status

**New Script**: `create-pr.sh`
```bash
#!/bin/bash
# Smart PR creation for bug fixes

BUG_ID="$1"
if [ -z "$BUG_ID" ]; then
    echo "Usage: create-pr.sh <bug-id>"
    exit 1
fi

# Check if PR exists
if gh pr view --json number >/dev/null 2>&1; then
    PR_NUM=$(gh pr view --json number -q .number)
    echo "⚠️  PR #$PR_NUM already exists"
    gh pr view --json url -q .url
    exit 0
fi

# Check CI status before creating
echo "🧪 Checking test status..."
if pnpm test 2>/dev/null; then
    TEST_STATUS="✅ All tests passing"
else
    TEST_STATUS="❌ Some tests failing"
    read -p "Continue with PR creation? [y/N]: " -n 1 -r
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# Create PR
echo "📤 Creating PR..."
gh pr create \
    --title "fix: $BUG_ID - $(cat ../bug-report.md | grep '^Summary:' | cut -d' ' -f2-)" \
    --body-file ../fix-strategy.md \
    --label "bug-fix"

echo "✅ PR created"

# Watch CI
gh pr checks --watch
```

**Update KICKOFF.md Template:**
```markdown
## 🎯 Final PR Creation (MANDATORY)

After completing ALL cards, run:

```bash
# Create PR and watch CI
./create-pr.sh "{BUG_ID}"
```

**WARNING**: FAILURE TO CREATE PR = INCOMPLETE IMPLEMENTATION
```

**Smoothness Impact**: MEDIUM - Ensures PR gets created

---

### Phase 8: Add Status Checking (Priority: LOW-MEDIUM)

**Goal**: Agent can check flow status anytime

**New Script**: `check-status.sh` (in flow root)
```bash
#!/bin/bash
# Check status of bug fix workflow

echo "=== Bug Fix Flow Status ==="

# Check prerequisites
echo -e "\n🔧 Prerequisites:"
./verify-prereqs.sh >/dev/null 2>&1 && echo "✅ All met" || echo "❌ Some missing"

# Git status
echo -e "\n📂 Repository:"
git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "❌ Not in git repo"

# Find recent bug fixes
echo -e "\n🐛 Recent Bug Fixes:"
ls -dt docs/sdd/bug-fix-* 2>/dev/null | head -3 | while read dir; do
    BUG_ID=$(basename "$dir")
    echo "  - $BUG_ID"
    if [ -f "$dir/trello-cards/state.json" ]; then
        PROGRESS=$(jq '[.cards[] | select(.status=="completed")] | length' "$dir/trello-cards/state.json")
        TOTAL=$(jq '.cards | length' "$dir/trello-cards/state.json")
        echo "    Progress: $PROGRESS/$TOTAL cards"
    fi
done

echo -e "\n💡 Next Steps:"
echo "  - To start new bug fix: ./generate-bug-fix.sh --bug-report <file>"
echo "  - To resume: ./generate-bug-fix.sh --resume"
echo "  - To check specific bug: cd docs/sdd/bug-fix-<id>/trello-cards && cat state.json"
```

**Smoothness Impact**: LOW - Nice to have, not critical

---

### Phase 9: Documentation Overhaul (Priority: HIGH)

**Goal**: Clear, actionable instructions at every step

**START.md Rewrites:**

```markdown
# START.md

## ⚡ Quick Start (30 seconds)

```bash
# 1. Verify setup (takes 10s)
./verify-prereqs.sh

# 2. Get bug report file from user
#    Should contain: summary, steps, error, severity

# 3. Generate bug fix package (takes 2-5 min)
./generate-bug-fix.sh --bug-report bug-report.md --validate

# 4. Agent starts here
cd docs/sdd/bug-fix-$(date +%Y-%m-%d)-001/trello-cards
# Then read: 00_EXECUTE_HERE.md
```

## 📋 What This Flow Does

Transforms bug reports → verified fixes + regression tests

**5 Planning Phases:**
1. Bug Report (collect details)
2. Reproduction (create ARC script)
3. Root Cause (find file:line)
4. Fix Strategy (plan + test)
5. Output (generate cards)

**3 Execution Cards:**
1. RED: Write failing regression test
2. GREEN: Implement minimal fix
3. VERIFY: Full test + create PR

## 🎯 Principles

- ❌ NO FIX WITHOUT PROOF
- ❌ NO PROCEED WITHOUT REPRODUCTION
- ✅ MINIMAL CHANGE = MINIMAL RISK
```

**KICKOFF.md (00_EXECUTE_HERE.md) Rewrites:**
```markdown
# 00_EXECUTE_HERE.md

> 🚀 **EXECUTE THESE CARDS IN ORDER. DO NOT SKIP.**
> 
> **Current State**: Check `state.json` → Start with first pending card

## ⚡ Pre-Flight Checklist

```bash
# ✅ All required - if any fail, STOP and fix
./verify-prereqs.sh          # Tools installed?
git status                    # Clean work tree?
cat state.json | jq .        # Valid state.json?
```

## 🎮 How to Execute Cards

### Option A: Auto Mode (Recommended)
```bash
# Start daemon before Card 01
./auto-commit-daemon.sh --feature "BUG-2026-01-06-001" &

# Execute cards sequentially
cat 01-regression-test.md     # Read card
cat state.json                # Check current
# ... do work ...
./update-state.sh 01 completed # Mark done
cat 02-implement-fix.md       # Next card
```

### Option B: Manual Mode
```bash
# Skip daemon, commit manually
./smart_commit.sh --feature "BUG-2026-01-06-001"
```

## 🏁 Card Sequence

| # | Name | Goal | Time |
|---|------|------|------|
| 01 | Regression Test | Write failing test | 15-30 min |
| 02 | Implement Fix | Make test pass | 15-45 min |
| 03 | Verify & PR | Full test suite + PR | 10-20 min |

**Total: 40-95 minutes**
```

**Smoothness Impact**: HIGH - Clear, actionable steps

---

### Phase 10: Test the Flow (Priority: CRITICAL)

**Goal**: Verify all changes work end-to-end

**Test Script**: `test-flow.sh`
```bash
#!/bin/bash
# Integration test for bug fix flow

echo "🧪 Testing Bug Fix Flow..."

# Test 1: Prerequisites
echo "Test 1: Prerequisites..."
./verify-prereqs.sh
TEST1=$?

# Test 2: Generate from sample
if [ $TEST1 -eq 0 ]; then
    echo "Test 2: Generation..."
    cat > /tmp/test-bug.md << 'EOF'
# Bug Report

## Summary
Login fails with null pointer

## Expected
User sees dashboard

## Actual
Error: Cannot read property 'id' of null

## Steps
1. Start app
2. Click login
3. Error appears

## Environment
Node 18, Ubuntu 22.04

## Severity
P1-High
EOF
    
    ./generate-bug-fix.sh --bug-report /tmp/test-bug.md --dry-run
    TEST2=$?
fi

# Test 3: Daemon path
echo "Test 3: Daemon functionality..."
cd /tmp
TEST_DAEMON_DIR="bug-fix-TEST-001/trello-cards"
mkdir -p "$TEST_DAEMON_DIR"
cp ../auto-commit-daemon.sh "$TEST_DAEMON_DIR/"
cd "$TEST_DAEMON_DIR"
./auto-commit-daemon.sh --feature test --dry-run
TEST3=$?

# Results
if [ $TEST1 -eq 0 ] && [ $TEST2 -eq 0 ] && [ $TEST3 -eq 0 ]; then
    echo "✅ All tests passed - Flow is smooth"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
```

**Run before committing changes:**
```bash
./test-flow.sh
```

**Smoothness Impact**: CRITICAL - Ensures changes actually work

---

## Expected Results: After Implementation

### Smoothness Score: 9/10

| Aspect | Before | After |
|--------|--------|-------|
| Entry Clarity | 3/10 | 9/10 |
| Command Completeness | 4/10 | 10/10 |
| Error Handling | 2/10 | 8/10 |
| Prerequisites | 3/10 | 9/10 |
| Documentation | 5/10 | 9/10 |
| Tool Integration | 6/10 | 9/10 |
| **Overall** | **4/10** | **9/10** |

### Agent Experience: Before vs After

**BEFORE:**
```
1. Read START.md ✓
2. Understand phases ✓
3. Try to "generate package" → ❌ NO COMMAND GIVEN
4. Search filesystem → discover generate-bug-fix.sh
5. Run generate script → ✓
6. cd to trello-cards → ✓
7. Start daemon → ❌ COMMAND NOT FOUND
8. Edit state.json → ❌ JQ ERROR CORRUPTS FILE
9. Flow stalls → ASK USER FOR HELP
```
**Success Rate: 30%**

**AFTER:**
```
1. Read START.md ✓
2. Run: ./verify-prereqs.sh → ✓
3. Run: ./generate-bug-fix.sh --bug-report file.md --validate → ✓
4. cd docs/sdd/bug-fix-001/trello-cards → ✓
5. Run: ./auto-commit-daemon.sh --feature BUG-001 & → ✓
6. Execute Card 01 → ✓
7. Run: ./update-state.sh 01 completed → ✓
8. Execute Card 02 → ✓
9. Run: ./update-state.sh 02 completed → ✓
10. Execute Card 03 → ✓
11. Run: ./create-pr.sh BUG-001 → ✓
```
**Success Rate: 95%**

### Non-Stop Experience Checklist

Agent can complete flow without:
- [ ] Asking user for clarification
- [ ] Searching filesystem for missing commands
- [ ] Debugging broken paths
- [ ] Fixing corrupted state.json
- [ ] Figuring out what to do next
- [ ] Guessing PR creation steps

All steps are:
- [ ] Explicitly documented
- [ ] Validated before execution
- [ ] Error-handled with clear messages
- [ ] Recoverable via --resume

---

## Files to Create/Modify

### New Files (6)
1. `verify-prereqs.sh` - Prerequisite validation
2. `update-state.sh` - Safe state updates
3. `create-pr.sh` - Smart PR creation
4. `check-status.sh` - Status overview
5. `test-flow.sh` - Integration tests
6. `00_EXECUTE_HERE.md` (template) - Clear execution entry

### Modified Files (8)
1. `START.md` - Simplify to planning only
2. `generate-bug-fix.sh` - Add --validate, --resume, copy-scripts
3. `smart_commit.sh` - Add gh CLI integration
4. `auto-commit-daemon.sh` - Fix paths, add editor detection
5. `validate-sdd.sh` - Add quality gates
6. `TRELLO_TEMPLATES/KICKOFF.template.md` - Forceful git flow
7. `TRELLO_TEMPLATES/card-*.template.md` - Use update-state.sh
8. `FLOW/*.md` - Add explicit commands

### Deleted Files (0)
- Keep all existing files for backward compatibility

---

## Implementation Order

**Week 1: Critical Fixes**
1. Phase 1: Fix entry point (START.md + KICKOFF rename)
2. Phase 3: Fix paths (copy scripts to packages)
3. Phase 2: Add verify-prereqs.sh
4. Phase 10: Test flow end-to-end

**Week 2: Robustness**
5. Phase 4: Add update-state.sh
6. Phase 5: Enhance validate-sdd.sh
7. Phase 6: Add --resume to generate script

**Week 3: Polish**
8. Phase 7: Add create-pr.sh
9. Phase 8: Add check-status.sh
10. Phase 9: Documentation overhaul

---

## Success Metrics

**Quantitative:**
- Agent autonomous completion rate: 30% → 95%
- Average time to first card: 15 min → 2 min
- User clarification requests: 5+ per bug → 0 per bug
- Flow-related errors: 10+ per bug → <1 per bug

**Qualitative:**
- Agent confidence: Low → High
- User trust: Medium → Very High
- Flow reliability: Unreliable → Rock-solid

---

## Risks & Mitigations

**Risk 1: Breaking existing flows**
- Mitigation: Keep backward compatibility, no file deletions
- Test with sample bug reports before merging

**Risk 2: Agent confusion during transition**
- Mitigation: Clear messages in START.md about new process
- Keep old commands working (deprecated warnings)

**Risk 3: Over-engineering**
- Mitigation: Each phase has clear smoothness goal
- Measure success rate before/after each phase
- Cut scope if metrics don't improve

---

## Conclusion

This plan adapts proven smoothness patterns from the codex flow to the bug fix flow:

- ✅ Single entry point + clear progression
- ✅ Validation before execution
- ✅ Robust error handling
- ✅ Recovery mechanisms
- ✅ Quality gates
- ✅ Clear documentation

**Result**: AI agent can execute bug fix flow from start to finish without stopping, asking for help, or encountering unrecoverable errors.

**Timeline**: 3 weeks  
**Effort**: ~40 hours  
**Impact**: Transforms flow from 4/10 → 9/10 smoothness
