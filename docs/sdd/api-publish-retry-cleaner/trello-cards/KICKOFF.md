# API Publishing Retry with Cleaner - AI Agent Guide

## 🎯 Project Overview

**Feature:** Publishing Fallback Retry with Provider Order Reversal and Preprocessing Retry Chain

**Goal:** Automatically retry publishing to web (Telegraph/Simplenote) with different preprocessing modes when failures occur, preferring Telegraph as the primary provider.

**Key Changes:**
1. Reverse provider order: Telegraph first, Simplenote fallback
2. Add preprocessing retry: standard → aggressive
3. 4-stage retry flow: Telegraph(std) → Telegraph(agg) → Simplenote(std) → Simplenote(agg)

## 📁 Project Structure

```
docs/sdd/api-publish-retry-cleaner/
├── README.md                      # This file (overview)
├── raw-requirements.md            # Initial requirements
├── requirements.md                # Functional requirements (FRs)
├── ui-flow.md                     # User journeys & architecture
├── gaps.md                        # Gap analysis (all filled)
├── manual-e2e-test.md             # Test cases (10 tests)
└── trello-cards/
    ├── BOARD.md                   # Board overview
    ├── KICKOFF.md                 # This guide
    └── 01-12-*.md                 # 12 implementation cards
```

## 🏗️ Architecture

### Current Codebase

```
/home/almaz/TOOLS/publish_to_web/
├── md_2_web.sh                    # CLI wrapper (may need updates)
└── src/publish_to_web/
    ├── __main__.py
    ├── cli.py                     # Main CLI logic (MODIFY THIS)
    ├── publisher.py               # Simplenote logic (unchanged)
    ├── telegraph_publisher.py     # Telegraph logic (unchanged)
    └── preprocess_for_telegraph_v2.py  # Preprocessing (unchanged)
```

### Modified Flow

```
User → md_2_web.sh → cli.py → retry_publish()
                                     ↓
    ┌────────────────────────────────┼────────────────────────────────┐
    │                                │                                │
    │ Attempt 1                      │ Attempt 2                      │
    │ Telegraph + Standard           │ Telegraph + Aggressive         │
    │ CLI.publish_with_provider()    │ CLI.publish_with_provider()    │
    │                                │                                │
    └──────────────┬─────────────────┴──────────────┬─────────────────┘
                   │ Success?                        │ Success?
                   │ No → Continue                   │ No → Continue
                   ↓                                 ↓
    ┌────────────────────────────────┬────────────────────────────────┐
    │                                │                                │
    │ Attempt 3                      │ Attempt 4                      │
    │ Simplenote + Standard          │ Simplenote + Aggressive        │
    │ CLI.publish_with_provider()    │ CLI.publish_with_provider()    │
    │                                │                                │
    └──────────────┬─────────────────┴──────────────┬─────────────────┘
                   │ Success?                        │ Success?
                   │ No → Continue                   │ No → Error
                   ↓                                 ↓
            Return URL                    Return Error (all failed)
```

## 🎯 Implementation Approach

### Core Changes (Card 06-09)

**Card 07-08: Modify `cli.py`**
- Add `retry_publish()` wrapper function
- Keep `publish_with_provider()` unchanged
- Implement 4-stage retry loop
- Track attempt metadata
- Add timeout handling (30s per attempt)

**Key Code Pattern:**
```python
# In cli.py, add:
def retry_publish(content, title, provider_preference="auto"):
    """Retry publishing with different (provider, preprocessing) combinations."""
    
    # Define retry chain
    retry_chain = [
        ("telegraph", "standard"),
        ("telegraph", "aggressive"),
        ("simplenote", "standard"),
        ("simplenote", "aggressive"),
    ]
    
    # Try each combination
    for attempt_num, (provider, prep_mode) in enumerate(retry_chain, 1):
        try:
            # Preprocess with specific mode
            preprocessed = run_preprocessing(content, prep_mode)
            
            # Attempt publish
            url = publish_with_provider(preprocessed, title, provider)
            
            # Success! Return with metadata
            return {
                "ok": True,
                "url": url,
                "attempts": {
                    "total": attempt_num,
                    "successful": {
                        "provider": provider,
                        "preprocessing": prep_mode
                    }
                },
                "warnings": [f"Succeeded on attempt {attempt_num}"]
            }
            
        except Exception as e:
            # Log failure, continue to next attempt
            log_attempt_failure(attempt_num, provider, prep_mode, e)
            
            # Add warning about fallback
            warnings.append(f"Attempt {attempt_num} failed: {e}")
    
    # All attempts failed
    raise PublishError("All 4 attempts failed")
```

