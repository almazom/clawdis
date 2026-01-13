# Reproduction Case: Web Search Intermittent Failures

> **Bug ID:** `WEB-SEARCH-INTERMITTENT` | **Status:** IN_PROGRESS

## Objective

Create automated reproduction to verify the bug exists and test the fix.

## Hypothesis

The bug occurs when `gemini CLI` fails (non-zero exit code) and the shell script outputs error text instead of JSON. The TypeScript executor then fails to parse this error text as JSON.

## Reproduction Steps

### Step 1: Direct Shell Script Test

```bash
# Navigate to project
cd /home/almaz/zoo_flow/clawdis

# Test with a query that might fail
./scripts/web_search_with_gemini.sh "hello world" 2>&1
```

### Step 2: Simulate gemini CLI Failure

```bash
# Create a mock script that mimics gemini CLI failure
cat > /tmp/mock-gemini-fail.sh << 'EOF'
#!/bin/bash
echo "Error: gemini CLI failed with exit code 10" >&2
exit 10
EOF
chmod +x /tmp/mock-gemini-fail.sh

# Temporarily override gemini in PATH
export PATH="/tmp:$PATH"

# Run web search
./scripts/web_search_with_gemini.sh "test query"
```

### Step 3: Verify Error Output

```bash
# Run the script and capture output
./scripts/web_search_with_gemini.sh "test query" 2>&1 | tee output.log

# Expected: Error text, not JSON
# "Error: gemini CLI failed with exit code 10"
```

### Step 4: Check Executor Behavior

```bash
# Run executor test
node --input-type=module << 'EOF'
import { executeWebSearch } from './src/web-search/executor.js';

const result = await executeWebSearch("test query", { timeoutMs: 30000 });
console.log("Success:", result.success);
console.log("Error:", result.error);
console.log("Run ID:", result.runId);
EOF
```

## Expected vs Actual Behavior

| Scenario | Expected Output | Actual Output |
|----------|----------------|---------------|
| gemini succeeds | Valid JSON with results | Valid JSON |
| gemini fails | Structured error message | Generic "Ошибка поиска" |

## Automated Reproduction Script (ARC)

```bash
#!/bin/bash
# reproduce-web-search-bug.sh

echo "=== Reproducing WEB-SEARCH-INTERMITTENT ==="

# Test executor output
node --input-type=module -e "
import { executeWebSearch } from './src/web-search/executor.js';
const r = await executeWebSearch('hello world');
console.log('Run ID:', r.runId);
console.log('Success:', r.success);
console.log('Error:', r.error);
"

echo ""
echo "=== Bug Pattern ==="
echo "If Run ID starts with 'error-' and Success is false, bug is reproduced."
```

## Test Queries

| Query | Expected | Notes |
|-------|----------|-------|
| `hello world` | FAIL | Simple query |
| `git flow principles` | PASS | Complex query |
| `weather today` | UNKNOWN | Time-sensitive |

## Reproduction Rate

- [ ] Run 10 times with various queries
- [ ] Document success/failure for each
- [ ] Identify patterns

## Next Steps

1. [ ] Run reproduction script
2. [ ] Verify bug is reproducible
3. [ ] Document exact error messages
4. [ ] Proceed to root cause analysis
