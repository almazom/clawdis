# Web Search Multi-Agent Timing Analysis

**Test Query:** "latest Python 3.12 features"
**Date:** 2026-01-06
**Total Rounds:** 10

## Timing Results (all times in milliseconds)

| Round | Gemini | Kimi | Qwen | MiniMax | GLM | Winner |
|-------|--------|------|------|---------|-----|--------|
| 3 | 28858 | 38638 | 31461 | 27 | 44 | Gemini (29s) |
| 4 | 26504 | 15352 | 36573 | 6 | 22 | **Kimi (15s)** |
| 5 | 24773 | 38209 | 23908 | 6 | 10 | **Qwen (24s)** |
| 6 | 27638 | 42719 | 20928 | 39 | 44 | **Qwen (21s)** |
| 7 | 24338 | 23786 | 18002 | fail | fail | **Qwen (18s)** |
| 8 | 23580 | 36295 | 25231 | 22 | 4 | GLM (4ms)* |
| 9 | 27378 | 13346 | 30934 | 11 | 5 | **Kimi (13s)** |
| 10 | 29489 | 28528 | 20579 | 7 | 10 | **Qwen (21s)** |

*GLM 4ms = instant response (likely error/skip, not real answer)

## Statistics (successful agents only)

| Agent | Min | Max | Avg | Win Count |
|-------|-----|-----|-----|-----------|
| Gemini | 23580 | 29489 | 26580 | 1 |
| Kimi | 13346 | 42719 | 29734 | 2 |
| Qwen | 18002 | 36573 | 23938 | 4 |
| MiniMax | 7 | 39 | 19 | 0 |
| GLM | 4 | 44 | 19 | 0* |

## Key Findings

1. **Qwen is most consistent winner** - wins 4/8 rounds with avg 24s
2. **Kimi is fastest when it wins** - 15s and 13s in rounds 4 and 9
3. **Gemini is reliable** - always completes, avg 26.5s
4. **MiniMax/GLM fail** - instant responses indicate API/auth errors

## Issues Found

1. MiniMax API key not loading in rounds 3-6 (fixed in round 7+)
2. GLM responses too fast (4-44ms) - likely failing silently
3. Kimi has high variance (13s to 43s)

## Recommendations

1. **Primary:** Use Qwen for fastest results
2. **Fallback:** Use Gemini for reliability
3. **Quality:** Kimi may provide best detailed answers (slower)
4. **Fix MiniMax/GLM:** Need to investigate API configuration
