# Card 08: Parse result.json for Delivery

| Field | Value |
|-------|-------|
| **ID** | DR-08 |
| **Story Points** | 2 |
| **Depends On** | [07-executor.md](./07-executor.md) |
| **Sprint** | 3 - Execution Engine |

## User Story

> As the system, I want to parse the result.json from deep research so that I can extract summary and publish URL for delivery.

## Context

Read before starting:
- [requirements.md#4.4](../requirements.md) - JSON fields to extract
- Sample result.json structure in requirements

Fields to extract:
```
agent_summary.summary_bullets[]
agent_summary.short_answer_summary_2_initial_request
agent_summary.opinion
publish.url
```

## Instructions

### Step 1: Create parser module
Create file `src/deep-research/parser.ts`:

```typescript
/**
 * Deep Research result parser
 * @see docs/sdd/deep-research/requirements.md#4.4
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DeepResearchResult } from './messages.js';

interface ResultJson {
  run_id: string;
  status: string;
  prompt: string;
  agent_summary?: {
    summary_bullets?: string[];
    short_answer_summary_2_initial_request?: string;
    opinion?: string;
  };
  publish?: {
    ok?: boolean;
    url?: string;
  };
}

/**
 * Parse result.json file and extract delivery data
 * @param resultJsonPath - Path to result.json (relative or absolute)
 * @param basePath - Base path for relative paths
 */
export async function parseResultJson(
  resultJsonPath: string,
  basePath = '$HOME/TOOLS/gemini_deep_research'
): Promise<DeepResearchResult | null> {
  try {
    // Resolve path
    const fullPath = resultJsonPath.startsWith('/')
      ? resultJsonPath
      : join(basePath, resultJsonPath);

    const content = await readFile(fullPath, 'utf-8');
    const result: ResultJson = JSON.parse(content);

    // Validate required fields
    if (!result.agent_summary) {
      console.error('[deep-research] Missing agent_summary in result.json');
      return null;
    }

    if (!result.publish?.url) {
      console.error('[deep-research] Missing publish.url in result.json');
      return null;
    }

    return {
      summaryBullets: result.agent_summary.summary_bullets || [],
      shortAnswer: result.agent_summary.short_answer_summary_2_initial_request || '',
      opinion: result.agent_summary.opinion || '',
      publishUrl: result.publish.url,
    };
  } catch (error) {
    console.error('[deep-research] Failed to parse result.json:', error);
    return null;
  }
}

/**
 * Build result.json path from run_id
 */
export function getResultJsonPath(runId: string): string {
  return `runs/${runId}/result.json`;
}
```

### Step 2: Update index.ts
Add to `src/deep-research/index.ts`:

```typescript
export { parseResultJson, getResultJsonPath } from './parser.js';
```

### Step 3: Verify build
```bash
pnpm build
```

### Step 4: Test parser with sample file
```bash
# Run dry-run to generate sample result.json
cd $HOME/TOOLS/gemini_deep_research
./gdr.sh --dry-run --dry-run-fixture examples/sample_run --prompt "Test" --publish

# Check the generated result.json
cat runs/*/result.json | head -50
```

### Step 5: Test parser module
```bash
pnpm tsx -e "
import { parseResultJson } from './src/deep-research/parser.js';
// Use latest run
const result = await parseResultJson('runs/20260102_100310_dry-run-test-respond-in-russian/result.json');
console.log(JSON.stringify(result, null, 2));
"
```

## Acceptance Criteria

- [ ] File `src/deep-research/parser.ts` created
- [ ] `parseResultJson()` reads and parses result.json
- [ ] Extracts `summaryBullets` array
- [ ] Extracts `shortAnswer` string
- [ ] Extracts `opinion` string
- [ ] Extracts `publishUrl` string
- [ ] Returns `null` on error (doesn't throw)
- [ ] Handles relative and absolute paths
- [ ] `pnpm build` passes

## Files Created/Modified

- `src/deep-research/parser.ts` (created)
- `src/deep-research/index.ts` (modified)

## Next Card

→ [09-result-delivery.md](./09-result-delivery.md)
