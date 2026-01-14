# 🎯 Card 09: Add Error Detection & Timeouts

**Priority:** 🔴 Critical  | **Type:** Implementation  | **Est. Time:** 30 minutes

**Card Goal:** Make retry logic smart - detect which errors to retry and add timeouts.

---

## 📋 Checklist

- [ ] Add error classification function
- [ ] Add timeout to each attempt (30s)
- [ ] Add logging for each attempt
- [ ] Detect non-recoverable errors (auth)
- [ ] Detect "too big" errors for Telegraph
- [ ] Test error scenarios

---

## 🎯 Implementation Steps

### 1. Add Error Classification Function

```bash
cd /home/almaz/TOOLS/publish_to_web

# Add helper function before retry_publish
cat > /tmp/add_error_checker.py << 'EOF'
error_checker = '''def should_retry_error(error):
    """Determine if an error warrants a retry attempt.
    
    Returns:
        (bool, str) - (should_retry, reason)
    """
    error_msg = str(error).lower()
    error_type = type(error).__name__
    
    # Non-recoverable: Authentication failures
    if any(word in error_msg for word in ["unauthorized", "401", "login failed", "invalid token"]):
        return False, "Authentication error (non-recoverable)"
    
    # Non-recoverable: File errors
    if any(word in error_msg for word in ["file not found", "permission denied", "not a file"]):
        return False, "File error (non-recoverable)"
    
    # Non-recoverable: Invalid inputs
    if any(word in error_msg for word in ["invalid", "malformed", "cannot parse"]):
        return False, "Invalid input (non-recoverable)"
    
    # Recoverable: Size limit errors (Telegraph-specific)
    if any(word in error_msg for word in ["too big", "too large", "413", "content too large"]):
        return True, "Content too big (try aggressive mode)"
    
    # Recoverable: Timeout errors
    if any(word in error_msg for word in ["timeout", "timed out", "connection"]):
        return True, "Timeout (retry next combination)"
    
    # Recoverable: Rate limits
    if any(word in error_msg for word in ["429", "rate limit", "too many requests"]):
        return True, "Rate limited (retry with backoff)"
    
    # Recoverable: Network issues
    if any(word in error_msg for word in ["network", "connection", "unable to connect"]):
        return True, "Network error (retry)"
    
    # Default: Retry (better to try than give up)
    return True, "Unknown error (retry as fallback)"


'''

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Insert before retry_publish
retry_match = content.find('def retry_publish')
if retry_match < 0:
    print("ERROR: retry_publish not found")
    sys.exit(1)

content = content[:retry_match] + error_checker + content[retry_match:]

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Added error classification")
EOF

python3 /tmp/add_error_checker.py
```

### 2. Add Timeout with concurrent.futures

```bash
cat > /tmp/add_timeout.py << 'EOF'
# Add import at top
with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

if 'import concurrent.futures' not in content:
    content = 'import concurrent.futures\n' + content
    with open('src/publish_to_web/cli.py', 'w') as f:
        f.write(content)
    print("✓ Added concurrent.futures import")
else:
    print("✓ concurrent.futures already present")
EOF

python3 /tmp/add_timeout.py
```

### 3. Update retry_publish with Error Detection

