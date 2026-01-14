# 🧪 Card 03: Test Current Implementation

**Priority:** 🟡 Important  | **Type:** Testing  | **Est. Time:** 25 minutes

**Card Goal:** Run the current CLI to understand its behavior before making changes.

---

## 📋 Checklist

- [ ] Create test markdown files
- [ ] Run current CLI with various flags
- [ ] Observe behavior and output format
- [ ] Document current success/failure modes
- [ ] Identify test cases for E2E testing

---

## 🎯 Tasks

### 1. Create Test Environment

```bash
mkdir -p /tmp/publish-retry-tests
cd /tmp/publish-retry-tests

# Create simple markdown file
cat > test-simple.md << 'EOF'
# Simple Test

This is a simple markdown file.

## Section 1
- Item 1
- Item 2

## Section 2
Just some text.

EOF

# Create complex markdown file with HTML
cat > test-complex.md << 'EOF'
# Complex Test

<div class="container">
  <h2>HTML Section</h2>
  <p>This has <strong>nested HTML</strong> content.</p>
  <ul>
    <li>item 1</li>
    <li>item 2</li>
  </ul>
</div>

## Regular Markdown Section

More content here.

EOF

# Create large file (simulate deep research report)
for i in {1..50}; do
    cat >> test-large.md << EOF

## Section $i
Content for section $i.
- Point A
- Point B
- Point C

### Subsection $i.1
Detailed information here.

### Subsection $i.2
More details.

EOF
done

ls -lh test-*.md
```

**Expected Output:** 3 files created, various sizes

### 2. Test Current CLI Without Preprocessing

```bash
cd /home/almaz/TOOLS/publish_to_web

# Test with simple file (no flags)
echo "=== Test 1: Simple file, no flags ==="
./md_2_web.sh /tmp/publish-retry-tests/test-simple.md 2>&1 | tee /tmp/test1-output.txt

# Extract result
echo "Exit code: $?"
echo ""
echo "Output preview:"
head -10 /tmp/test1-output.txt | python3 -m json.tool 2>/dev/null || cat /tmp/test1-output.txt
```

**Document Results:**
- Exit code: _______
- Success: _______ (yes/no)
- Provider used: _______
- URL returned: _______
- Time taken: _______

### 3. Test Current CLI With --provider flag

```bash
# Test with explicit provider selection
echo "=== Test 2: Simple file, --provider telegraph ==="
./md_2_web.sh --provider telegraph /tmp/publish-retry-tests/test-simple.md 2>&1 | tee /tmp/test2-output.txt
echo "Exit code: $?"

echo ""
echo "=== Test 3: Simple file, --provider simplenote ==="
./md_2_web.sh --provider simplenote /tmp/publish-retry-tests/test-simple.md 2>&1 | tee /tmp/test3-output.txt
echo "Exit code: $?"
```

**Document Results:**
- Test 2: Telegraph only - Exit code: _______, Success: _______
- Test 3: Simplenote only - Exit code: _______, Success: _______

### 4. Test Current CLI With --preprocess flag

```bash
# Test preprocessing modes
echo "=== Test 4: Complex file, --preprocess standard ==="
./md_2_web.sh --preprocess standard /tmp/publish-retry-tests/test-complex.md 2>&1 | tee /tmp/test4-output.txt
echo "Exit code: $?"

echo ""
echo "=== Test 5: Complex file, --preprocess aggressive ==="
./md_2_web.sh --preprocess aggressive /tmp/publish-retry-tests/test-complex.md 2>&1 | tee /tmp/test5-output.txt
echo "Exit code: $?"
```

**Document Results:**
- Test 4 (standard): _______ (success/failure)
- Test 5 (aggressive): _______ (success/failure)
- Difference observed: ___________________

### 5. Test Large File (Simulates Deep Research)

```bash
# Test large file (this might fail, which is expected)
echo "=== Test 6: Large file, no preprocessing ==="
./md_2_web.sh /tmp/publish-retry-tests/test-large.md 2>&1 | tee /tmp/test6-output.txt
echo "Exit code: $?"

echo ""
echo "=== Test 7: Large file, --preprocess aggressive ==="
./md_2_web.sh --preprocess aggressive /tmp/publish-retry-tests/test-large.md 2>&1 | tee /tmp/test7-output.txt
echo "Exit code: $?"
```

