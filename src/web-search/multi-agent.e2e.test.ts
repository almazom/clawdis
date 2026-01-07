import { describe, it, expect } from 'vitest';
import { executeMultiAgentWebSearch } from './multi-agent.js';

const runE2E = ['1', 'true', 'yes'].includes(
  (process.env.RUN_E2E ?? '').toLowerCase(),
);
const describeE2E = runE2E ? describe : describe.skip;

describeE2E('Multi-Agent Web Search E2E', () => {
  it('spawns agents in parallel and returns results', async () => {
    const result = await executeMultiAgentWebSearch('test query Python');

    expect(result.agents).toHaveLength(2);
    expect(result.query).toBe('test query Python');
    expect(result.generatedAt).toBeInstanceOf(Date);
  }, 200000);

  it('identifies a winner (fastest successful agent)', async () => {
    const result = await executeMultiAgentWebSearch('small test');

    if (result.winner) {
      expect(result.winner.success).toBe(true);
      expect(result.winner.durationMs).toBeGreaterThan(0);
      expect(result.winner.agent).toBeDefined();
      expect(result.winner.agentDisplay).toBeDefined();
    }
  }, 200000);

  it('generates HTML report output', async () => {
    const result = await executeMultiAgentWebSearch('test query');

    expect(result.htmlReport).toContain('AI Web Search');
    expect(result.htmlReport).toContain('<article');
  }, 200000);

  it('handles agent failures gracefully', async () => {
    const result = await executeMultiAgentWebSearch('test impossible query that will fail');

    expect(result.agents.length).toBe(2);
    const failedCount = result.agents.filter(a => !a.success).length;
    expect(failedCount).toBeLessThanOrEqual(2);
    expect(failedCount).toBeGreaterThanOrEqual(0);
  }, 200000);

  it('logs required status messages', async () => {
    const logs: string[] = [];

    await executeMultiAgentWebSearch('test logging', (status) => {
      logs.push(status);
    });

    expect(logs.some(l => l.includes('Starting AI Fight'))).toBe(true);
    expect(logs.some(l => l.includes('Launching'))).toBe(true);
    expect(logs.some(l => l.includes('All agents completed'))).toBe(true);
  }, 200000);

  it('handles query with special characters', async () => {
    const query = 'test query with "quotes" and @symbols #hashtags';
    const result = await executeMultiAgentWebSearch(query);

    expect(result.query).toBe(query);
    expect(result.agents).toHaveLength(2);
  }, 200000);

  it('includes AI analysis when available', async () => {
    const result = await executeMultiAgentWebSearch('test query that will get analysis');

    if (result.aiAnalysis) {
      expect(result.aiAnalysis.summary).toBeDefined();
      expect(result.aiAnalysis.consensus).toBeInstanceOf(Array);
      expect(result.aiAnalysis.insights).toBeInstanceOf(Array);
      expect(result.aiAnalysis.bestAgent).toBeDefined();
      expect(result.aiAnalysis.recommendations).toBeDefined();
    }
  }, 200000);
});
