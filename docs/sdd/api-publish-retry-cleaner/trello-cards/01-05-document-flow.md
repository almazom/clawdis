# 📝 Card 05: Document Existing Flow

**Priority:** 🟢 Optional  | **Type:** Documentation  | **Est. Time:** 15 minutes

**Card Goal:** Create clear documentation of current flow to reference during implementation.

---

## 📋 Checklist

- [ ] Write summary of current implementation
- [ ] Create flow diagram (ASCII art is fine)
- [ ] Document key decision points
- [ ] List current limitations
- [ ] Prepare for implementation phase

---

## 🎯 Tasks

### 1. Summarize Current Implementation

```bash
cat > /tmp/current_implementation.md << 'EOF'
# Current Implementation Summary

## How It Works Now (Before Our Changes)

### 1.1 Entry Point
- User runs: `./md_2_web.sh [flags] file.md`
- Bash wrapper (`md_2_web.sh`) handles --preprocess flag
- Invokes Python CLI: `python -m publish_to_web.cli [flags] file.md`

### 1.2 CLI Flow (`cli.py`)

```
main()
├── parse_args() → Extract provider, path
├── read_file() → Read markdown content
├── extract_title() → Get title from content
├── publish_with_provider() → Choose and publish
│   ├── if provider == "telegraph":
│   │   └── publish_telegraph_page() → Telegraph API
│   └── else: (auto or simplenote)
│       ├── try: publish_note() → Simplenote API
│       └── except: publish_telegraph_page() → Fallback to Telegraph
└── emit_json() → Return JSON result
```

### 1.3 Provider Order (Current)
- Primary: Simplenote (when provider=auto or simplenote)
- Fallback: Telegraph (when Simplenote fails)
- Direct: Telegraph (when provider=telegraph)

**Problem:** Telegraph never fails over to Simplenote (reverse direction missing)

### 1.4 Preprocessing (Current)
- Handled by bash wrapper (`md_2_web.sh`)
- Modes: off, minimal, standard, aggressive
- Only ONE preprocessing mode used per run
- No retry with different modes

## Current Limitations

1. **One-shot publishing**: Single attempt only
2. **Limited fallback**: Simplenote → Telegraph, but not reverse
3. **No retry**: When something fails, it fails permanently
4. **No preprocessing levels**: Can't try standard then aggressive
5. **Poor UX for complex files**: Users need to manually retry with different flags

## Real-World Problem

See: `raw-requirements.md`

Deep research creates complex markdown with:
- Nested HTML structure
- Large AST trees
- Telegraph rejects with "Content is too big"
- Current system gives up immediately
- User has to run manually: `./md_2_web.sh --preprocess aggressive file.md`

## What We'll Change

See: `requirements.md` and `ui-flow.md`

### New Flow (After Our Changes)

```
User: ./md_2_web.sh file.md
    ↓
main() with auto-retry enabled
├── Parse args (no --preprocess flag)
├── Enable auto-retry mode
├── retry_publish() ← NEW FUNCTION
│   ├── Attempt 1: Telegraph + standard
│   ├── Attempt 2: Telegraph + aggressive
│   ├── Attempt 3: Simplenote + standard
│   └── Attempt 4: Simplenote + aggressive
└── Return result metadata with attempt info
```

### Key Improvements

1. **Reverse provider order**: Telegraph first (preferred)
2. **Automatic retry**: 4-stage retry chain
3. **Smart preprocessing**: Try standard, then aggressive
4. **Better UX**: "Just works" for complex files
5. **Observable**: Logs show which attempt succeeded
6. **Backward compatible**: --preprocess flag still works
EOF

cat /tmp/current_implementation.md
cp /tmp/current_implementation.md /tmp/current_implementation_reference.md
```

**Expected Output:** Clear markdown document summarizing current behavior

### 2. Create Flow Diagram

```bash
cat > /tmp/ascii_flow.txt << 'EOF'
CURRENT FLOW (BEFORE):
======================

┌─────────────────────────────────────────────┐
│  User: ./md_2_web.sh [flags] file.md       │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  md_2_web.sh (bash wrapper)                │
│  • Handles --preprocess flag               │
│  • Calls Python CLI                        │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  cli.py::main()                            │
│  • parse_args()                            │
│  • Read file                               │
│  • extract_title()                         │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  publish_with_provider()                   │
│  • provider == "telegraph" → Telegraph API │
│  • provider == "simplenote" → Simplenote   │
│  • provider == "auto" → Try Simplenote,    │
│                         then Telegraph ⬅   │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  emit_json()                               │
│  • Return result or error                  │
└─────────────────────────────────────────────┘

LEGEND:
=======
┌───┐   Function/Module
│   │   
───   Flow
⬅    Current provider order (backwards)

NEW FLOW (AFTER):
=================

┌─────────────────────────────────────────────┐
│  User: ./md_2_web.sh file.md               │
│  (no --preprocess flag = auto-retry)       │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  cli.py::main()                            │
│  • Detected: no --preprocess flag          │
│  • Enable: AUTO-RETRY mode                 │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  NEW: retry_publish()                      │
│  • Wrapper around publish_with_provider()  │
│  • Implements 4-stage retry chain          │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  Attempt 1: Telegraph + standard ← NEW!    │
│  • Preprocess with standard mode           │
│  • Call publish_with_provider()            │
│  • Success? → Return result ➜             │
│  • Fail?    → Continue                     │
└──────────────────┬──────────────────────────┘
                   ↓ (if attempt 1 failed)
┌─────────────────────────────────────────────┐
│  Attempt 2: Telegraph + aggressive ← NEW!  │
│  • Preprocess with aggressive mode         │
│  • Call publish_with_provider()            │
│  • Success? → Return result ➜             │
│  • Fail?    → Continue                     │
└──────────────────┬──────────────────────────┘
                   ↓ (if attempt 2 failed)
┌─────────────────────────────────────────────┐
│  Attempt 3: Simplenote + standard ← NEW!   │
│  • Switch provider                         │
│  • Call publish_with_provider()            │
│  • Success? → Return result ➜             │
│  • Fail?    → Continue                     │
└──────────────────┬──────────────────────────┘
                   ↓ (if attempt 3 failed)
┌─────────────────────────────────────────────┐
│  Attempt 4: Simplenote + aggressive ← NEW! │
│  • Last resort                             │
│  • Call publish_with_provider()            │
│  • Success? → Return result ➜             │
│  • Fail?    → Raise error ❌               │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  emit_json()                               │
│  • Include: attempt metadata ✨ NEW!      │
│  • Include: retry attempts made            │
└─────────────────────────────────────────────┘
EOF

cat /tmp/ascii_flow.txt
```

