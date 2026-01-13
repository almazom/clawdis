# 04. Testing & Verification

**SP:** 4 | **Status:** ⏳ Pending | **Priority:** High | **Tags:** test, qa

## Description

Comprehensive testing of multi-agent web search functionality.

## Requirements

### Must Have
- [ ] Unit tests for multi-agent executor
- [ ] Integration test for `/web` command
- [ ] Manual E2E test cases
- [ ] Error handling test cases
- [ ] Logging verification tests

### Should Have
- [ ] Load test (multiple concurrent requests)
- [ ] Timeout handling test

### Nice to Have
- [ ] Performance benchmarks

## Test Cases

### Unit Tests
```typescript
// src/web-search/multi-agent.test.ts

describe('Multi-Agent Executor', () => {
  it('spawns all 5 agents in parallel', async () => {
    const result = await executeMultiAgentWebSearch('test query');
    expect(result.agents).toHaveLength(5);
  });

  it('returns first success as winner', async () => {
    const result = await executeMultiAgentWebSearch('test query');
    expect(result.winner).toBeDefined();
    expect(result.winner.success).toBe(true);
  });

  it('includes HTML report with Russian text', async () => {
    const result = await executeMultiAgentWebSearch('test query');
    expect(result.htmlReport).toContain('AI Бой');
    expect(result.htmlReport).toContain('Победитель');
  });

  it('handles agent failures gracefully', async () => {
    const result = await executeMultiAgentWebSearch('test query');
    const failed = result.agents.filter(a => !a.success);
    expect(result.agents.length).toBe(5);
  });

  it('calculates quality scores (1-5 stars)', async () => {
    const result = await executeMultiAgentWebSearch('test query');
    result.agents.forEach(agent => {
      if (agent.success) {
        expect(agent.quality).toBeGreaterThanOrEqual(1);
        expect(agent.quality).toBeLessThanOrEqual(5);
      }
    });
  });

  it('logs all required messages', async () => {
    const logs: string[] = [];
    await executeMultiAgentWebSearch('test query', (status) => logs.push(status));

    expect(logs.some(l => l.includes('Starting AI Fight'))).toBe(true);
    expect(logs.some(l => l.includes('first success'))).toBe(true);
    expect(logs.some(l => l.includes('completed'))).toBe(true);
  });
});
```

### Integration Tests
```typescript
// src/telegram/bot.web-search.test.ts

describe('Bot /web Command', () => {
  it('publishes first success immediately', async () => {
    // Mock fast agent
    // Verify response sent within 30s
  });

  it('sends HTML report via publish_me', async () => {
    // Verify publish_me called with html_report
  });

  it('handles duplicate requests', async () => {
    // Verify second /web blocked
  });

  it('formats message with stars and timing', async () => {
    // Verify format: "🌐 **AGENT** ⭐⭐⭐"
    // Verify timing in message
  });

  it('handles all agents failing', async () => {
    // Mock all agents to fail
    // Verify error message
  });
});
```

### Logging Verification Tests
```typescript
describe('Logging Format', () => {
  it('logs launch phase with correct emojis', async () => {
    const logs: string[] = [];
    await executeMultiAgentWebSearch('test', (s) => logs.push(s));

    expect(logs.some(l => l.includes('🥊 Starting AI Fight'))).toBe(true);
    expect(logs.some(l => l.includes('⚡ Gemini CLI'))).toBe(true);
    expect(logs.some(l => l.includes('🔍 Kimi CLI'))).toBe(true);
    expect(logs.some(l => l.includes('🐉 Qwen CLI'))).toBe(true);
    expect(logs.some(l => l.includes('🧠 MiniMax Claude'))).toBe(true);
    expect(logs.some(l => l.includes('🪄 GLM Claude'))).toBe(true);
  });

  it('logs first success with correct format', async () => {
    const logs: string[] = [];
    await executeMultiAgentWebSearch('test', (s) => logs.push(s));

    expect(logs.some(l => l.includes('✅') && l.includes('first success'))).toBe(true);
    expect(logs.some(l => l.includes('ms'))).toBe(true);
  });

  it('logs completion', async () => {
    const logs: string[] = [];
    await executeMultiAgentWebSearch('test', (s) => logs.push(s));

    expect(logs.some(l => l.includes('📊 All'))).toBe(true);
    expect(logs.some(l => l.includes('completed'))).toBe(true);
  });
});
```

### Manual E2E Tests

| # | Test | Expected | Status |
|---|------|----------|--------|
| TC01 | `/web Python features` | First response < 30s | ⏳ |
| TC02 | `/web что такое git flow` | Russian response | ⏳ |
| TC03 | `/web` (empty) | Error message | ⏳ |
| TC04 | Double `/web` | Block duplicate | ⏳ |
| TC05 | All 5 agents respond | HTML report complete | ⏳ |
| TC06 | One agent fails | Continue with 4 | ⏳ |
| TC07 | All agents fail | Error message | ⏳ |
| TC08 | Log format verification | `[WEB]` prefix present | ⏳ |
| TC09 | Stars display | ⭐⭐⭐ shown | ⏳ |
| TC10 | Technical message | `🎯 Первый ответил:` format | ⏳ |

### Error Handling Tests
```typescript
describe('Error Handling', () => {
  it('handles timeout gracefully', async () => {
    // Mock timeout
    const result = await executeMultiAgentWebSearch('test');
    const timedOut = result.agents.filter(a => a.error?.includes('timeout'));
    expect(result.agents.length).toBe(5);
  });

  it('handles API errors', async () => {
    // Mock API error
    const result = await executeMultiAgentWebSearch('test');
    const failed = result.agents.filter(a => !a.success);
    expect(result.agents.length).toBe(5);
  });

  it('continues if 1-2 agents fail', async () => {
    const result = await executeMultiAgentWebSearch('test');
    const successful = result.agents.filter(a => a.success);
    expect(successful.length).toBeGreaterThanOrEqual(3);
  });
});
```

## Files to Create
- `src/web-search/multi-agent.test.ts`
- `src/telegram/bot.web-search.test.ts` (update)
- `docs/sdd/multi-agent-web-search/manual-e2e-test.md` (update)

## Running Tests

```bash
# Unit tests
npm test -- src/web-search/multi-agent.test.ts

# Integration tests
npm test -- src/telegram/bot.web-search.test.ts

# All tests
npm test

# Manual E2E
npm run dev -- --telegram
# Then test in Telegram
```

## Acceptance Criteria

- [ ] All unit tests pass (10+ tests)
- [ ] All integration tests pass (5+ tests)
- [ ] Manual E2E tests pass (10/10)
- [ ] Logging format verified (all 10+ log points)
- [ ] No regressions in existing tests
- [ ] Coverage > 70%

## Notes
- Use existing test patterns from codebase
- Mock CLI wrappers for fast tests
- Real CLI for E2E tests only
- Use `vi.setTimeout` for timeout tests