```bash
cat > /tmp/update_retry_errors.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Update except block
try:
    old_except = '''        except Exception as e:
            # Log failure (placeholder - implement in Card 09)
            error_msg = str(e)
            attempts.append({
                "attempt": attempt_num,
                "provider": provider,
                "preprocessing": preprocessing_mode,
                "success": False,
                "error": error_msg
            })
            
            # Check if error is non-recoverable
            # (implement error detection in Card 09)
            # if is_non_recoverable_error(e):
            #     raise  # Stop retry chain
            
            # Continue to next attempt
            continue'''
    
    new_except = '''        except Exception as e:
            # Classify error
            should_retry, reason = should_retry_error(e)
            
            # Log failure
            error_msg = str(e)
            attempts.append({
                "attempt": attempt_num,
                "provider": provider,
                "preprocessing": preprocessing_mode,
                "success": False,
                "error": error_msg,
                "should_retry": should_retry,
                "retry_reason": reason
            })
            
            print(f"[Attempt {attempt_num}] {provider}+{preprocessing_mode} failed: {reason}", 
                  file=sys.stderr)
            
            # Stop immediately if non-recoverable
            if not should_retry:
                print(f"[Fatal] Non-recoverable error: {error_msg}", file=sys.stderr)
                raise  # Stop entire retry chain
            
            # Continue to next attempt
            continue'''
    
    content = content.replace(old_except, new_except)
    
    with open('src/publish_to_web/cli.py', 'w') as f:
        f.write(content)
    
    print("✓ Updated error handling")
    
except Exception as e:
    print(f"⚠ Pattern not found as expected: {e}")
    print("You may need to manually update the except block")
EOF

python3 /tmp/update_retry_errors.py
```

### 4. Add Timeout Wrapper

```bash
cat > /tmp/add_timeout_wrapper.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Wrap the publish call with timeout
old_publish = '''            # Attempt to publish
            url, warnings = publish_with_provider(preprocessed_content, title, provider)'''

new_publish = '''            # Attempt to publish (with 30s timeout)
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(publish_with_provider, 
                                       preprocessed_content, title, provider)
                url, warnings = future.result(timeout=30)'''

content = content.replace(old_publish, new_publish)

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Added timeout wrapper (30s)")
EOF

python3 /tmp/add_timeout_wrapper.py
```

---

## 🎯 Add Success Logging

Update the success path:

```bash
cat > /tmp/add_success_log.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Add logging before return
old_success = '''            # On success, return URL
            return url, warnings'''

new_success = '''            # Log success
            print(f"[Success] Published with {provider}+{preprocessing_mode} "
                  f"(attempt {attempt_num})", file=sys.stderr)
            
            # On success, return URL
            return url, warnings'''

content = content.replace(old_success, new_success)

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Added success logging")
EOF

python3 /tmp/add_success_log.py
```

---

## 🎯 Testing

### Test Error Detection

```bash
cd /tmp/publish-retry-tests

# Test 1: Auth error (simulated) - should stop immediately
echo "=== Test 1: Auth Detection ==="
# Can't easily test without real auth failure
# This will be tested in E2E tests

# Test 2: Complex file (should retry)
echo "=== Test 2: Complex File with Error Logging ==="
/home/almaz/TOOLS/publish_to_web/md_2_web.sh --preprocess standard test-complex.md 2>&1 | grep -E "\[Attempt|\[Success|\[Fatal"
```

**Expected Output:**
```
[Success] Published with telegraph+standard (attempt 1)
```

### Check Logging Output

```bash
cd /home/almaz/TOOLS/publish_to_web

# Test with debug output
echo "=== Test: Full Debug Output ==="
./md_2_web.sh --preprocess standard /tmp/publish-retry-tests/test-simple.md 2>&1
```

**Verify:** See attempt logs, success message

---

## 🎯 Verify Implementation

```bash
# Check error classification exists
grep -A 5 "def should_retry_error" src/publish_to_web/cli.py

# Check retry_publish has timeout
grep -A 2 "concurrent.futures.Thread" src/publish_to_web/cli.py | head -5

# Check retry has logging
grep "\[Success\]" src/publish_to_web/cli.py
grep "\[Attempt" src/publish_to_web/cli.py
grep "\[Fatal\]" src/publish_to_web/cli.py
```

---

## 🎯 Success Criteria

- [ ] `should_retry_error()` function added and working
- [ ] Distributes recoverable vs non-recoverable errors
- [ ] Timeout added (30s per attempt)
- [ ] Success logging added
- [ ] Failure logging added
- [ ] Non-recoverable errors stop retry chain
- [ ] Logging is user-friendly and informative
- [ ] Ready for Card 10 (wiring into CLI flow)

---

**Next Card:** 🔌 Card 10 - Wire Retry into CLI Flow