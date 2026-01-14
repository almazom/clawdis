# Publishing Fallback Retry - Functional Requirements

> Status: IN_PROGRESS | Last updated: 2026-01-04

## 1. Provider Order Reversal

### 1.1 Telegraph as Primary Provider
- System MUST attempt Telegraph first in auto mode
- Telegraph is preferred for generating clean, public URLs
- User-transparent change (no CLI parameter changes needed)

### 1.2 Simplenote as Fallback
- System MUST fall back to Simplenote when Telegraph fails
- Fallback triggers on Telegraph API errors (including "too complex" errors)
- Maintain original Simplenote behavior as last resort

### 1.3 Provider Selection Logic
- **GAP-001**: Provider order is confirmed at 100% - Telegraph first, Simplenote second
- If `--provider simplenote` is explicitly set, do not try Telegraph
- If `--provider telegraph` is explicitly set, do not try Simplenote
- If `--provider auto` (default), use retry chain: Telegraph → Simplenote

---

## 2. Preprocessing Retry Chain

### 2.1 Standard Preprocessing Mode (Attempt 1)
- System MUST try standard preprocessing first for each provider
- Standard mode: Convert HTML to markdown where possible
- Preserves formatting better than aggressive mode
- Default starting point for all retry attempts

### 2.2 Aggressive Preprocessing Mode (Attempt 2)
- System MUST try aggressive preprocessing if standard fails
- Aggressive mode: Remove ALL HTML tags
- Last resort preprocessing that strips most formatting
- Higher success rate for HTML-heavy content

### 2.3 Four-Stage Retry Flow
Based on **GAP-003** decision (2 preprocessing levels, 2 providers):
1. **Telegraph + standard** - Best case scenario (clean URLs, good formatting)
2. **Telegraph + aggressive** - Strip HTML, keep Telegraph if possible
3. **Simplenote + standard** - Switch provider, try standard preprocessing
4. **Simplenote + aggressive** - Last resort (reliable provider, stripped content)

### 2.4 Preprocessing Override
Based on **GAP-004** decision: Keep --preprocess parameter as override
- If `--preprocess` specified, skip retry chain and use that mode only
- If `--preprocess off`, disable preprocessing completely (backward compatible)
- If `--preprocess minimal`, skip minimal (not useful in retry chain)
- Default (no flag): Auto-retry with all 4 combinations

---

## 3. Error Detection and Retry Logic

### 3.1 Telegraph "Too Complex" Detection
- System MUST detect Telegraph API "too complex" errors specifically
- Error patterns to catch:
  - "File too large" (error code from Telegraph API)
  - "Content is too big" (Telegraph structure limit)
  - Any HTTP 413 or specific Telegraph error codes
- Trigger immediate retry with next preprocessing level or provider

### 3.2 Generic Error Handling
- System SHOULD catch all publishing exceptions
- Network errors, auth errors, API errors all trigger retry
- Log each failure with provider + preprocessing combination
- Only give up after all 4 combinations exhausted

### 3.3 Timeout Handling
Based on **GAP-006** decision: Add 30s timeout per attempt
- Each API call (Telegraph or Simplenote) gets 30 second timeout
- Early abort for network failures
- Total maximum time: 120 seconds (4 attempts × 30s)
- Log timeout events for monitoring

---

## 4. Logging and Monitoring

### 4.1 Attempt Logging
Based on **GAP-005** decision: Track each retry attempt
- Log every combination tried with:
  - Provider name (telegraph/simplenote)
  - Preprocessing mode (standard/aggressive)
  - Success/failure status
  - Time taken (ms)
  - Error message (if failed)
- Log level: INFO for attempts, DEBUG for details

### 4.2 Success Rate Metrics
- Track overall success rate: successful publishes / total attempts
- Track success rate by (provider, preprocessing) combination
- Track average number of retries before success
- Store metrics in structured format (JSON logs)

### 4.3 Failure Mode Tracking
- Categorize failures by stage in retry chain
- Count which stage succeeds most often
- Identify if specific content types consistently fail at certain stages
- Log will help optimize retry order in future

---

## 5. Non-Functional Requirements

### 5.1 Performance

#### 5.1.1 Total Timeout
- **SLA**: Max 120 seconds (4 attempts × 30s timeout each)
- **Expected**: Most successful publishes complete in 1-2 attempts (30-60s)
- Early success on first attempt: ~20s typical

#### 5.1.2 Responsiveness
- User gets feedback after first attempt (even if it fails)
- Progress indicator or stage logging visible
- No silent failures or hanging

### 5.2 Error Handling

#### 5.2.1 Retry Logic
- Retry with exponential backoff between attempts (2s, 4s, 8s)
- Max 4 retry attempts (our 4-stage flow)
- Only retry on recoverable errors (network, API limits)
- No retry on authentication failures (immediate stop)

#### 5.2.2 Final Error Message
- If all 4 attempts fail, show comprehensive error
- Include summary: "Tried Telegraph(standard, aggressive) → Simplenote(standard, aggressive) - all failed"
- Show last error message for debugging

### 5.3 Logging

#### 5.3.1 Log Level
- INFO: Each attempt start/end, final result
- DEBUG: Request/response details, preprocessing output
- WARNING: Individual attempt failures (before giving up)
- ERROR: All retries exhausted, complete failure

#### 5.3.2 Log Location
- Follow existing logging from publish_to_web.cli
- To stderr for CLI tool (current behavior)
- Structured JSON logs for metrics collection

---

## 6. Configuration

### 6.1 CLI Arguments

No new CLI arguments needed. Reuse existing:

```bash
# Default: Auto retry with all 4 combinations
./md_2_web.sh report.md

# Override: Force specific preprocessing mode
./md_2_web.sh --preprocess standard report.md
./md_2_web.sh --preprocess aggressive report.md
./md_2_web.sh --preprocess off report.md
```

### 6.2 Environment Variables

No new environment variables. Existing ones continue to work:

| Env Variable | Usage | Required/Optional |
|--------------|-------|-------------------|
| `SIMPLENOTE_EMAIL` | Simplenote authentication | Required for Simplenote |
| `SIMPLENOTE_PASSWORD` | Simplenote authentication | Required for Simplenote |
| `TELEGRAPH_ACCESS_TOKEN` | Telegraph authentication | Required for Telegraph |
| `TELEGRAPH_AUTHOR_NAME` | Page author metadata | Optional |
| `TELEGRAPH_AUTHOR_URL` | Page author link | Optional |

### 6.3 Behavior Flags (No Config File)

No config file changes needed. All logic is in CLI layer:
- Default: `--provider auto` (now with retry logic)
- Explicit provider skips retry chain:
  - `--provider telegraph` only tries Telegraph
  - `--provider simplenote` only tries Simplenote
- Explicit `--preprocess` skips retry chain and uses only that mode

---

## 7. References

### 7.1 Related Features
- Existing `/home/almaz/TOOLS/publish_to_web/` implementation
- Deep research publishing pipeline that triggers this
- Existing `--preprocess` parameter (needs to be extended)

### 7.2 Key Files to Modify
- `/home/almaz/TOOLS/publish_to_web/md_2_web.sh` - Add retry logic wrapper
- `/home/almaz/TOOLS/publish_to_web/src/publish_to_web/cli.py` - Implement retry chain
- `/home/almaz/zoo_flow/clawdis/src/cli/publish.ts` - If calling md_2_web.sh directly

### 7.3 Monitoring Integration
- Logs should feed into existing monitoring systems
- Success metrics should be queryable (grep logs for patterns)
- Can add Prometheus metrics in future iteration if needed