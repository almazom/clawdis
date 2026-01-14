# Fix Strategy: Web Search Intermittent Failures

> **Bug ID:** `WEB-SEARCH-INTERMITTENT` | **Status:** PLANNED

## Objective

Make web search more robust by:
1. Properly handling gemini CLI failures
2. Showing meaningful error messages
3. Adding retry logic for transient failures

## Fix Approach

### Primary Fix: JSON Validation + Better Error Messages

**File:** `src/web-search/executor.ts`

**Current Code (lines 79-94):**
```typescript
let jsonStr = stdout.trim();
const jsonStart = jsonStr.indexOf('{');
if (jsonStart > 0) {
  jsonStr = jsonStr.slice(jsonStart);
}
const result = JSON.parse(jsonStr);
```

**Proposed Fix:**
```typescript
let jsonStr = stdout.trim();
const jsonStart = jsonStr.indexOf('{');
if (jsonStart > 0) {
  jsonStr = jsonStr.slice(jsonStart);
}

// Validate JSON before parsing
let result;
try {
  result = JSON.parse(jsonStr);
} catch (parseError) {
  return {
    success: false,
    runId: `error-${Date.now()}`,
    error: `gemini CLI output was not valid JSON: ${jsonStr.slice(0, 200)}`,
    stdout: stdout,
    stderr: stderr
  };
}

// Validate required fields
if (!result || typeof result.response !== 'string') {
  return {
    success: false,
    runId: `error-${Date.now()}`,
    error: `Invalid response format from gemini CLI`,
    stdout: stdout,
    stderr: stderr
  };
}

return {
  success: true,
  runId: result.session_id || `web-${Date.now()}`,
  result,
  stdout: JSON.stringify(result),
  stderr: ""
};
```

### Secondary Fix: Retry Logic

```typescript
async function executeWebSearchWithRetry(
  query: string,
  options: ExecuteWebSearchOptions = {},
  maxRetries: number = 2
): Promise<ExecuteWebSearchResult> {
  let lastError: ExecuteWebSearchResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeWebSearch(query, options);
      if (result.success) return result;
      lastError = result;
    } catch (error) {
      lastError = {
        success: false,
        runId: `error-${Date.now()}`,
        error: String(error),
        stdout: "",
        stderr: String(error)
      };
    }

    if (attempt < maxRetries) {
      const delayMs = 1000 * (attempt + 1);
      console.log(`[web-search] Retry ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return lastError!;
}
```

## Files to Modify

| File | Change | Impact |
|------|--------|--------|
| `src/web-search/executor.ts` | Add JSON validation | Error handling |
| `src/web-search/executor.ts` | Add retry logic | Resilience |

## Regression Test

**Test File:** `src/web-search/executor.test.ts`

```typescript
describe('executeWebSearch error handling', () => {
  it('should handle non-JSON stdout gracefully', async () => {
    const result = await executeWebSearch('test query');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not valid JSON');
  });

  it('should retry on transient failures', async () => {
    const result = await executeWebSearch('test query');
    expect(result.success).toBe(true);
  });
});
```

## Verification Criteria

| Criterion | Method |
|-----------|--------|
| Non-JSON error shows actual error | Unit test + manual test |
| Retry logic works | Unit test |
| All existing tests pass | `pnpm test` |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Retry causes duplicate searches | Check session_id |
| Error messages too verbose | Truncate to 200 chars |

## Implementation Order

1. **Card 01:** Add regression test (TDD RED)
2. **Card 02:** Implement JSON validation (TDD GREEN)
3. **Card 03:** Add retry logic + verification (VERIFY)