---

## 🎯 Integration Points

### From Flow Analysis, Identify:

**Files to Modify:**
1. `src/publish_to_web/cli.py` - Main changes
   - Add `retry_publish()` function (new)
   - Keep `publish_with_provider()` unchanged
   - Modify `main()` to detect auto-retry mode

**Files to Keep Unchanged:**
2. `src/publish_to_web/publisher.py` - No changes
3. `src/publish_to_web/telegraph_publisher.py` - No changes
4. `md_2_web.sh` - Minor changes only (if needed)

**Why This Matters:**
- Minimal risk (don't touch working code)
- Easy to test (isolated changes)
- Easy to rollback (just remove wrapper)
- Clear separation of concerns

---

## 🎯 Current Code Snippets to Reference

### Key Function: publish_with_provider()

```python
# Location: cli.py, lines ~168-200
def publish_with_provider(content, title, provider):
    """Publish with provider (Telegraph or Simplenote)."""
    warnings = []
    if provider == "telegraph":
        access_token, author_name, author_url = get_telegraph_config()
        url = publish_telegraph_page(
            content, title, access_token, author_name, author_url
        )
        return url, warnings
    
    try:  # Try Simplenote
        email = require_env("SIMPLENOTE_EMAIL")
        password = require_env("SIMPLENOTE_PASSWORD")
        url = publish_note(content, email, password)
        return url, warnings
    except Exception as exc:
        if provider == "simplenote":
            raise
        # Fallback to Telegraph
        url = publish_telegraph_page(...)
        warnings.append("Fell back to Telegraph.")
        return url, warnings
```

**Observation:** This function is PERFECT as-is. We'll wrap it, not modify it.

### Key Function: main()

```python
# Location: cli.py, lines ~203-266
def main(argv=None):
    # ... parse args, read file, extract title ...
    
    try:
        title = extract_title(content, path.name)
        published_url, provider_warnings = publish_with_provider(
            content, title, provider
        )
        diagnostics = diagnostics_to_dict(diagnose_url(published_url, title))
    except SimplenoteLoginFailed as exc:
        emit_error(str(exc), 3)
        return 3
    except PublishError as exc:
        emit_error(str(exc), 3)
        return 3
    except Exception as exc:
        emit_error(f"Unexpected error: {exc}", 3)
        return 3
    
    # Success
    payload = {
        "ok": True,
        "url": published_url,
        "diagnostics": diagnostics,
        "warnings": warnings,
    }
    emit_json(payload)
    return 0
```

**Modification Point:** We'll detect "auto-retry" mode and call `retry_publish()` instead of `publish_with_provider()`.

---

## 🎯 Implementation Strategy

### Phase 1: Build Wrapper (Cards 06-08)

```python
# Step 1: Create retry_publish() function
# Step 2: Implement 4-stage retry logic
# Step 3: Add preprocessing integration
# Verify: Wrapper works independently
```

### Phase 2: Wire It Up (Card 10)

```python
# Step 4: In main(), detect auto-retry mode
if use_auto_retry_mode(provider, preprocess_flag):
    url = retry_publish(content, title, provider)
else:
    url = publish_with_provider(content, title, provider)
# Verify: Both modes work
```

### Phase 3: Polish (Card 09)

```python
# Step 5: Add error detection
# Step 6: Add timeout handling
# Step 7: Add comprehensive logging
# Verify: Error handling is robust
```

---

## 🎯 Success Criteria

- [ ] Written summary of current implementation
- [ ] Created flow diagram showing before/after
- [ ] Identified integration points
- [ ] Understood where to make changes
- [ ] Prepared for implementation phase

---

## 📚 Deliverables

**Files Created:**
- `/tmp/current_implementation_reference.md` - Keep for reference during implementation
- `/tmp/ascii_flow.txt` - Shows before/after flow

**Use These During:** Cards 06-12

---

**Next Phase:** 🧱 Core Implementation (Cards 6-9)