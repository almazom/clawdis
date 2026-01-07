import { describe, it, expect } from 'vitest';
import { formatTelegramWithAgent } from './multi-agent.js';
import type { MultiAgentResult } from './multi-agent.js';

describe('Multi-Agent Web Search Executor', () => {
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
        agent: 'gemini',
        agentDisplay: 'Gemini CLI',
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
});
