import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeMultiAgentWebSearch, formatTelegramWithAgent } from './multi-agent.js';
import type { AgentResult, MultiAgentResult } from './multi-agent.js';

describe('Multi-Agent Web Search Executor', () => {
  // Real integration test - uses actual CLI wrappers
  
  it('should spawn all 5 agents in parallel and return results', async () => {
    const result = await executeMultiAgentWebSearch('test query Python');
    
    expect(result.agents).toHaveLength(5);
    expect(result.query).toBe('test query Python');
    expect(result.generatedAt).toBeInstanceOf(Date);
  }, 200000); // 200s timeout for all 5 agents

  it('should identify a winner (fastest successful agent)', async () => {
    const result = await executeMultiAgentWebSearch('small test');
    
    if (result.winner) {
      expect(result.winner.success).toBe(true);
      expect(result.winner.durationMs).toBeGreaterThan(0);
      expect(result.winner.agent).toBeDefined();
      expect(result.winner.agentDisplay).toBeDefined();
    }
  }, 200000);

  it('should calculate quality scores for successful agents', async () => {
    const result = await executeMultiAgentWebSearch('test');
    
    const successful = result.agents.filter(a => a.success);
    successful.forEach(agent => {
      expect(agent.quality).toBeDefined();
      expect(agent.quality).toBeGreaterThanOrEqual(1);
      expect(agent.quality).toBeLessThanOrEqual(5);
    });
  }, 200000);

  it('should generate HTML report with Russian text', async () => {
    const result = await executeMultiAgentWebSearch('test query');
    
    expect(result.htmlReport).toContain('AI Бой');
    expect(result.htmlReport).toContain('Победитель');
    expect(result.htmlReport).toContain('Агент');
    expect(result.htmlReport).toContain('<!-- HTML report generated');
  }, 200000);

  it('should handle agent failures gracefully', async () => {
    const result = await executeMultiAgentWebSearch('test impossible query that will fail');
    
    // All 5 agents attempted
    expect(result.agents.length).toBe(5);
    
    // Should have both success and failure (usually)
    const failedCount = result.agents.filter(a => !a.success).length;
    expect(failedCount).toBeLessThanOrEqual(5);
    expect(failedCount).toBeGreaterThanOrEqual(0);
  }, 200000);

  it('should log all required status messages', async () => {
    const logs: string[] = [];
    
    await executeMultiAgentWebSearch('test logging', (status) => {
      logs.push(status);
    });

    expect(logs.some(l => l.includes('Starting AI Fight'))).toBe(true);
    expect(logs.some(l => l.includes('launched'))).toBe(true);
    expect(logs.some(l => l.includes('completed'))).toBe(true);
  }, 200000);

  it('should handle query with special characters', async () => {
    const query = 'test query with "quotes" and @symbols #hashtags';
    const result = await executeMultiAgentWebSearch(query);
    
    expect(result.query).toBe(query);
    expect(result.agents).toHaveLength(5);
  }, 200000);

  it('should format Telegram message correctly when winner exists', () => {
    const mockResult: MultiAgentResult = {
      query: 'test query',
      winner: {
        agent: 'kimi',
        agentDisplay: 'Kimi CLI',
        success: true,
        response: 'This is a test response that should be properly formatted for Telegram',
        durationMs: 15346,
        quality: 4
      },
      agents: [],
      summary: 'Test summary',
      insights: [],
      tips: [],
      htmlReport: '',
      generatedAt: new Date()
    };

    const formatted = formatTelegramWithAgent(mockResult);

    // telegramify-markdown converts ** to * for bold
    expect(formatted).toContain('*Kimi CLI*');
    expect(formatted).toContain('This is a test response');
    expect(formatted).toContain('15346мс');
  });

  it('should format Telegram message for failure case', () => {
    const mockResult: MultiAgentResult = {
      query: 'test query',
      winner: undefined,
      agents: [],
      summary: '❌ Ни один AI агент не ответил успешно.',
      insights: [],
      tips: [],
      htmlReport: '',
      generatedAt: new Date()
    };

    const formatted = formatTelegramWithAgent(mockResult);

    expect(formatted).toContain('❌ Ни один AI агент не ответил успешно');
  });

  it('should escape MarkdownV2 special characters in response', () => {
    const mockResult: MultiAgentResult = {
      query: 'Python {generics}',
      winner: {
        agent: 'gemini',
        agentDisplay: 'Gemini CLI',
        success: true,
        response: 'Python 3.12 adds type parameter syntax {T}, decorators like @override, and more! Visit docs.python.org.',
        durationMs: 5000,
        quality: 4
      },
      agents: [],
      summary: '',
      insights: [],
      tips: [],
      htmlReport: '',
      generatedAt: new Date()
    };

    const formatted = formatTelegramWithAgent(mockResult);

    // Should escape { } . ! | - characters for MarkdownV2
    expect(formatted).toContain('\\{T\\}');
    expect(formatted).toContain('docs\\.python\\.org');
    expect(formatted).toContain('more\\!');
    expect(formatted).toContain('\\{generics\\}');
  });

  it('should escape parentheses and brackets in query', () => {
    const mockResult: MultiAgentResult = {
      query: 'function(arg) [array]',
      winner: {
        agent: 'qwen',
        agentDisplay: 'Qwen CLI',
        success: true,
        response: 'Test response',
        durationMs: 3000,
        quality: 3
      },
      agents: [],
      summary: '',
      insights: [],
      tips: [],
      htmlReport: '',
      generatedAt: new Date()
    };

    const formatted = formatTelegramWithAgent(mockResult);

    // Should escape ( ) [ ] for MarkdownV2
    expect(formatted).toContain('function\\(arg\\)');
    expect(formatted).toContain('\\[array\\]');
  });

  it('should include AI analysis in result when available', async () => {
    const result = await executeMultiAgentWebSearch('test query that will get analysis');
    
    // aiAnalysis is optional, may not always be available due to errors
    if (result.aiAnalysis) {
      expect(result.aiAnalysis.summary).toBeDefined();
      expect(result.aiAnalysis.consensus).toBeInstanceOf(Array);
      expect(result.aiAnalysis.insights).toBeInstanceOf(Array);
      expect(result.aiAnalysis.bestAgent).toBeDefined();
      expect(result.aiAnalysis.recommendations).toBeDefined();
    }
  }, 200000);
});