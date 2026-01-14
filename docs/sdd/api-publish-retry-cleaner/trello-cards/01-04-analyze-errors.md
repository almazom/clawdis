# 🔍 Card 04: Analyze Error Patterns

**Priority:** 🟡 Important  | **Type:** Investigation  | **Est. Time:** 20 minutes

**Card Goal:** Understand what errors occur during publishing and which ones are recoverable vs non-recoverable.

---

## 📋 Checklist

- [ ] Identify all possible error types
- [ ] Categorize errors as recoverable or non-recoverable
- [ ] Find which errors should trigger retry vs immediate failure
- [ ] Document error detection patterns
- [ ] Understand current error handling

---

## 🎯 Tasks

### 1. Study Error Classes

```bash
cd /home/almaz/TOOLS/publish_to_web

# Find all exception classes
grep -r "class.*Error" src/publish_to_web/ --include="*.py"
grep -r "class.*Exception" src/publish_to_web/ --include="*.py"

# Read errors.py file
if [[ -f src/publish_to_web/errors.py ]]; then
    cat src/publish_to_web/errors.py
else
    echo "No errors.py - check main files for error classes"
fi
```

**Expected Output:** List of custom exception classes

### 2. Find Error Handling Patterns

```bash
# Find try/except blocks in cli.py
grep -n "try:" src/publish_to_web/cli.py
grep -n "except" src/publish_to_web/cli.py

# Read error handling in main()
sed -n '244,266p' src/publish_to_web/cli.py
```

**Document find:**
- Line numbers of try/except blocks: _______
- Exception types caught: _______

### 3. Analyze Telegraph Errors

```bash
# Read telegraph_publisher.py error handling
grep -n "raise PublishError" src/publish_to_web/telegraph_publisher.py
grep -B 3 -A 3 "PublishError" src/publish_to_web/telegraph_publisher.py
```

**Key Errors to Find:**
```python
# Telegraph can fail with:
- "Content is too big" (structure too complex)
- "File too large" 
- HTTP 413: REQUEST_ENTITY_TOO_LARGE
- Network timeouts
- Auth failures (HTTP 401)
- Rate limits (HTTP 429)
```

### 4. Test and Trigger Different Errors

```bash
cd /tmp/publish-retry-tests

# Error Test 1: Auth Failure (will need to fail for this)
echo "=== Testing Auth Failure ==="
# Temporarily break auth for testing
# DON'T actually do this - just understand it would fail immediately

# Error Test 2: File Not Found
./md_2_web.sh /nonexistent/file.md 2>&1 | tee /tmp/error-notfound.txt
echo "Exit code: $?"

# Error Test 3: Wrong File Type (if you have one)
touch /tmp/not-markdown.txt
./md_2_web.sh /tmp/not-markdown.txt 2>&1 | tee /tmp/error-wrongtype.txt
echo "Exit code: $?"
rm /tmp/not-markdown.txt

# Error Test 4: Use large file that might timeout
./md_2_web.sh /tmp/publish-retry-tests/test-large.md 2>&1 > /tmp/error-timeout.txt &
PID=$!
sleep 10  # Give it some time
if ps -p $PID > /dev/null; then
    kill $PID
    echo "Timeout detected (killed after 10s)"
fi
```

### 5. Create Error Taxonomy

Based on your research and tests, create a table:

