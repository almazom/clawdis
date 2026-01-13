# 🔌 Card 10: Wire Retry into CLI Flow

**Priority:** 🔴 Critical  | **Type:** Integration  | **Est. Time:** 25 minutes

**Card Goal:** Connect the retry logic into the main CLI flow so it's actually used.

---

## 📋 Checklist

- [ ] Determine when to use retry vs direct call
- [ ] Modify main() to call retry_publish()
- [ ] Parse --preprocess flag to control retry behavior
- [ ] Update response format with attempt metadata
- [ ] Test full flow end-to-end

---

## 🎯 Implementation Steps

### 1. Understand Current CLI Logic

```bash
cd /home/almaz/TOOLS/publish_to_web

# Find main function structure
grep -n "^def main" src/publish_to_web/cli.py
grep -n "publish_with_provider" src/publish_to_web/cli.py
```

**Locate:** Line numbers for main() and publish_with_provider call

### 2. Create Auto-Retry Detection Logic

```bash
cat > /tmp/add_retry_detection.py << 'EOF'
detection_function = '''def should_use_auto_retry(provider, preprocess_flag):
    """Determine if we should use auto-retry chain.
    
    Auto-retry is used when:
    - Provider is "auto" (default)
    - No explicit --preprocess flag from user
    
    Direct single-attempt is used when:
    - User specified explicit provider (not auto)
    - User specified explicit --preprocess flag
    """
    return provider == "auto" and preprocess_flag is None


'''

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Insert after should_retry_error function
error_pos = content.find('def retry_publish')
if error_pos < 0:
    print("ERROR: retry_publish not found")
    sys.exit(1)

content = content[:error_pos] + detection_function + content[error_pos:]

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Added auto-retry detection")
EOF

python3 /tmp/add_retry_detection.py
EOF
```

### 3. Modify main() Function

```bash
cat > /tmp/modify_main.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Find the publish call in main
old_publish_call = '''        published_url, provider_warnings = publish_with_provider(
            content, title, provider
        )'''

new_publish_logic = '''        # Decide: auto-retry or direct publish
        use_auto_retry = should_use_auto_retry(provider, preprocess_flag)
        
        if use_auto_retry:
            # NEW: Use retry chain (4 attempts with different combos)
            print(f"[Info] Using auto-retry mode (Telegraph → Simplenote)", file=sys.stderr)
            published_url, provider_warnings = retry_publish(content, title, provider)
        else:
            # EXISTING: Single attempt with explicit settings
            if preprocess_mode:
                # User specified --preprocess, apply it once
                content = apply_preprocessing(content, preprocess_mode)
            published_url, provider_warnings = publish_with_provider(
                content, title, provider
            )'''

content = content.replace(old_publish_call, new_publish_logic)

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Modified main() to use retry logic")
EOF

python3 /tmp/modify_main.py
```

### 4. Update parse_args to Track --preprocess

```bash
cat > /tmp/update_parse_args.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Find parse_args function and modify to return preprocess_mode
old_parse_sig = '''def parse_args(argv):
    provider = None
    path = None'''

new_parse_sig = '''def parse_args(argv):
    provider = None
    path = None
    preprocess_flag = None'''

content = content.replace(old_parse_sig, new_parse_sig)

# Update return statement
old_return = '''    return normalize_provider(provider), path'''
new_return = '''    return normalize_provider(provider), path, preprocess_flag'''

content = content.replace(old_return, new_return)

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Updated parse_args signature")
EOF

python3 /tmp/update_parse_args.py
```

### 5. Update main() to Handle New Parse Args

```bash
cat > /tmp/fix_main_parse.py << 'EOF'
import re

with open('src/publish_to_web/cli.py', 'r') as f:
    content = f.read()

# Find parse_args call in main
old_parse_call = '''    try:
        provider, path_arg = parse_args(argv)
    except UsageError as exc:'''

new_parse_call = '''    try:
        provider, path_arg, preprocess_flag = parse_args(argv)
    except UsageError as exc:'''

content = content.replace(old_parse_call, new_parse_call)

with open('src/publish_to_web/cli.py', 'w') as f:
    f.write(content)

print("✓ Fixed parse_args call in main")
EOF

python3 /tmp/fix_main_parse.py
```

---

## 🎯 Test Basic Flow

### Test 1: No Flags (Auto-Retry Mode)

```bash
cd /tmp/publish-retry-tests

echo "=== Test 1: Auto-Retry Mode ==="
/home/almaz/TOOLS/publish_to_web/md_2_web.sh test-simple.md 2>&1 | grep -E "\[Info\]|\[Success\]"
```

**Expected:** Shows "Using auto-retry mode" and succeeds

### Test 2: With --preprocess flag (Direct Mode)

```bash
echo "=== Test 2: Direct Mode (with --preprocess) ==="
/home/almaz/TOOLS/publish_to_web/md_2_web.sh --preprocess standard test-simple.md 2>&1 | grep -E "\[Info\]|\[Success\]"
```

**Expected:** No auto-retry message, direct publish

### Test 3: With explicit provider

```bash
echo "=== Test 3: Explicit Provider ==="
/home/almaz/TOOLS/publish_to_web/md_2_web.sh --provider telegraph test-simple.md 2>&1 | grep -E "\[Info\]|\[Success\]"
```

**Expected:** No auto-retry, uses only Telegraph

---

## 🎯 Verification Checklist

```bash
cd /home/almaz/TOOLS/publish_to_web

# Check all modifications
commands=(
    "grep -c 'should_use_auto_retry' src/publish_to_web/cli.py"
    "grep -c 'retry_publish(content, title' src/publish_to_web/cli.py"
    "grep -c 'preprocess_flag' src/publish_to_web/cli.py"
)

for cmd in "${commands[@]}"; do
    echo "Running: $cmd"
    eval $cmd
    echo "---"
done
```

All should return count >= 1

---

## 🎯 Success Criteria

- [ ] retry_publish() is called in main()
- [ ] Auto-retry detection works
- [ ] Only auto-retries when provider == "auto" and no --preprocess
- [ ] --preprocess flag forces single attempt
- [ ] --provider flag forces single provider
- [ ] Basic publishing still works
- [ ] Auto-retry mode activates on complex files
- [ ] Ready for Card 11 (comprehensive error handling)

---

**Next Card:** ✅ Card 11 - Add Comprehensive Error Handling