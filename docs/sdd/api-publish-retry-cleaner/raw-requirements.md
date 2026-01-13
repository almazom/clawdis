# Publishing Fallback Retry - Raw Requirements

## Current Problem

Deep research creates complex markdown files that fail when published because:
1. Telegraph API rejects files that are too complex (not too large in bytes, but the AST tree structure is too deep/complex)
2. Current "auto" provider tries Simplenote first, then falls back to Telegraph
3. Preprocessing is either ON or OFF, no retry with different modes

## Requirements from User

**Primary Change**: Reverse provider order
- First attempt: Telegraph (preferred for public sharing)
- If Telegraph fails: Fall back to Simplenote

**Secondary Change**: Retry with different preprocessing levels
- Try 1: Telegraph with standard preprocessing
- Try 2: Telegraph with aggressive preprocessing
- Try 3: Simplenote with standard preprocessing
- Try 4: Simplenote with aggressive preprocessing

**Why this order?**
- Telegraph generates clean, permanent URLs perfect for sharing
- Simplenote is the fallback when Telegraph can't handle the complexity
- Standard preprocessing preserves more formatting
- Aggressive preprocessing strips more but increases success rate

## Expected Behavior

1. All publishing attempts should cascade through the retry chain automatically
2. User doesn't need to manually specify --preprocess mode
3. Each provider/preprocess combination should have a chance to succeed
4. Final failure only after all retry options exhausted
5. Log/monitor which combinations work for future optimization

## Monitoring Goals

- Track success rate by provider + preprocessing mode
- Identify which preprocessing mode works best for which content types
- Surface metrics about publishing pipeline reliability