```bash
cat > /tmp/error_taxonomy.txt << 'EOF'
Error Taxonomy for Publishing Retry
====================================

| Error Type | HTTP Code | Example Message | Recoverable? | Retry Action |
|------------|-----------|-----------------|--------------|--------------|
| Telegraph "too big" | 413 | "Content is too big" | ✅ Yes | Try aggressive |
| Telegraph timeout | None | Timeout | ✅ Yes | Try next combo |
| Simplenote timeout | None | Timeout | ✅ Yes | Try aggressive |
| Network error | None | Connection failed | ✅ Yes | Retry |
| Auth failure | 401 | "Unauthorized" | ❌ No | Stop immediately |
| Rate limit | 429 | "Too many requests" | ✅ Yes | Retry with backoff |
| File not found | N/A | "File not found" | ❌ No | Stop immediately |
| Invalid format | N/A | "Not a markdown file" | ❌ No | Stop immediately |

Key Observations:
==================
1. Most network/API errors are recoverable
2. Auth failures should NEVER be retried
3. "Too big" errors are specific to Telegraph
4. Timeout vs error needs different handling
5. Need to detect error type before deciding to retry

Retry Logic Flow:
================
1. Attempt publishing
2. If success → return result
3. If auth failure → stop and show error
4. If "too big" → try aggressive mode
5. If timeout → try next combination
6. If network error → retry with backoff
7. If all options exhausted → show comprehensive error
EOF

cat /tmp/error_taxonomy.txt
```

---

## 🎯 Key Insights

### Recoverable Errors (RETRY OK)

These should trigger next attempt in retry chain:

1. **Telegraph "Content is too big"** (HTTP 413)
   - Try: Next preprocessing mode (standard → aggressive)
   - If aggressive fails: Switch provider to Simplenote

2. **Telegraph timeout** (network timeout)
   - Try: Same provider, next preprocessing mode
   - If aggressive fails: Switch to Simplenote

3. **Simplenote timeout**
   - Try: Aggressive preprocessing with Simplenote
   - If fails: Give up (last attempt)

4. **Rate limits (HTTP 429)**
   - Try: Retry with exponential backoff
   - Continue to next combination

5. **Network errors**
   - Try: Retry after short delay
   - Continue to next combination

### Non-Recoverable Errors (STOP IMMEDIATELY)

These should NOT trigger retry:

1. **Authentication failures (HTTP 401)**
   - Simplenote wrong credentials
   - Telegraph invalid token
   - **Action:** Show error immediately, don't retry

2. **File not found**
   - Invalid path
   - **Action:** Show error, no retry possible

3. **Invalid file type**
   - Not markdown
   - **Action:** Show error, no retry possible

4. **Permission denied**
   - Can't read file
   - **Action:** Show error, no retry possible

---

## 🎯 Error Detection Implementation Plan

Based on analysis, implement error detection like this:

```python
def should_retry(error):
    """Determine if error should trigger retry."""
    error_msg = str(error).lower()
    
    # Non-recoverable: Auth failures
    if "unauthorized" in error_msg or "401" in error_msg:
        return False
    
    # Non-recoverable: File errors
    if "not found" in error_msg or "permission denied" in error_msg:
        return False
    
    # Recoverable: Size/timeouts
    if "too big" in error_msg or "too large" in error_msg:
        return True
    if "timeout" in error_msg:
        return True
    
    # Recoverable: Network/rate limit
    if "429" in error_msg or "rate limit" in error_msg:
        return True
    if "connection" in error_msg or "network" in error_msg:
        return True
    
    # Default: Retry (better to retry than give up immediately)
    return True
```

---

## 🎯 Success Criteria

- [ ] Identified all error types from code review
- [ ] Categorized errors as recoverable/non-recoverable
- [ ] Documented which errors trigger retry
- [ ] Created error detection patterns
- [ ] Understand current error handling behavior
- [ ] Know exactly what to implement in Card 09

---

## 📚 Error-Related Files

1. **cli.py** - Error handling in main() and publish_with_provider()
2. **errors.py** - Custom exception classes (if exists)
3. **telegraph_publisher.py** - Telegraph-specific errors
4. **publisher.py** - Simplenote-specific errors

---

## 🚨 Testing Error Detection

Later (Card 12), you'll test these error scenarios:

```bash
# Test auth failure (should stop immediately)
# Expected: No retry attempts

# Test "too big" error (should retry with aggressive)
# Expected: 2 attempts (standards fails, aggressive succeeds)

# Test timeout (should retry next combination)
# Expected: 3-4 attempts until success or all fail
```

---

**Next Card:** 📝 Card 05 - Document Existing Flow