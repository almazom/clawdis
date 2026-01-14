# Card 04: CLI Executor for Web Search

**Story Points:** 2 | **Priority:** P0 (Blocker) | **Owner:** AI Agent

## 📋 Description

Implement the execution engine that invokes the Gemini CLI tool, handles timeouts, processes results, and manages errors. This is the core execution component.

## ✅ Acceptance Criteria

- [ ] Executor implemented in `src/web-search/executor.ts`
- [ ] CLI invocation works correctly
- [ ] Timeout handling implemented (30s)
- [ ] JSON parsing with error fallback
- [ ] All error types handled
- [ ] TypeScript types correct

## 🔧 Implementation

### File: `src/web-search/executor.ts`

**Create new file:**

```typescript
/**
 * Web Search CLI Executor
 */

import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import type { WebSearchResult } from './messages.js';
import type { ExecuteResult, ExecuteOptions } from '../deep-research/executor.js';
import { formatErrorMessage } from '../infra/errors.js';

const exec = promisify(execCallback);

export interface ExecuteWebSearchOptions extends ExecuteOptions {
  cliPath?: string;
  timeoutMs?: number;
}

export interface ExecuteWebSearchResult extends ExecuteResult {
  result?: WebSearchResult;
}

/**
 * Execute web search via Gemini CLI
 */
export async function executeWebSearch(
  query: string,
  options: ExecuteWebSearchOptions = {}
): Promise<ExecuteWebSearchResult> {
  const {
    cliPath = "/home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh",
    timeoutMs = 30000,
    dryRun = false,
  } = options;
  
  if (dryRun) {
    return {
      success: true,
      runId: "dry-run-123",
      result: {
        response: "DRY RUN: Would search for: " + query,
        session_id: "dry-run-123",
        stats: {
          models: {
            "gemini-1.5": {
              api: { totalRequests: 0, totalErrors: 0 },
              tokens: { input: 0, candidates: 0, total: 0 }
            }
          }
        }
      }
    };
  }
  
  try {
    // Escape the query for shell safety
    const escapedQuery = query.replace(/["\\$`!]/g, '\\$&');
    const cmd = `${cliPath} --request "${escapedQuery}"`;
    
    const { stdout, stderr } = await exec(cmd, {
      timeout: timeoutMs,
      encoding: 'utf8',
      env: {
        ...process.env,
        // Ensure CLI can find its dependencies
        PATH: process.env.PATH,
      }
    });
    
    // Parse JSON output
    let result: WebSearchResult;
    try {
      result = JSON.parse(stdout.trim());
    } catch (parseError) {
      // Fallback: treat stdout as the response
      result = {
        response: stdout.trim(),
        session_id: `fallback-${Date.now()}`,
        stats: {
          models: { "unknown": { api: { totalRequests: 1, totalErrors: 0 }, tokens: { input: 0, candidates: 0, total: 0 } } }
        }
      };
    }
    
    return {
      success: true,
      runId: result.session_id,
      result
    };
    
  } catch (error) {
    const errorMessage = formatExecutionError(error, cliPath);
    
    return {
      success: false,
      runId: `error-${Date.now()}`,
      error: errorMessage
    };
  }
}

/**
 * Format execution errors for user display
 */
function formatExecutionError(error: unknown, cliPath: string): string {
  const errorStr = String(error);
  
  // Timeout
  if (errorStr.includes('timeout') || errorStr.includes('ETIMEOUT')) {
    return `Search timeout after 30 seconds. Query took too long to process.`;
  }
  
  // CLI not found
  if (errorStr.includes('ENOENT') || errorStr.includes('not found')) {
    return `CLI not found at ${cliPath}. Check webSearch.cliPath configuration.`;
  }
  
  // Permission denied
  if (errorStr.includes('EACCES') || errorStr.includes('Permission denied')) {
    return `CLI at ${cliPath} is not executable. Check file permissions.`;
  }
  
  // API errors (captured in stderr)
  if (errorStr.includes('API') || errorStr.includes('api')) {
    return `Gemini API error: ${errorStr}. Check API key and network connection.`;
  }
  
  // Generic error
  return `Search failed: ${formatErrorMessage(error)}`;
}
```

## 🧪 Testing

### Unit Tests: `src/web-search/executor.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { executeWebSearch } from './executor.js';
import { exec } from 'child_process';

vi.mock('child_process');

describe('executeWebSearch', () => {
  it('executes CLI with query', async () => {
    const mockExec = vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      if (callback) {
        callback(null, JSON.stringify({
          response: 'Test result',
          session_id: 'abc-123',
          stats: { models: {} }
        }), '');
      }
      return {} as any;
    });
    
    const result = await executeWebSearch('test query');
    
    expect(result.success).toBe(true);
    expect(result.result?.response).toBe('Test result');
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('web-search-by-Gemini.sh'),
      expect.objectContaining({ timeout: 30000 }),
      expect.any(Function)
    );
  });
  
  it('handles timeout error', async () => {
    const mockExec = vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      if (callback) {
        const error: any = new Error('timeout');
        error.code = 'ETIMEOUT';
        callback(error, '', '');
      }
      return {} as any;
    });
    
    const result = await executeWebSearch('test query');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
  
  it('handles CLI not found error', async () => {
    const mockExec = vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      if (callback) {
        const error: any = new Error('not found');
        error.code = 'ENOENT';
        callback(error, '', '');
      }
      return {} as any;
    });
    
    const result = await executeWebSearch('test query');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
  
  it('supports dry run mode', async () => {
    const result = await executeWebSearch('test query', { dryRun: true });
    
    expect(result.success).toBe(true);
    expect(result.result?.response).toContain('DRY RUN');
    expect(exec).not.toHaveBeenCalled();
  });
});
```

## 🎯 Verification Checklist

- [ ] CLI executes with correct arguments
- [ ] Query is properly escaped for shell safety
- [ ] Timeout works at configured value
- [ ] JSON parsing handles valid JSON
- [ ] JSON parsing fallback works for invalid JSON
- [ ] All error types return user-friendly messages
- [ ] Session ID captured from result
- [ ] Dry run mode works (no actual CLI calls)

## 🔗 Dependencies

- **Previous Cards:** 01-config-schema, 02-detection, 03-messages
- **Next Card:** 05-telegram-integration (executor needs to be called from bot)
- **External:** 
  - `/home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh` must exist
  - `gemini` CLI tool must be installed and configured

## 📝 Notes

- Always escape queries to prevent shell injection
- Test with special characters: quotes, backticks, dollars
- Dry run mode is essential for development (avoid API costs)
- Consider adding retry logic in v2 if needed