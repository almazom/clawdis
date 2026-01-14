# Card 14: E2E Testing

| Field | Value |
|-------|-------|
| **ID** | AGI-14 |
| **Story Points** | 4 |
| **Depends On** | 13 |
| **Sprint** | Phase 4 |

## User Story

> As a QA, I want to verify all components work together in an end-to-end test.

## Context

Read before starting:
- [manual-e2e-test.md](../manual-e2e-test.md) - Test scenarios
- All previous cards completed

## Instructions

### Step 1: Verify Tool Registration

```bash
# Check all tools are registered
pnpm type-check 2>&1 | grep -i "ask_gemini" || echo "✓ No type errors"

# Verify lint
pnpm lint 2>&1 | grep -i "ask_gemini" || echo "✓ No lint errors"
```

### Step 2: Test Basic Tool

```bash
# Test 1: Basic query
echo '{"prompt":"Hello","mindset":"arch"}' | test_tool ask_gemini_basic

# Expected: Response from AI with architecture mindset
```

### Step 3: Test Web Tool

```bash
# Test 2: Web search
echo '{"query":"What is Claude AI","enableWeb":true}' | test_tool ask_gemini_web

# Expected: Response with current information
```

### Step 4: Test PDF Tool (if PDF available)

```bash
# Test 3: PDF analysis
echo '{"file":"/docs/test.pdf","pages":"1-5","prompt":"Summarize"}' | test_tool ask_gemini_pdf

# Expected: Summary of PDF pages
```

### Step 5: Test Collection Tool

```bash
# Test 4: Collection analysis
echo '{"collection":"test_collection","prompt":"Analyze"}' | test_tool ask_gemini_collection

# Expected: Analysis from all sources in collection
```

### Step 6: Test Telegram UI

```bash
# Test 5: Telegram commands
# Send /collection list to bot
# Expected: Inline keyboard with collections

# Send /collection show test_collection
# Expected: Collection detail view
```

### Step 7: Run Manual E2E Tests

Execute all test cases from `manual-e2e-test.md`:

```bash
# TC-01: Basic Query Tool
# TC-02: Web Search Tool
# TC-03: Deep Dive Tool
# TC-04: PDF Analysis Tool
# TC-05: Collection Management
# TC-06: Collection Report
```

### Step 8: Update progress.md

```bash
# Render progress bar
cat > progress.md << 'EOF'
# Ask Gemini CLI Integration - Implementation Progress

> Last updated: $(date +%Y-%m-%d)
> Status: COMPLETE

## Progress Bar

[████████████████████████████████████████] 100% (14/14 cards)

## Card Status

| Card | Title | SP | Status |
|------|-------|---:|--------|
| 01 | ADR Documentation | 2 | ✅ completed |
| 02 | Ask Gemini Basic Tool | 2 | ✅ completed |
| 03 | Ask Gemini Web Tool | 2 | ✅ completed |
| 04 | Ask Gemini Deep Dive Tool | 3 | ✅ completed |
| 05 | Ask Gemini PDF Tool | 3 | ✅ completed |
| 06 | Ask Gemini Collection Tool | 3 | ✅ completed |
| 07 | Telegram Collection Keyboard | 3 | ✅ completed |
| 08 | Telegram Collection Menu | 2 | ✅ completed |
| 09 | Telegram Collection Detail | 2 | ✅ completed |
| 10 | Telegram Collection Create | 2 | ✅ completed |
| 11 | Telegram Collection Report | 2 | ✅ completed |
| 12 | Telegram Collection Callback | 2 | ✅ completed |
| 13 | SKILL.md Files | 2 | ✅ completed |
| 14 | E2E Testing | 4 | ✅ completed |

## Summary

- **Total Cards:** 14
- **Completed:** 14
- **Story Points:** 34/34
- **Status:** READY FOR PRODUCTION
```

## Acceptance Criteria

- [ ] All 7 manual test cases pass
- [ ] Type checking passes
- [ ] Lint passes
- [ ] progress.md updated to 100%
- [ ] state.json shows all cards completed
- [ ] No errors in execution log

## Final Steps

After completing this card:

1. **Verify all cards complete:**
   ```bash
   cat state.json | jq '.overall_status'  # Should be "COMPLETE"
   ```

2. **Create Pull Request:**
   ```bash
   git status
   ./smart_commit.sh --feature "ask-gemini-integration"
   git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
   gh pr create --title "feat: Ask Gemini CLI Integration" --body "Complete implementation..."
   ```

3. **Celebrate!** 🎉

---

## ⚠️ PR Creation is MANDATORY

DO NOT mark complete without creating a Pull Request.
See KICKOFF.md for full git flow instructions.
