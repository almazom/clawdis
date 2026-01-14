# 🧱 Card 06: Build Retry Function Skeleton

**Priority:** 🔴 Critical  | **Type:** Implementation  | **Est. Time:** 30 minutes

**Card Goal:** Create the foundation of retry logic - an empty wrapper function structure.

---

## 📋 Checklist

- [ ] Create `retry_publish()` function in cli.py
- [ ] Define retry chain structure (Telegraph first!)
- [ ] Add function signature and docstring
- [ ] Add placeholder for preprocessing integration
- [ ] Add comments for each retry stage
- [ ] Don't call any actual code yet (skeleton only)

---

## 🎯 Implementation Steps

### 1. Open CLI File

```bash
cd /home/almaz/TOOLS/publish_to_web

# Make a backup first
cp src/publish_to_web/cli.py src/publish_to_web/cli.py.backup

# Open in editor (or use cat with heredoc)
# We'll append new function at the end of the file
```

### 2. Create Retry Function Skeleton

```bash
cat >> src/publish_to_web/cli.py << 'EOF'

def retry_publish(content, title, provider_preference="auto"):
    """Retry publishing with different (provider, preprocessing) combinations.
    
    Implements 4-stage retry chain:
    1. Telegraph + standard preprocessing
    2. Telegraph + aggressive preprocessing
    3. Simplenote + standard preprocessing  
    4. Simplenote + aggressive preprocessing
    
    Args:
        content: Raw markdown content (string)
        title: Page title (string)
        provider_preference: "auto" for retry, or explicit provider
        
    Returns:
        URL string if successful
        
    Raises:
        PublishError: If all 4 attempts fail
        
    Note:
        This wraps publish_with_provider() and tries multiple combinations.
    """
    # Define the retry chain - TELEGRAPH FIRST (preferred)
    retry_chain = [
        ("telegraph", "standard"),   # #1: Best case - Telegraph, good formatting
        ("telegraph", "aggressive"), # #2: Strip HTML, keep Telegraph
        ("simplenote", "standard"),  # #3: Switch provider, try standard
        ("simplenote", "aggressive"), # #4: Last resort - reliable provider, stripped content
    ]
    
    # Store attempt history for debugging/telemetry
    attempts = []
    
    # Try each combination in order
    for attempt_num, (provider, preprocessing_mode) in enumerate(retry_chain, 1):
        # Log attempt (placeholder - implement logging in Card 09)
        # print(f"[DEBUG] Attempt {attempt_num}: {provider} + {preprocessing_mode}", file=sys.stderr)
        
        try:
            # Apply preprocessing (placeholder - implement in Card 08)
            # preprocessed_content = apply_preprocessing(content, preprocessing_mode)
            preprocessed_content = content  # TODO: Replace with real preprocessing
            
            # Attempt to publish (placeholder - implement in Card 07)
            # url = publish_with_provider(preprocessed_content, title, provider)
            url = f"https://example.com/attempt-{attempt_num}"  # TODO: Replace
            
            # Log success (placeholder - implement in Card 09)
            # print(f"[DEBUG] Success on attempt {attempt_num}", file=sys.stderr)
            
            # Return URL on success
            return url
            
        except Exception as e:
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
            continue
    
    # All attempts failed - raise comprehensive error
    error_summary = "; ".join([
        f"Attempt {a['attempt']}: {a['provider']}+{a['preprocessing']} failed: {a['error'][:50]}"
        for a in attempts[-2:]  # Show last 2 attempts
    ])
    
    raise PublishError(f"All 4 retry attempts failed. {error_summary}")
EOF
```

### 3. Verify Skeleton Was Added

```bash
# Check the file ends with our new function
tail -50 src/publish_to_web/cli.py

# Count functions in file
grep -c "^def " src/publish_to_web/cli.py
echo "Should be 1 more than before (added retry_publish)"

# Verify it can be imported
python3 << 'EOF'
import sys
sys.path.insert(0, 'src')
from publish_to_web.cli import retry_publish
print("✓ Function imported successfully")
print(f"Function: {retry_publish}")
EOF
```

**Expected Output:**
- Function appears at end of file
- Can be imported without errors
- No syntax errors

### 4. Test Skeleton (Without Running Real Code)