**Document Results:**
- Test 6 (no preprocessing): _______
- Test 7 (aggressive): _______
- Observed failure modes: ___________________

### 6. Analyze Output Format

```bash
# Study the JSON output format
echo "=== Output Format Analysis ==="

# Parse a successful response (if you have one)
if [[ -f /tmp/test1-output.txt ]]; then
    cat /tmp/test1-output.txt | python3 -m json.tool > /tmp/test1-parsed.json 2>/dev/null
    
    if [[ $? -eq 0 ]]; then
        echo "✓ Successfully parsed JSON output"
        echo ""
        echo "=== JSON Structure ==="
        cat /tmp/test1-parsed.json | head -30
        
        echo ""
        echo "=== Key Fields ==="
        echo "ok: $(cat /tmp/test1-parsed.json | jq -r '.ok')"
        echo "url: $(cat /tmp/test1-parsed.json | jq -r '.url // empty')"
    else
        echo "⚠ Output is not valid JSON or command failed"
    fi
fi
```

**Document JSON Structure:**
- Top-level fields: _______
- `url` field exists: _______ (yes/no)
- `ok` field exists: _______ (yes/no)
- Warnings array: _______ (yes/no/no)

---

## 🎯 Test Observations

### Document Your Findings

**1. Current Provider Order:**
```
Current order: SIMPLENOTE → Telegraph
We need to change to: Telegraph → Simplenote
```

**2. Current Fallback Behavior:**
```
When Simplenote fails: Falls back to Telegraph ✓
When Telegraph fails: No further fallback ✗
No retry with different preprocessing ✗
```

**3. Preprocessing Impact:**
```
No preprocessing:  _______ (often fails/sometimes fails/works)
Standard mode:     _______ (success rate: _____)
Aggressive mode:   _______ (success rate: _____)
```

**4. Output Format:**
```
Current output is: JSON
Will need to add: attempt metadata
```

### Behavior That Needs to Change

List the differences between current behavior and desired behavior:

1. **Current:** Simplenote tried first
   **Desired:** Telegraph tried first

2. **Current:** Single attempt per provider
   **Desired:** Retry with different preprocessing modes

3. **Current:** No attempt metadata in output
   **Desired:** Output shows which attempt succeeded

4. **Current:** Success/failure is binary
   **Desired:** Transparent retry visible in logs

---

## 🎯 Success Criteria

- [ ] Created at least 3 test files (simple, complex, large)
- [ ] Ran minimum 7 test scenarios
- [ ] Documented current behavior
- [ ] Observed at least one failure (to understand retry need)
- [ ] Analyzed JSON output structure
- [ ] Understood where current flow breaks down
- [ ] Ready to analyze error patterns (Card 04)

---

## 📚 Test Files Created

Document what you created:

```bash
echo "=== Test Files Summary ==="
echo "Location: /tmp/publish-retry-tests"
ls -lh /tmp/publish-retry-tests/

echo ""
echo "=== File Contents Preview ==="
for file in /tmp/publish-retry-tests/*.md; do
    echo "File: $(basename $file)"
    wc -l "$file"
    head -5 "$file"
    echo "---"
done
```

---

## 🚨 Common Issues

**Problem:** Tests fail due to missing auth

**Solution:** Set environment variables:
```bash
export SIMPLENOTE_EMAIL="your-email@example.com"
export TELEGRAPH_ACCESS_TOKEN="your-token"
```

**Problem:** Large files always fail

**That's OK!** This demonstrates the need for retry logic. Document the failure mode.

---

## 📊 Test Results Summary

| Test # | Scenario | Expected | Actual | Notes |
|--------|----------|----------|--------|-------|
| 1 | Simple, no flags | Success | _______ | _______ |
| 2 | Simple, Telegraph | Success | _______ | _______ |
| 3 | Simple, Simplenote | Success | _______ | _______ |
| 4 | Complex, std | Maybe fail | _______ | _______ |
| 5 | Complex, agg | Success | _______ | _______ |
| 6 | Large, no prep | Fail | _______ | _______ |
| 7 | Large, agg | Success | _______ | _______ |

---

**Next Card:** 🔍 Card 04 - Analyze Error Patterns