# ⚡ Card 08: Add Preprocessing Integration

**Priority:** 🔴 Critical  | **Type:** Implementation  | **Est. Time:** 30 minutes

**Card Goal:** Add real preprocessing calls to the retry chain.

---

## 📋 Checklist

- [ ] Understand how preprocessing works in md_2_web.sh
- [ ] Create helper function for preprocessing
- [ ] Integrate preprocessing into retry chain
- [ ] Test with files that need preprocessing
- [ ] Verify different modes work (standard, aggressive)

---

## 🎯 Implementation Steps

### 1. Study Preprocessing Current Implementation

```bash
cd /home/almaz/TOOLS/publish_to_web

# Read md_2_web.sh preprocessing handling
grep -A 20 "Handle preprocessing" md_2_web.sh

# Find preprocessing script
grep "preprocess_for_telegraph" md_2_web.sh

# Read preprocessing script signature
cat preprocess_for_telegraph_v2.py | head -50 | grep -A 5 "def\|if __name__"
```

**Expected:** Script takes `--mode` and filename, outputs to stdout

### 2. Create Preprocessing Helper Function

```bash
cat > /tmp/add_preprocessing.py << 'EOF'
import sys
import subprocess
import tempfile
import os

def apply_preprocessing(content, mode):
    """Apply preprocessing to markdown content.
    
    Args:
        content: Raw markdown content (string)
        mode: Preprocessing mode ("standard", "aggressive", "minimal", "off")
        
    Returns:
        Preprocessed content (string)
        
    Raises:
        Exception: If preprocessing fails
    """
    if mode == "off":
        return content
    
    if mode not in {"minimal", "standard", "aggressive"}:
        raise ValueError(f"Invalid preprocessing mode: {mode}")
    
    # Write content to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
        f.write(content)
        temp_path = f.name
    
    try:
        # Run preprocessing script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        preprocess_script = os.path.join(script_dir, 'preprocess_for_telegraph_v2.py')
        
        result = subprocess.run(
            [sys.executable, preprocess_script, '--mode', mode, temp_path],
            capture_output=True,
            text=True,
            check=False  # Don't raise exception on non-zero exit
        )
        
        if result.returncode != 0:
            # If preprocessing fails, log warning and return original
            error_msg = result.stderr.strip()
            print(f"Warning: Preprocessing failed ({mode}): {error_msg}", 
                  file=sys.stderr)
            return content
        
        return result.stdout
        
    finally:
        # Clean up temp file
        os.unlink(temp_path)

# Test the function
if __name__ == "__main__":
    test_content = """# Test
<div>Some HTML</div>
"""
    
    print("Testing preprocessing...")
    for mode in ["standard", "aggressive"]:
        try:
            result = apply_preprocessing(test_content, mode)
            print(f"{mode}: {len(result)} chars")
        except Exception as e:
            print(f"{mode}: ERROR - {e}")
EOF

python3 /tmp/add_preprocessing.py > /tmp/preprocessing_helper.py
```

### 3. Add Helper to cli.py

```bash
# Find where to insert (after imports, before retry_publish)
cat > /tmp/insert_helper.py << 'EOF'
import subprocess
import tempfile
import os

def apply_preprocessing(content, mode):
    """Apply preprocessing to markdown content.
    
    Args:
        content: Raw markdown content (string)
        mode: Preprocessing mode ("standard", "aggressive", "minimal", "off")
        
    Returns:
        Preprocessed content (string)
        
    Raises:
        Exception: If preprocessing fails
    """
    if mode == "off":
        return content
    
    if mode not in {"minimal", "standard", "aggressive"}:
        raise ValueError(f"Invalid preprocessing mode: {mode}")
    
    # Write content to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
        f.write(content)
        temp_path = f.name
    
    try:
        # Run preprocessing script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        preprocess_script = os.path.join(os.path.dirname(script_dir), 'preprocess_for_telegraph_v2.py')
        
        result = subprocess.run(
            [sys.executable, preprocess_script, '--mode', mode, temp_path],
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode != 0:
            # If preprocessing fails, log warning and return original
            error_msg = result.stderr.strip()
            print(f"Warning: Preprocessing failed ({mode}): {error_msg}", 
                  file=sys.stderr)
            return content
        
        return result.stdout
        
    finally:
        # Clean up temp file
        os.unlink(temp_path)

# Add this to cli.py before retry_publish function
print("Helper function created")
EOF

python3 /tmp/insert_helper.py > /tmp/helper_function.py
cat /tmp/helper_function.py
```

### 4. Insert Helper and Update retry_publish

