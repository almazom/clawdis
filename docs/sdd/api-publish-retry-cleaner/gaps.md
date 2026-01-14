# Publishing Fallback Retry - Gap Analysis

> Status: GAPS_FILLED | Last updated: 2026-01-04

## Summary

Total gaps: 6
Filled: 6
Remaining: 0

## Interview Results

### GAP-001: Which publishing providers should we support?

**Question:** Should we keep supporting both Simplenote and Telegraph, or drop one?

**Decision:** Keep both providers

**Confidence:** 100%

**Rationale:** 
- Telegraph provides clean, permanent URLs ideal for public sharing
- Simplenote acts as reliable fallback when Telegraph fails
- Both serve different purposes and complement each other

**Implementation Notes:**
- Primary: Telegraph (preferred for public, clean URLs)
- Fallback: Simplenote (reliable, handles complex content)

---

### GAP-002: Should we always try preprocessing?

**Question:** Should preprocessing be mandatory or remain optional?

**Decision:** Preprocessing should be mandatory in the retry chain

**Confidence:** 100%

**Rationale:**
- Raw markdown often fails with Telegraph due to HTML tags or complex structure
- Preprocessing significantly improves success rate
- Retry chain allows trying different preprocessing levels automatically

**Implementation Notes:**
- Try 1: Telegraph + standard preprocessing
- Try 2: Telegraph + aggressive preprocessing
- Try 3: Simplenote + standard preprocessing
- Try 4: Simplenote + aggressive preprocessing

---

### GAP-003: How many retry levels?

**Question:** How many preprocessing modes should we try?

**Decision:** Start with 2 levels: standard → aggressive

**Confidence:** 95%

**Rationale:**
- Standard: Preserves formatting (converts HTML to markdown where possible)
- Aggressive: Strips all HTML tags (last resort for HTML-heavy files)
- Minimal doesn't add value in retry chain (it's only critical fixes)
- Off mode has no place in retry chain (will fail often)

**Implementation Notes:**
- Each provider gets 2 tries (standard, then aggressive)
- 4 total attempts in complete retry chain

---

### GAP-004: How to handle backward compatibility?

**Question:** What happens to existing --preprocess parameter?

**Decision:** Keep --preprocess as override, default to "auto-retry"

**Confidence:** 100%

**Rationale:**
- Allow users to force specific preprocessing mode if needed
- Default behavior becomes smart retry chain
- --preprocess off would disable retry chain (backward compatible)

**Implementation Notes:**
- If --preprocess is specified, skip retry chain and use that mode
- If no --preprocess flag, use auto-retry with all 4 combinations

---

### GAP-005: What telemetry/monitoring to add?

**Question:** What metrics should we collect from this retry flow?

**Decision:** Track success rate by (provider, preprocessing) combination

**Confidence:** 100%

**Rationale:**
- Identify which combinations are most effective
- Optimize which modes to try first based on historical data
- Surface pipeline reliability metrics

**Implementation Notes:**
- Log each attempt: provider, preprocessing mode, success/failure, time
- Track percentage of successes by combination
- Track average number of retries before success

---

### GAP-006: Should we add time limits?

**Question:** Should we add timeouts or max retry limits?

**Decision:** Add reasonable timeout per attempt (30s)

**Confidence:** 90%

**Rationale:**
- Feedback on which stage fails (Telegraph vs Simplenote) is valuable
- Don't waste time on a completely dead provider
- 30s per attempt gives 120s max total (4 attempts)

**Implementation Notes:**
- Each API call gets 30s timeout
- Early abort if network appears down
- Total timeout: 2 minutes max (reasonable for publishing)

---

## Decisions Based on Project Analysis

Analyzed existing patterns from:
- `/home/almaz/TOOLS/publish_to_web/md_2_web.sh` (main script)
- `/home/almaz/TOOLS/publish_to_web/src/publish_to_web/cli.py` (publisher logic)
- `/home/almaz/TOOLS/publish_to_web/src/publish_to_web/telegraph_publisher.py` (Telegraph API)
- Existing `--preprocess` parameter implementation

Key pattern alignments:

1. **Retry Chain Pattern**: Already used for Simplenote→Telegraph fallback
   - Extend to include preprocessing modes
   - Try Telegraph first (reverse current order)

2. **CLI Parameter Pattern**: `--preprocess` already exists
   - Keep as override for manual control
   - New "auto" mode becomes default with retry logic

3. **Error Handling Pattern**: Try/catch with fallback already implemented
   - Extend to handle Telegraph failures specifically
   - Add detection for "too complex" Telegraph errors

4. **Configuration Pattern**: No new config needed, all logic in CLI
   - Keep existing environment variables (SIMPLENOTE_*, TELEGRAPH_*)
   - No new external dependencies