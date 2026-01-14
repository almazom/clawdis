# ✅ Card 11: Add Comprehensive Error Handling

**Priority:** 🟡 Important  | **Type:** Polish  | **Est. Time:** 30 minutes

**Card Goal:** Make error handling robust and user-friendly for all edge cases.

---

## 📋 Checklist

- [ ] Add exponential backoff between attempts
- [ ] Improve error messages
- [ ] Handle specific Telegraph errors
- [ ] Handle rate limits properly
- [ ] Add final error summary when all fail
- [ ] Test all error scenarios

---

## 🎯 Implementation Steps

### 1. Add Exponential Backoff

```bash
cd /home/almaz/TOOLS/publish_to_web

cat > /tmp/add_backoff.py << 'EOF'
import re
import time

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# After logging failure, add sleep
old_continue = '''            # Continue to next attempt
            continue'''

new_continue = '''            # Exponential backoff before retry
            backoff_seconds = min(2 ** (attempt_num - 1), 10)  # 2, 4, 8, 10 seconds max
            print(f"[Backoff] Waiting {backoff_seconds}s before next attempt...", 
                  file=sys.stderr)
            time.sleep(backoff_seconds)
            
            # Continue to next attempt
            continue'''

content = content.replace(old_continue, new_continue)

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Added exponential backoff")
EOF

python3 /tmp/add_backoff.py
```

### 2. Improve Final Error Message

```bash
cat > /tmp/improve_error.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Update final error to be more helpful
old_error = '''    # All attempts failed - raise comprehensive error
    error_summary = "; ".join([
        f"Attempt {a['attempt']}: {a['provider']}+{a['preprocessing']} failed: {a['error'][:50]}"
        for a in attempts[-2:]  # Show last 2 attempts
    ])
    
    raise PublishError(f"All 4 retry attempts failed. {error_summary}")'''

new_error = '''    # All attempts failed - raise comprehensive error
    print("\n" + "="*60, file=sys.stderr)
    print("❌ ALL 4 ATTEMPTS FAILED", file=sys.stderr)
    print("="*60, file=sys.stderr)
    
    for attempt in attempts:
        status = "❌" if not attempt['success'] else "✅"
        print(f"{status} Attempt {attempt['attempt']}: {attempt['provider']}+{attempt['preprocessing']}",
              file=sys.stderr)
        if attempt.get('error'):
            print(f"   Error: {attempt['error'][:80]}", file=sys.stderr)
    
    print("="*60, file=sys.stderr)
    
    # Suggest alternatives
    print("\n💡 Suggestions:", file=sys.stderr)
    print("- Check your network connection", file=sys.stderr)
    print("- Verify your API credentials (SIMPLENOTE_EMAIL, TELEGRAPH_ACCESS_TOKEN)", file=sys.stderr)
    print("- Try publishing a smaller/simpler file", file=sys.stderr)
    print("- Run with --preprocess aggressive to force aggressive mode", file=sys.stderr)
    
    raise PublishError(f"All 4 retry attempts failed. Last error: {attempts[-1]['error'][:100]}")'''

content = content.replace(old_error, new_error)

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Improved final error message")
EOF

python3 /tmp/improve_error.py
```

### 3. Add Specific Telegraph Error Detection

```bash
cat > /tmp/specific_telegraph_errors.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Find should_retry_error
retry_func_start = content.find('def should_retry_error')
if retry_func_start < 0:
    print("ERROR: should_retry_error not found")
    sys.exit(1)

# Find end of function (next def or end of file)
next_def = content.find('\ndef ', retry_func_start + 1)
func_end = next_def if next_def > 0 else len(content)

retry_func = content[retry_func_start:func_end]

# Add specific Telegraph error patterns
telegraph_patterns = '''
    # Telegraph-specific size errors
    if any(pattern in error_msg for pattern in [
        "content is too big",
        "content too large",
        "request entity too large",
        "object too large"
    ]):
        return True, "Telegraph content limit"
    
    # Telegraph API errors
    if "telegra.ph" in error_msg and "failed" in error_msg:
        return True, "Telegraph API error"'''

# Insert before default return
retry_func = retry_func.replace(
    "    # Default: Retry (better to try than give up)\n    return True, \"Unknown error (retry as fallback)\"",