**Card 09: Error Detection**
- Detect Telegraph "too complex" errors specifically
- Catch HTTP 413, timeout errors
- Distinguish between recoverable and non-recoverable errors
- Auth failures = stop immediately (don't retry)

### Integration Layer (Card 10-11)

**Card 10: Wire Everything Together**
- Connect retry logic into main CLI flow
- Parse `--preprocess` flag: if present, skip retry chain
- Handle response format (include attempt metadata)

**Card 11: Error Handling**
- Add proper timeout handling (30s per attempt)
- Implement exponential backoff between attempts (2s, 4s, 8s)
- Comprehensive error messages for all failure modes

### Testing (Card 12)

**Card 12: E2E Tests** (See `manual-e2e-test.md` for details)
```bash
# Run tests manually:
cd /tmp/publish-retry-tests
./md_2_web.sh simple.md                    # Should succeed attempt 1
./md_2_web.sh complex.md                   # Should trigger retries
./md_2_web.sh --preprocess standard file.md # Override retry chain
```

## 📊 Success Metrics

### Hard Requirements
- [ ] Telegraph is tried first (can verify in logs)
- [ ] Simplenote is fallback (fallback triggered when Telegraph fails)
- [ ] 4-stage retry chain implemented
- [ ] Standard mode tried before aggressive mode
- [ ] Auth failures stop immediately (no retry)
- [ ] Timeout: 30s per attempt, 120s total
- [ ] All 10 manual E2E tests pass

### Quality Metrics
- [ ] Attempt 1 success rate >60% (Telegraph + std)
- [ ] Attempt 2 success rate >80% (Telegraph + agg)
- [ ] Attempt 3 success rate >90% (Simplenote + std)
- [ ] Total failure rate <5% (all 4 attempts fail)
- [ ] No breaking changes to existing CLI
- [ ] Backward compatibility maintained

### Code Quality
- [ ] No changes to `publisher.py` or `telegraph_publisher.py`
- [ ] Preprocessing logic unchanged
- [ ] Focus changes only in `cli.py`
- [ ] Well-documented retry logic
- [ ] Log messages clear and actionable

## 🔧 Tools You'll Use

### Commands to Run

```bash
# Setup virtualenv (if needed)
cd /home/almaz/TOOLS/publish_to_web
python3 -m venv .venv
source .venv/bin/activate

# Test CLI directly
PYTHONPATH=src python -m publish_to_web.cli --help

# Run with preprocessing
./md_2_web.sh --preprocess standard /path/to/file.md

# Run without preprocessing (backward compat)
./md_2_web.sh /path/to/file.md

# Test retry logic
cd /tmp/publish-retry-tests
./md_2_web.sh complex.md  # Watch retry behavior
```

### Debug Tips

```bash
# Check preprocessing output
./md_2_web.sh --preprocess standard --keep file.md
ls -lah *.preprocessed.*  # See what preprocessing did

# Add debug prints in cli.py
print(f"[DEBUG] Attempt {attempt_num}: {provider} + {prep_mode}")

# Monitor logs in real-time
tail -f /home/almaz/TOOLS/publish_to_web/publish.log
```

## 🚧 Edge Cases to Handle

### 1. AuthFailure → Stop Immediately
```python
# Don't retry on auth failures
if isinstance(e, AuthenticationError):
    raise  # Stop entire retry chain
```

### 2. Network Timeout → Retry Next
```python
# Do retry on network issues
if isinstance(e, TimeoutError):
    continue  # Try next combination
```

### 3. "Content Too Big" → Try Aggressive
```python
# Specifically detect this Telegraph error
if "too big" in str(e).lower() or "too large" in str(e).lower():
    # Continue to next attempt (which will be aggressive)
    continue
```

### 4. Explicit --preprocess flag
```python
# Skip retry chain if user specified mode
if user_specified_mode:
    return single_attempt_with_mode(user_specified_mode)
else:
    return retry_publish_auto()
```

## 📋 Code Review Checklist

Before marking cards complete:

- [ ] No hardcoded URLs or credentials
- [ ] Error messages are user-friendly
- [ ] Logs include helpful context (attempt number, provider, mode)
- [ ] CLI help text updated (if retry logic is visible)
- [ ] Backward compatibility: --preprocess flag still works
- [ ] Default behavior changed (no flag = auto-retry)
- [ ] Timeout handling (30s per attempt)
- [ ] No infinite loops (max 4 attempts)
- [ ] JSON response format includes attempt metadata
- [ ] README updated (if publish_to_web has one)

## 🎓 Key Learnings from Gap Analysis

From `gaps.md`:

1. **GAP-001**: Provider order confirmed - Telegraph first ✅
2. **GAP-002**: Preprocessing mandatory in retry chain ✅
3. **GAP-003**: 2 preprocessing levels (standard + aggressive) ✅
4. **GAP-004**: --preprocess flag keeps backward compat ✅
5. **GAP-005**: Logging/monitoring of each attempt ✅
6. **GAP-006**: 30s timeout per attempt, 120s total ✅

All gaps filled! Implementation is well-defined.

## 🚀 Deployment Strategy

### Phase 1: Development (Cards 06-09)
- Modify `cli.py` in place
- Test with manual test files
- Verify retry logic works

### Phase 2: Integration (Cards 10-11)
- Wire into existing pipeline
- Update any calling scripts
- Test end-to-end

### Phase 3: Validation (Card 12)
- Run all 10 E2E tests
- Verify metrics logging
- Check backward compatibility

### Phase 4: Deploy
- Monitor first few publishes
- Check logs for retry distribution
- Adjust timeouts if needed

## 📞 When This Goes Wrong

### What if retry chain is too slow?
- Current: 30s × 4 = 120s max
- Solution: Reduce to 20s per attempt = 80s total
- Monitor: Track average successful attempt number

### What if Telegraph always fails?
- Fallback to Simplenote works
- Success rate should still be >90%
- Monitor: Attempt 3/4 success rate

### What if aggressive mode strips too much?
- User can override with `--preprocess standard`
- Or explicitly use `--provider simplenote`
- Document this in help text

## 🔗 Related Files

- **SDD:** `docs/sdd/api-publish-retry-cleaner/requirements.md`
- **Tests:** `docs/sdd/api-publish-retry-cleaner/manual-e2e-test.md`
- **Code:** `/home/almaz/TOOLS/publish_to_web/src/publish_to_web/cli.py`
- **Gaps:** `docs/sdd/api-publish-retry-cleaner/gaps.md`

## ✅ Ready to Start?

**First Card:** 06-01-validate-config - Make sure you understand the codebase

**Last Card:** 06-12-e2e-test - Run all manual tests

**Expected Timeline:** ~2-3 hours for implementation + testing

**Go implement!** 🚀