# Card 07: Create gdr.sh Executor Wrapper

| Field | Value |
|-------|-------|
| **ID** | DR-07 |
| **Story Points** | 3 |
| **Depends On** | [06-inline-button.md](./06-inline-button.md) |
| **Sprint** | 3 - Execution Engine |

## User Story

> As the system, I want to execute the gdr.sh CLI and capture its output so that I can run deep research.

## Context

Read before starting:
- [requirements.md#4.3](../requirements.md) - CLI command format
- `$HOME/TOOLS/gemini_deep_research/gdr.sh --help` - CLI options

Commands:
- **Dry-run**: `./gdr.sh --dry-run --dry-run-fixture examples/sample_run --prompt "{topic}" --publish`
- **Production**: `./gdr.sh --mode stream --prompt "{topic}" --publish`

## Instructions

### Step 1: Create executor module
Create file `src/deep-research/executor.ts`:

```typescript
/**
 * Deep Research CLI executor
 * @see docs/sdd/deep-research/requirements.md#4.3
 */

import { spawn } from 'node:child_process';
import { config } from '../config/config.js';

export interface ExecuteOptions {
  topic: string;
  dryRun?: boolean;
  outputLanguage?: 'ru' | 'en' | 'auto';
}

export interface ExecuteResult {
  success: boolean;
  runId?: string;
  resultJsonPath?: string;
  error?: string;
  stdout: string;
  stderr: string;
}

/**
 * Execute deep research CLI
 * @returns Promise resolving to execution result
 */
export async function executeDeepResearch(options: ExecuteOptions): Promise<ExecuteResult> {
  const cliPath = config.deepResearch?.cliPath || '$HOME/TOOLS/gemini_deep_research/gdr.sh';
  const dryRun = options.dryRun ?? config.deepResearch?.dryRun ?? true;
  const outputLanguage = options.outputLanguage ?? config.deepResearch?.outputLanguage ?? 'auto';

  // Build command arguments
  const args: string[] = [];

  if (dryRun) {
    args.push('--dry-run');
    args.push('--dry-run-fixture', 'examples/sample_run');
  } else {
    args.push('--mode', 'stream');
  }

  args.push('--prompt', options.topic);
  args.push('--publish');

  if (outputLanguage !== 'auto') {
    args.push('--output-language', outputLanguage);
  }

  console.log(`[deep-research] Executing: ${cliPath} ${args.join(' ')}`);

  return new Promise((resolve) => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    let runId: string | undefined;
    let resultJsonPath: string | undefined;

    const proc = spawn(cliPath, args, {
      cwd: '$HOME/TOOLS/gemini_deep_research',
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (data: Buffer) => {
      const line = data.toString();
      stdout.push(line);

      // Parse JSONL events to extract run_id
      try {
        const event = JSON.parse(line.trim());
        if (event.run_id) {
          runId = event.run_id;
        }
        if (event.event === 'run.complete' && event.result) {
          resultJsonPath = event.result;
        }
      } catch {
        // Not JSON, ignore
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr.push(data.toString());
    });

    proc.on('close', (code) => {
      const success = code === 0;

      resolve({
        success,
        runId,
        resultJsonPath,
        error: success ? undefined : `Exit code: ${code}`,
        stdout: stdout.join(''),
        stderr: stderr.join(''),
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
        stdout: stdout.join(''),
        stderr: stderr.join(''),
      });
    });
  });
}
```

### Step 2: Update index.ts
Add to `src/deep-research/index.ts`:

```typescript
export { executeDeepResearch, type ExecuteOptions, type ExecuteResult } from './executor.js';
```

### Step 3: Verify build
```bash
pnpm build
```

### Step 4: Test executor manually
Create a quick test:
```bash
# Test dry-run execution
pnpm tsx -e "
import { executeDeepResearch } from './src/deep-research/executor.js';
const result = await executeDeepResearch({ topic: 'Test topic', dryRun: true });
console.log(JSON.stringify(result, null, 2));
"
```

## Acceptance Criteria

- [ ] File `src/deep-research/executor.ts` created
- [ ] `executeDeepResearch()` function exported
- [ ] Uses `dryRun` from config (defaults to `true`)
- [ ] Builds correct CLI command for dry-run vs production
- [ ] Captures stdout/stderr
- [ ] Extracts `runId` from JSONL events
- [ ] Extracts `resultJsonPath` from completion event
- [ ] Returns success/failure status
- [ ] `pnpm build` passes

## Files Created/Modified

- `src/deep-research/executor.ts` (created)
- `src/deep-research/index.ts` (modified)

## Next Card

→ [08-result-parser.md](./08-result-parser.md)
