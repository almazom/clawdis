# 🔄 Card 07: Implement 4-Stage Retry Logic

**Priority:** 🔴 Critical  | **Type:** Implementation  | **Est. Time:** 45 minutes

**Card Goal:** Replace placeholder code with real calls to `publish_with_provider()`.

---

## 📋 Checklist

- [ ] Import necessary modules at top of cli.py
- [ ] Replace dummy URL with real `publish_with_provider()` call
- [ ] Handle success properly (return URL)
- [ ] Handle exceptions properly (continue to next attempt)
- [ ] Test with real API calls (use simple files first)

---

## 🎯 Implementation Steps

### 1. Add Required Imports

```bash
cd /home/almaz/TOOLS/publish_to_web

# Check current imports
head -20 src/publish_to_web/cli.py

# Add imports after existing ones
cat > /tmp/add_imports.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Add import before the first "class" or "def ", after module docstring
if 'import sys' not in content:
    # Add sys import near top
    content = re.sub(
        r'(import json\s+import os)',
        r'\1\nimport sys',
        content
    )

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Added imports")
EOF

python3 /tmp/add_imports.py
```

### 2. Find publish_with_provider Function

```bash
# Locate publish_with_provider definition
grep -n "^def publish_with_provider" src/publish_to_web/cli.py

# Read function signature
sed -n '168,172p' src/publish_to_web/cli.py
```

Expected: `def publish_with_provider(content, title, provider):`

### 3. Replace Dummy Code

```bash
# Backup before major change
cp src/publish_to_web/cli.py src/publish_to_web/cli.py.backup.06

# Find retry_publish and replace placeholder
cat > /tmp/impl_retry.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Replace the dummy URL line
old_code = '''            # Attempt to publish (placeholder - implement in Card 07)
            # url = publish_with_provider(preprocessed_content, title, provider)
            url = f"https://example.com/attempt-{attempt_num}"  # TODO: Replace'''

new_code = '''            # Attempt to publish
            url, warnings = publish_with_provider(preprocessed_content, title, provider)'''

content = content.replace(old_code, new_code)

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Implemented retry logic")
EOF

python3 /tmp/impl_retry.py
```

### 4. Fix Return Statement

```bash
cat > /tmp/fix_return.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Fix return to match actual return signature
old_return = "            # Return URL on success\n            return url"

new_return = "            # Return URL on success\n            return url, warnings"

content = content.replace(old_return, new_return)

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Fixed return statement")
EOF

python3 /tmp/fix_return.py
```

### 5. Test Basic Flow

```bash
# Create simple test
cat > /tmp/test_retry_real.py << 'EOF'
import sys
sys.path.insert(0, '/home/almaz/TOOLS/publish_to_web/src')

from publish_to_web.cli import retry_publish

print("Test: Calling retry_publish with minimal input")
try:
    url, warnings = retry_publish("# Test\n\nContent", "Test Title")
    print(f"✓ SUCCESS: {url}")
    print(f"  Warnings: {warnings}")
except Exception as e:
    print(f"✗ FAILED: {type(e).__name__}: {e}")

EOF

cd /home/almaz/TOOLS/publish_to_web
python3 /tmp/test_retry_real.py
```

**Expected:** Will try to publish 4 times, all fail (because no real credentials), but code executes

---

## 🎯 Test with Real Simple File

```bash
cd /tmp/publish-retry-tests

# Use simple file from Card 03
echo "=== Test Retry with Real File ==="
/home/almaz/TOOLS/publish_to_web/md_2_web.sh --preprocess standard test-simple.md 2>&1

echo ""
echo "=== Without Preprocess (should auto-retry) ==="
# This will not retry yet (preprocessing not integrated)
# But should work if preprocessing is off
/home/almaz/TOOLS/publish_to_web/md_2_web.sh --preprocess off test-simple.md 2>&1
```

**Document Results:**
- Test 1 with --preprocess: _______
- Test 2 without --preprocess: _______
- Number of attempts made: _______

---

## 🎯 Code Verification

### Check retry_publish Function

```bash
# Read the updated function
echo "=== Verify retry_publish implementation ==="
sed -n '/^def retry_publish/,/^def\|^class\|^[a-zA-Z_][a-zA-Z0-9_]* =/p' src/publish_to_web/cli.py | head -60
```

**Verify:**
- [ ] Calls `publish_with_provider()` (not dummy URL)
- [ ] Passes `preprocessed_content`, `title`, `provider`
- [ ] Returns `url, warnings`
- [ ] Has try/except around call
- [ ] On except, continues to next iteration
- [ ] On success, returns immediately

### Compile Check

```bash
# Verify no syntax errors
python3 -m py_compile src/publish_to_web/cli.py
echo "✓ No syntax errors"
```

---

## 🎯 What We Just Built

### Before (from Card 06):
```python
try:
    url = f"https://example.com/attempt-{attempt_num}"  # Dummy
    return url
except Exception as e:
    continue
```

### After (this card):
```python
try:
    url, warnings = publish_with_provider(preprocessed_content, title, provider)
    return url, warnings
except Exception as e:
    attempts.append({...})
    continue
```

**Key Improvements:**
- Real API calls
- Actual warnings returned
- Errors logged properly
- Still continues on failure (will retry)

---

## 🎯 Next Steps

**Card 08:** Will implement preprocessing integration (replace `preprocessed_content = content`)

**Current Status:** retry_publish() can now make real publishing calls, but doesn't preprocess

---

## 🎯 Success Criteria

- [ ] Added needed imports (sys, etc.)
- [ ] Replaced dummy URL with real publish_with_provider call
- [ ] Fixed return signature (returns url, warnings)
- [ ] Function compiles without syntax errors
- [ ] Can be called without crashing
- [ ] Ready for preprocessing integration (Card 08)

---

**Next Card:** ⚡ Card 08 - Add Preprocessing Integration