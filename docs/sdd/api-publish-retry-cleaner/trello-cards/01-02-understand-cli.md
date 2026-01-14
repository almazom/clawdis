# 📖 Card 02: Understand CLI Structure

**Priority:** 🔴 Critical  | **Type:** Investigation  | **Est. Time:** 20 minutes

**Card Goal:** Deeply understand how the current CLI works before modifying it.

---

## 📋 Checklist

- [ ] Read and understand `cli.py` main flow
- [ ] Identify key functions and their responsibilities
- [ ] Understand current provider fallback logic
- [ ] Understand preprocessing invocation
- [ ] Map out where retry logic will be inserted

---

## 🎯 Tasks

### 1. Analyze Main CLI Entry Point

```bash
cd /home/almaz/TOOLS/publish_to_web

# Read the main entry point
cat << 'EOF' > /tmp/analyze_cli.py
import sys
sys.path.insert(0, 'src')

from publish_to_web import cli

# Print function signatures
import inspect
print("=== CLI Module Functions ===")
for name, obj in inspect.getmembers(cli):
    if inspect.isfunction(obj) and not name.startswith('_'):
        sig = inspect.signature(obj)
        print(f"{name}{sig}")

print("\n=== Key Functions to Understand ===")
print("1. main() - Entry point")
print("2. parse_args() - Argument parsing")
print("3. publish_with_provider() - Core publishing logic")
print("4. normalize_provider() - Provider selection")
EOF

python3 /tmp/analyze_cli.py
```

**Expected Output:** List of all public functions in cli.py

### 2. Read Current CLI Implementation

```bash
# Read the main flow (first 100 lines)
head -100 src/publish_to_web/cli.py

# Read the publish_with_provider function (around line 168)
sed -n '168,201p' src/publish_to_web/cli.py
```

**Focus on understanding:**
1. How `publish_with_provider()` currently works
2. Current fallback: Simplenote → Telegraph (lines 177-200)
3. How provider parameter is used
4. Error handling flow

### 3. Identify Key Code Sections

In `src/publish_to_web/cli.py`, find and understand:

**A. Current Provider Fallback (Lines ~177-200):**
```python
# Current logic:
try:
    # Try Simplenote
    url = publish_note(...)
    return url, warnings
except Exception as exc:
    # Fallback to Telegraph
    url = publish_telegraph_page(...)
    return url, warnings
```

**B. Where We Need to Insert Retry Logic:**
```python
# We will modify this:
def publish_with_provider(content, title, provider):
    # Add retry logic wrapper here
    # Keep existing logic as-is
    pass
```

**C. Entry Point (Lines ~203-266):**
```python
def main(argv=None):
    # Parse args → Get provider → Publish → Output JSON
    # This stays mostly the same
```

### 4. Understand Current Flow Diagram

```bash
cat > /tmp/current_flow.txt << 'EOF'
Current Flow (BEFORE our changes):
==================================

User: ./md_2_web.sh --provider auto file.md
    ↓
md_2_web.sh (bash wrapper)
    ↓
cli.py::main()
    ├── parse_args() → provider="auto", path="file.md"
    ├── read file content
    ├── extract_title()
    └── publish_with_provider(content, title, "auto")
        ├── if provider == "telegraph":
        │   └── publish_telegraph_page() → return
        └── else:
            ├── try:
            │   └── publish_note() (Simplenote)
            └── except:
                └── publish_telegraph_page() (fallback)
                    └── return url
    ↓
Output JSON with URL
EOF

cat /tmp/current_flow.txt
```

**Study this flow carefully** - you need to understand every step.

### 5. Identify Integration Points

Where will we inject retry logic?

```bash
cat > /tmp/integration_points.txt << 'EOF'
Integration Points for Retry Logic:
====================================

Option A: Wrap publish_with_provider() → CLEANEST
==================================================
- Keep publish_with_provider() EXACTLY as is
- Create new wrapper function: retry_publish()
- retry_publish() calls publish_with_provider() in a loop
- Benefits: No changes to existing logic, minimal risk

Option B: Modify publish_with_provider() internally
====================================================
- Add retry loop inside publish_with_provider()
- More invasive, touches existing working code
- Higher risk of breaking existing functionality

RECOMMENDATION: Option A (used in this SDD)
-------------------------------------------

def retry_publish(content, title, provider_preference="auto"):
    # Implement 4-stage retry chain here
    for each (provider, preprocessing) in retry_chain:
        preprocessed = run_preprocessing(content, preprocessing)
        try:
            return publish_with_provider(preprocessed, title, provider)
        except:
            continue  # Try next combination
    raise error
EOF

cat /tmp/integration_points.txt
```

---

## 🎯 Deep Dive Questions

Answer these questions to prove understanding:

### Q1: How does current provider selection work?
```bash
# Find in cli.py
grep -A 5 "def normalize_provider" src/publish_to_web/cli.py
grep -A 10 "def publish_with_provider" src/publish_to_web/cli.py | head -15
```

**Your Answer:** 
Write here: ___________________________________

### Q2: What happens when Simplenote fails?
```bash
# Find the fallback logic
sed -n '177,200p' src/publish_to_web/cli.py
```

**Your Answer:** 
Write here: ___________________________________

### Q3: Where should we insert retry logic?

**Your Answer:** 
Write here: ___________________________________

---

## 🎯 Success Criteria

- [ ] Understand current provider fallback flow
- [ ] Can explain where to insert retry logic (Option A vs B)
- [ ] Know which functions to modify
- [ ] Understand error handling patterns
- [ ] Ready to write code in Card 06-07

---

## 📚 Key Files to Study

1. **cli.py** (main file):
   - `main()` - entry point
   - `parse_args()` - argument parsing
   - `publish_with_provider()` - core logic (lines 168-200)
   - `normalize_provider()` - provider selection

2. **md_2_web.sh** (wrapper):
   - Shows how --preprocess flag is handled
   - Invokes Python CLI

3. **telegraph_publisher.py** (reference):
   - Error types Telegraph can throw
   - Helpful for error detection logic

---

## 🚨 Common Pitfalls to Avoid

❌ **Don't modify** `publish_with_provider()` internals
✅ **Do wrap it** with `retry_publish()`

❌ **Don't change** preprocessing script
✅ **Do call it** with different modes

❌ **Don't touch** Simplenote or Telegraph logic
✅ **Do call them** through existing interfaces

---

## 🎯 Example Code Structure

```python
# What you'll build (preview from Card 07):

def retry_publish(content, title, provider_preference="auto"):
    """Wrapper that implements retry logic."""
    
    # Define retry chain order (Telegraph first!)
    retry_chain = [
        ("telegraph", "standard"),
        ("telegraph", "aggressive"),
        ("simplenote", "standard"),
        ("simplenote", "aggressive"),
    ]
    
    # Try each combination
    for attempt_num, (provider, prep_mode) in enumerate(retry_chain, 1):
        try:
            # Apply preprocessing
            preprocessed = preprocess_content(content, prep_mode)
            
            # Try to publish
            url = publish_with_provider(preprocessed, title, provider)
            
            # Success! Log and return
            log_success(attempt_num, provider, prep_mode)
            return url
            
        except Exception as e:
            # Failure - log and continue to next attempt
            log_failure(attempt_num, provider, prep_mode, e)
            continue
    
    # All attempts failed
    raise PublishError("All 4 retry attempts failed")
```

---

**Next Card:** 🧪 Card 03 - Test Current Implementation