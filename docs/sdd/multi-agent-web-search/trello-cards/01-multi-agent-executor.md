# 01. Multi-Agent Executor

**SP:** 4 | **Status:** ⏳ Pending | **Priority:** High | **Tags:** feature, web-search

## Description

Create parallel execution system for 5 AI web search agents with first-success pattern.

## Requirements

### Must Have
- [ ] Spawn 5 agents in parallel using `Promise.all`
- [ ] Track individual agent status via `onStatus` callback
- [ ] First successful response triggers "winner" selection
- [ ] Continue waiting for remaining agents after first success
- [ ] Timeout per agent: 180 seconds
- [ ] Return `MultiAgentResult` with all responses
- [ ] **Quality scoring:** 1-5 stars based on response length

### Should Have
- [ ] Quality scoring based on response length
- [ ] Error aggregation from failed agents

### Nice to Have
- [ ] Retry logic for transient failures

## Implementation Details

### Interface
```typescript
interface AgentResult {
  agent: string;           // 'gemini', 'kimi', 'qwen', 'minimax', 'glm'
  agentDisplay: string;    // 'Gemini CLI', 'Kimi CLI', etc.
  success: boolean;
  response?: string;       // Full response text
  error?: string;          // Error message if failed
  durationMs: number;      // Response time in milliseconds
  quality?: number;        // 1-5 stars based on response length
}

interface MultiAgentResult {
  query: string;
  winner?: AgentResult;    // Fastest successful agent
  agents: AgentResult[];   // All 5 agents (success or fail)
  summary: string;         // AI-generated summary
  htmlReport: string;      // Full HTML report
  generatedAt: Date;
}

async function executeMultiAgentWebSearch(
  query: string,
  onStatus?: (status: string) => void
): Promise<MultiAgentResult>
```

### Quality Scoring (Stars)
```typescript
function assessQuality(response: string): number {
  if (!response || response.length < 50) return 1;  // ⭐
  if (response.length < 200) return 2;              // ⭐⭐
  if (response.length < 500) return 3;              // ⭐⭐⭐
  if (response.length < 1500) return 4;             // ⭐⭐⭐⭐
  return 5;                                          // ⭐⭐⭐⭐⭐
}
```

### Agent Config
```typescript
const AGENTS = [
  { name: 'gemini', script: 'gemini_cli_web', display: 'Gemini CLI', emoji: '⚡' },
  { name: 'kimi', script: 'kimi_cli_web', display: 'Kimi CLI', emoji: '🔍' },
  { name: 'qwen', script: 'qwen_cli_web', display: 'Qwen CLI', emoji: '🐉' },
  { name: 'minimax', script: 'minimax_cli_web', display: 'MiniMax Claude', emoji: '🧠' },
  { name: 'glm', script: 'glm_cli_web', display: 'GLM Claude', emoji: '🪄' },
];
```

### Logging (REQUIRED)
```typescript
const log = (msg: string) => console.log(`[WEB] ${msg}`);

// Launch phase
log(`🥊 Starting AI Fight: "${query}"`);
log(`⚡ Gemini CLI launched`);
log(`🔍 Kimi CLI launched`);
log(`🐉 Qwen CLI launched`);
log(`🧠 MiniMax Claude launched`);
log(`🪄 GLM CLI launched`);

// First success
log(`✅ ${winner.agentDisplay} first success (${winner.durationMs}ms)`);

// Per-agent results
log(`✅ ${agent.agentDisplay} success (${agent.durationMs}ms)`);
log(`❌ ${agent.agentDisplay} failed: ${agent.error}`);

// Completion
log(`📊 All ${completed}/${total} agents completed`);
log(`🤖 Generating AI analysis...`);
log(`📄 HTML report ready`);
```

### Error Handling Pattern
```typescript
try {
  const { stdout, stderr } = await execAsync(`"${wrapperPath}" "${query}"`, {
    timeout: 180000,  // 180 seconds
  });
  return { success: true, response: stdout + stderr };
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error)
  };
}
```

## Files to Modify
- `src/web-search/multi-agent.ts` (exists, needs updates)

## Testing
```bash
# Manual test
./scripts/ai-wrappers/parallel_web_search.sh "test query"

# Verify all 5 agents respond
# Verify first success is fast (check logs)
# Verify HTML report generated
# Verify logs match exact format above
```

## Acceptance Criteria
- [ ] All 5 agents spawn in parallel
- [ ] First success returns within 30s (usually)
- [ ] All 5 results captured (success or error)
- [ ] HTML report generated with Russian text
- [ ] No hardcoded models or API keys
- [ ] Logging matches exact format specified
- [ ] Quality scoring (1-5 stars) applied to each response

## Notes
- Use `execAsync` from `node:child_process`
- Models from `.env` only (WEB_SEARCH_GEMINI_MODEL, ANTHROPIC_ZAI_MODEL, etc.)
- All API keys from `.env` (ANTHROPIC_ZAI_API_KEY, ANTHROPIC_MINIMAX_API_KEY)
- Timeout: 180 seconds per agent (configurable via WEB_SEARCH_TIMEOUT_MS)