```bash
# Backup again
cp src/publish_to_web/cli.py src/publish_to_web/cli.py.backup.07

# Insert helper function AND update retry_publish in one go
cat > /tmp/final_integration.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# 1. Insert helper function before retry_publish
helper_function = '''def apply_preprocessing(content, mode):
    """Apply preprocessing to markdown content.
    
    Args:
        content: Raw markdown content (string)
        mode: Preprocessing mode ("standard", "aggressive", "minimal", "off")
        
    Returns:
        Preprocessed content (string)
        
    Raises:
        Exception: If preprocessing fails
    """
    if mode == "off":
        return content
    
    if mode not in {"minimal", "standard", "aggressive"}:
        raise ValueError(f"Invalid preprocessing mode: {mode}")
    
    # Write content to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
        f.write(content)
        temp_path = f.name
    
    try:
        # Run preprocessing script
        current_file = os.path.abspath(__file__)
        script_dir = os.path.dirname(os.path.dirname(current_file))
        preprocess_script = os.path.join(script_dir, 'preprocess_for_telegraph_v2.py')
        
        result = subprocess.run(
            [sys.executable, preprocess_script, '--mode', mode, temp_path],
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode != 0:
            # If preprocessing fails, log warning and return original
            error_msg = result.stderr.strip()
            print(f"Warning: Preprocessing failed ({mode}): {error_msg}", 
                  file=sys.stderr)
            return content
        
        return result.stdout
        
    finally:
        # Clean up temp file
        os.unlink(temp_path)


'''

# Find where def retry_publish starts
retry_match = re.search(r'(^def retry_publish\()', content, re.MULTILINE)
if not retry_match:
    print("ERROR: Could not find retry_publish function")
    sys.exit(1)

retry_start = retry_match.start()

# Insert helper before retry_publish
content = content[:retry_start] + helper_function + content[retry_start:]

# 2. Now update preprocess_content = content line
old_line = "            preprocessed_content = content  # TODO: Replace with real preprocessing"
new_line = "            preprocessed_content = apply_preprocessing(content, preprocessing_mode)"

content = content.replace(old_line, new_line)

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Preprocessing helper added")
print("✓ retry_publish updated to use preprocessing")
EOF

python3 /tmp/final_integration.py
```

### 5. Add Required Imports

```bash
cat > /tmp/add_imports_final.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Add subprocess, tempfile, os if not present
to_add = []
for imp in ['import subprocess', 'import tempfile', 'import os']:
    if imp not in content:
        to_add.append(imp)

if to_add:
    # Add after other imports
    content = re.sub(
        r'(^(import|from) .+$\s+)+',
        lambda m: m.group() + '\n'.join(to_add) + '\n\n',
        content,
        count=1,
        flags=re.MULTILINE
    )
    
    with open('src/publish_to_web/cli.py', 'w') as f:
        f.write(content)
    
    print(f"✓ Added imports: {', '.join(to_add)}")
else:
    print("✓ All imports already present")
EOF

python3 /tmp/add_imports_final.py
```

### 6. Test Preprocessing

```bash
cd /tmp/publish-retry-tests

# Test 1: Simple file with standard preprocessing
echo "=== Test: Standard Preprocessing ==="
/home/almaz/TOOLS/publish_to_web/md_2_web.sh /tmp/publish-retry-tests/test-simple.md 2>&1 | grep -E "(Preprocessing|Success|https:)"

echo ""
echo "=== Test: Aggressive Preprocessing (via manual flag) ==="
/home/almaz/TOOLS/publish_to_web/md_2_web.sh --preprocess aggressive /tmp/publish-retry-tests/test-complex.md 2>&1 | grep -E "(Preprocessing|Success|https:)"
```

**Expected Output:** See preprocessing messages, then success

---

## 🎯 Verification

### Check Full Integration

```bash
cd /home/almaz/TOOLS/publish_to_web

# Verify retry_publish function
echo "=== Verify retry_publish with preprocessing ==="
sed -n '/^def retry_publish/,/^def\|^class/ { /^    preprocessed_content/p; /^    url, warnings/p }' src/publish_to_web/cli.py | head -10
```

**Should see:**
```python
    preprocessed_content = apply_preprocessing(content, preprocessing_mode)
    url, warnings = publish_with_provider(preprocessed_content, title, provider)
```

### Test with Complex File

```bash
cd /tmp/publish-retry-tests

echo "=== Test Complex File (needs preprocessing) ==="
# This should succeed because we're using preprocessing
/home/almaz/TOOLS/publish_to_web/md_2_web.sh --preprocess standard test-complex.md
```

**Expected:** Publishes successfully to Telegraph or Simplenote

---

## 🎯 Success Criteria

- [ ] apply_preprocessing() helper function exists in cli.py
- [ ] Helper handles standard and aggressive modes
- [ ] retry_publish() calls apply_preprocessing()
- [ ] retry_publish() passes preprocessed content to publish
- [ ] Complex files publish successfully
- [ ] Standard mode preserves more formatting
- [ ] Aggressive mode strips HTML successfully
- [ ] Both modes work in retry chain
- [ ] Ready for Card 09 (error handling & logging)

---

## 🎯 Test Matrix

| File Type | Mode | Expected Result |
|-----------|------|-----------------|
| test-simple.md | standard | Success |
| test-complex.md | standard | Success |
| test-complex.md | aggressive | Success (less HTML) |
| test-large.md | standard | Success or retry |

**Next Card:** 🎯 Card 09 - Add Error Detection & Timeouts