```bash
# Create a test script that uses the skeleton
cat > /tmp/test_skeleton.py << 'EOF'
import sys
sys.path.insert(0, '/home/almaz/TOOLS/publish_to_web/src')

from publish_to_web.cli import retry_publish

# Test 1: Does function exist?
print("Test 1: Function exists")
print(f"  Name: {retry_publish.__name__}")
print(f"  Docstring: {retry_publish.__doc__[:100]}...")
print("  ✓ PASS\n")

# Test 2: Does it have expected structure?
import inspect
source = inspect.getsource(retry_publish)
print("Test 2: Function structure")
print(f"  Has retry_chain: {('retry_chain = [' in source)}")
print(f"  Has 4-stage loop: {('for attempt_num' in source)}")
print(f"  Has attempt logging: {('attempts.append' in source)}")
print("  ✓ PASS\n")

# Test 3: Can we call it? (should return dummy URL)
print("Test 3: Function call")
try:
    result = retry_publish("# Test", "Test Title")
    print(f"  Returned: {result}")
    print("  ✓ PASS (returns dummy URL)")
except Exception as e:
    print(f"  ✗ FAIL: {e}")

print("\n✅ All tests passed - skeleton is ready!")
EOF

python3 /tmp/test_skeleton.py
```

**Expected Output:** All tests pass, function returns dummy URL

---

## 🎯 Key Components Added

### 1. Function Signature
```python
def retry_publish(content, title, provider_preference="auto"):
```

**Parameters:**
- `content`: Raw markdown (string) - IN
- `title`: Page title (string) - IN
- `provider_preference`: "auto" or explicit provider - IN
- **Returns**: URL string - OUT

### 2. Retry Chain Definition
```python
retry_chain = [
    ("telegraph", "standard"),   # Attempt 1
    ("telegraph", "aggressive"), # Attempt 2
    ("simplenote", "standard"),  # Attempt 3
    ("simplenote", "aggressive"), # Attempt 4
]
```

**Key Design Decisions:**
- Telegraph first (preferred for URLs)
- Standard preprocessing first (preserves formatting)
- Each provider gets 2 attempts (std → agg)
- Total: 4 attempts maximum

### 3. Attempt Tracking
```python
attempts = []  # Will track all attempts for telemetry

for attempt_num, (provider, preprocessing_mode) in enumerate(retry_chain, 1):
    # Try this combination
    # On failure, log to attempts array
    # Continue to next iteration
```

### 4. Error Handling Scaffolding
```python
try:
    # Try to publish
    return url
except Exception as e:
    # Log failure
    attempts.append({...})
    # Check for non-recoverable (Card 09)
    # Continue to next attempt
```

---

## 🎯 What to Implement in Next Cards

**Card 07:** Replace this:
```python
url = f"https://example.com/attempt-{attempt_num}"  # TODO
```

With real code:
```python
url = publish_with_provider(preprocessed_content, title, provider)
```

**Card 08:** Replace this:
```python
preprocessed_content = content  # TODO
```

With real preprocessing:
```python
preprocessed_content = apply_preprocessing(content, preprocessing_mode)
```

**Card 09:** Replace placeholders with actual logging/error detection:
```python
# Add real logging
print(f"[DEBUG] Attempt {attempt_num}: {provider} + {prep_mode}", file=sys.stderr)

# Add error detection
if is_non_recoverable_error(e):
    raise  # Stop retry chain
```

---

## 🎯 Success Criteria

- [ ] `retry_publish()` function exists in cli.py
- [ ] Function has complete docstring
- [ ] Retry chain defined with 4 stages (Telegraph first)
- [ ] Loop iterates through all combinations
- [ ] Basic try/except structure in place
- [ ] Can be imported without syntax errors
- [ ] Returns dummy URL (placeholder for now)
- [ ] Ready for Card 07 (real publishing logic)

---

## 🚨 Troubleshooting

**Problem:** Syntax error when importing

**Solution:** Check Python syntax:
```bash
python3 -m py_compile src/publish_to_web/cli.py
```

**Problem:** Function not found when importing

**Solution:** Check function is properly indented and at module level:
```bash
grep -n "^def retry_publish" src/publish_to_web/cli.py
```

---

## 📚 Notes for Later

The retry chain order was decided in gap analysis (GAP-001, GAP-003):
- Telegraph first (better URLs, preferred)
- Standard preprocessing first (preserves formatting)
- This order is FINAL and validated

If you need to reference flow diagrams, see:
- `docs/sdd/api-publish-retry-cleaner/ui-flow.md`
- `/tmp/ascii_flow.txt` (from Card 05)

---

**Next Card:** 🔄 Card 07 - Implement 4-Stage Retry Logic