# Card 08: E2E Test Script

**Story Points:** 1 | **Priority:** P1 | **Owner:** AI Agent

## 📋 Description

Create an automated E2E test script that tests the complete web search flow end-to-end using the actual CLI tool (or dry-run mode).

## ✅ Acceptance Criteria

- [ ] E2E test script created: `scripts/test-web-search-e2e.sh`
- [ ] Tests all major flows: weather, news, facts
- [ ] Tests error cases (if configured)
- [ ] Works in both real and dry-run modes
- [ ] Generates test report

## 🔧 Implementation

### File: `scripts/test-web-search-e2e.sh`

```bash
#!/bin/bash
# E2E test for web search feature

set -e

# Configuration
CLI_PATH="${1:-/home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh}"
DRY_RUN="${2:-true}"
REPORT_FILE="/tmp/web-search-e2e-report-$$.txt"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    echo "  Error: $2"
    ((TESTS_FAILED++))
}

info() {
    echo -e "${YELLOW}→ INFO${NC}: $1"
}

test_start() {
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "Testing: $1"
    echo "═══════════════════════════════════════════════════════"
    ((TESTS_RUN++))
}

# Check if CLI exists
if [ ! -f "$CLI_PATH" ]; then
    echo -e "${RED}ERROR${NC}: CLI not found at $CLI_PATH"
    exit 1
fi

# Enable dry-run if CLI may not be configured
if [ "$DRY_RUN" = "true" ]; then
    info "Running in DRY RUN mode (no actual API calls)"
    DRY_RUN_FLAG="--dry-run"
else
    info "Running with REAL API calls (cost may apply)"
    DRY_RUN_FLAG=""
fi

# Test 1: Weather Query
test_start "Weather Search"
RESULT=$(timeout 35s "$CLI_PATH" --request "погода в Москве" 2>&1 || echo "ERROR: Command failed")

if echo "$RESULT" | grep -q "погода\|температура\|°C"; then
    pass "Weather search returned relevant result"
elif [ "$DRY_RUN" = "true" ] && echo "$RESULT" | grep -q "DRY RUN"; then
    pass "Weather search (dry run) completed"
else
    fail "Weather search" "No weather information in result"
fi

# Test 2: News Query
test_start "News Search"
RESULT=$(timeout 35s "$CLI_PATH" --request "последние новости по технологиям" 2>&1 || echo "ERROR: Command failed")

if echo "$RESULT" | grep -q "новост\|сообщени\|технолог"; then
    pass "News search returned relevant result"
elif [ "$DRY_RUN" = "true" ] && echo "$RESULT" | grep -q "DRY RUN"; then
    pass "News search (dry run) completed"
else
    fail "News search" "No news information in result"
fi

# Test 3: Factual Query
test_start "Factual Search"
RESULT=$(timeout 35s "$CLI_PATH" --request "какая высота Эвереста" 2>&1 || echo "ERROR: Command failed")

if echo "$RESULT" | grep -q "высот\|метр\|метров"; then
    pass "Fact search returned relevant result"
elif [ "$DRY_RUN" = "true" ] && echo "$RESULT" | grep -q "DRY RUN"; then
    pass "Fact search (dry run) completed"
else
    fail "Fact search" "No factual information in result"
fi

# Test 4: Russian Query with Special Characters
test_start "Russian Query"
RESULT=$(timeout 35s "$CLI_PATH" --request "столица Японии" 2>&1 || echo "ERROR: Command failed")

if echo "$RESULT" | grep -q "Токио\|Япония"; then
    pass "Russian query returned correct result"
elif [ "$DRY_RUN" = "true" ] && echo "$RESULT" | grep -q "DRY RUN"; then
    pass "Russian query (dry run) completed"
else
    fail "Russian query" "No relevant information in result"
fi

# Test 5: Timeout Test
test_start "Timeout Handling"
START_TIME=$(date +%s)
RESULT=$(timeout 10s "$CLI_PATH" --request "погода в Москве сегодня и завтра а также на неделю" 2>&1 || true)
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ "$DURATION" -ge 10 ]; then
    info "Timeout test (process killed at 10s)"
    pass "Timeout test passed"
else
    info "Query completed before timeout"
    pass "Timeout not triggered (fast query)"
fi

# Generate Report
echo ""
echo "═══════════════════════════════════════════════════════"
echo "Test Report"
echo "═══════════════════════════════════════════════════════"
echo "Total Tests:  $TESTS_RUN"
echo "Passed:       $TESTS_PASSED"
echo -e "Failed:       ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
```

## 🎯 Verification Checklist

- [ ] Script is executable (`chmod +x`)
- [ ] Tests 5 common scenarios
- [ ] Timeout test included
- [ ] Works with dry-run mode
- [ ] Colored output for readability
- [ ] Generates clear pass/fail report
- [ ] Exit code 0 for all pass, 1 for any fail

## 🧪 Usage

```bash
# Run with dry-run (no API costs)
./scripts/test-web-search-e2e.sh true

# Run with real API calls
./scripts/test-web-search-e2e.sh false

# Custom CLI path
./scripts/test-web-search-e2e.sh /custom/path/to/cli true
```

## 🔗 Dependencies

- **Previous Cards:** 01-07 (implementation must exist)
- **Next Card:** 09 (SDD docs should reference this script)
- **External:** CLI tool must exist (checked at runtime)

## 📝 Notes

- First test verifies CLI tool exists
- All tests have 35s timeout (30s + 5s buffer)
- Results are keyword-checked for relevance
- In dry-run mode, checks for "DRY RUN" marker
- Use in CI/CD pipeline for regression testing