/**
 * Multi-Agent Web Search Executor
 * Runs 5 AI agents in parallel and generates comprehensive report
 * Shows agent attribution in Telegram responses
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import AI analysis
import { analyzeWithAI, type AIAnalysis } from './ai-analysis.js';
import { formatTelegramMessage } from '../telegram/formatter.js';
import { loadConfig } from '../config/config.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_WRAPPER_DIR = path.resolve(__dirname, '..', '..', 'scripts', 'ai-wrappers');

function resolveWrapperDir(): string {
  const cfg = loadConfig();
  const configured = cfg.webSearch?.wrapperDir?.trim();
  return configured || DEFAULT_WRAPPER_DIR;
}

export interface AgentResult {
  agent: string;
  agentDisplay: string;  // e.g., "Gemini CLI", "Kimi CLI"
  success: boolean;
  response?: string;
  error?: string;
  durationMs: number;
  quality?: number;
}

export interface MultiAgentResult {
  query: string;
  winner?: AgentResult;  // Fastest successful agent
  agents: AgentResult[];
  summary: string;
  insights: string[];
  tips: string[];
  htmlReport: string;
  generatedAt: Date;
  aiAnalysis: AIAnalysis | null;
}

const AGENTS = [
  { name: 'gemini', script: 'gemini_cli_web', display: 'Gemini CLI', emoji: '⚡' },
  { name: 'kimi', script: 'kimi_cli_web', display: 'Kimi CLI', emoji: '🔍' },
  // MiniMax/GLM removed - no real web search (just LLM knowledge)
];

// Configuration for wait strategy
const MIN_AGENTS_FOR_ANALYSIS = 2;  // Need at least 2 for meaningful AI analysis

export interface MultiAgentOptions {
  onStatus?: (status: string) => void;
  onFirstResult?: (result: AgentResult) => void;  // Called immediately when first agent succeeds
}

export async function executeMultiAgentWebSearch(
  query: string,
  onStatusOrOptions?: ((status: string) => void) | MultiAgentOptions
): Promise<MultiAgentResult> {
  // Handle both legacy callback and new options format
  const options: MultiAgentOptions = typeof onStatusOrOptions === 'function'
    ? { onStatus: onStatusOrOptions }
    : onStatusOrOptions || {};

  const { onStatus, onFirstResult } = options;

  const startTime = Date.now();
  const results: AgentResult[] = [];
  let firstResultSent = false;
  const wrapperDir = resolveWrapperDir();

  onStatus?.(`🥊 Starting AI Fight: "${query}"`);
  onStatus?.(`⚔️  Launching ${AGENTS.length} AI agents in parallel...`);

  // Spawn all agents in parallel
  const agentPromises = AGENTS.map(async (agent) => {
    const result = await runAgent(agent, query, onStatus, wrapperDir);
    results.push(result);

    // 🚀 IMMEDIATELY send FIRST successful result to user (fire and forget)
    if (result.success && !firstResultSent) {
      firstResultSent = true;
      onStatus?.(`🚀 WINNER: ${result.agentDisplay} finished first! (${result.durationMs}ms) - Sending to user NOW`);
      onFirstResult?.(result);  // User gets result instantly!
    }

    return result;
  });

  // ⏳ Wait for ALL agents to complete (background, don't block user)
  // User already got winner, we continue gathering data
  onStatus?.(`⏳ Waiting for remaining agents to complete...`);
  const allResults = await Promise.all(agentPromises);

  const totalDuration = Date.now() - startTime;
  const successfulCount = allResults.filter(r => r.success).length;
  const failedCount = allResults.filter(r => !r.success).length;

  onStatus?.(`✅ All agents completed! Success: ${successfulCount}/${AGENTS.length}, Failed: ${failedCount}`);

  // Find winner (fastest successful)
  const successful = allResults.filter(r => r.success);
  const winner = successful.sort((a, b) => a.durationMs - b.durationMs)[0];

  // Generate summary and insights
  const { summary, insights, tips } = analyzeResults(query, allResults, winner);

  // Generate AI-powered analysis (only if we have 2+ results)
  let aiAnalysis: AIAnalysis | null = null;
  if (successful.length >= MIN_AGENTS_FOR_ANALYSIS) {
    onStatus?.('🤖 Generating AI analysis from all agents...');
    aiAnalysis = await analyzeWithAI(query, allResults);
  } else if (successful.length === 1) {
    onStatus?.('📝 Only 1 agent succeeded, skipping comparison analysis');
  }

  // Generate HTML report with ALL results
  const htmlReport = generateHtmlReport(query, allResults, summary, insights, tips, totalDuration, winner, aiAnalysis);

  return {
    query,
    winner,
    agents: allResults,
    summary,
    insights,
    tips,
    htmlReport,
    generatedAt: new Date(),
    aiAnalysis,
  };
}

async function runAgent(
  agent: typeof AGENTS[0],
  query: string,
  onStatus: ((status: string) => void) | undefined,
  wrapperDir: string
): Promise<AgentResult> {
  const startTime = Date.now();

  onStatus?.(`${agent.emoji} ${agent.display} is searching...`);

  try {
    const wrapperPath = path.resolve(wrapperDir, agent.script);
    const { stdout, stderr } = await execFileAsync(wrapperPath, [query], {
      timeout: 180000,  // 3 minutes
    });

    const duration = Date.now() - startTime;
    const output = stdout + stderr;
    const response = extractResponse(output);

    onStatus?.(`${agent.emoji} ${agent.display} done in ${duration}ms`);

    return {
      agent: agent.name,
      agentDisplay: agent.display,
      success: true,
      response,
      durationMs: duration,
      quality: assessQuality(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    onStatus?.(`❌ ${agent.display} failed`);

    return {
      agent: agent.name,
      agentDisplay: agent.display,
      success: false,
      error: errorMsg,
      durationMs: duration,
    };
  }
}

function extractResponse(output: string): string {
  try {
    const json = JSON.parse(output);
    // Claude CLI format (GLM/MiniMax): {type: "result", result: "..."}
    if (json.type === 'result' && json.result) return json.result;
    // Gemini CLI format: {response: "..."}
    if (json.response) return json.response;
    // Kimi CLI format: {role: "assistant", content: "..."}
    if (json.content && typeof json.content === 'string') return json.content;
    // Array format: [{text: "..."}]
    if (Array.isArray(json) && json[0]?.text) return json[0].text;
    // Direct string
    if (typeof json === 'string') return json;
  } catch { }

  // Try to find JSON in the output (e.g., after "Loaded cached credentials.")
  const jsonMatch = output.match(/\{[\s\S]*"(?:response|content|result)"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const json = JSON.parse(jsonMatch[0]);
      // Claude CLI format
      if (json.type === 'result' && json.result) return json.result;
      if (json.response) return json.response;
      if (json.content) return json.content;
    } catch { }
  }

  const cleaned = output
    .replace(/--- RESULT ---/g, '')
    .replace(/\[Tool:.*?\]/g, '')
    .replace(/Loaded cached credentials\.\s*/g, '')
    .trim();

  return cleaned;
}

function assessQuality(response: string): number {
  if (!response || response.length < 50) return 1;
  if (response.length < 200) return 2;
  if (response.length < 500) return 3;
  if (response.length < 1500) return 4;
  return 5;
}

function analyzeResults(query: string, results: AgentResult[], winner?: AgentResult): { summary: string; insights: string[]; tips: string[] } {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  const summary = winner
    ? `🥊 **Результаты AI Боя**

Победитель: ${winner.agentDisplay} ${'⭐'.repeat(winner.quality || 0)} (${(winner.durationMs / 1000).toFixed(1)}с)

Из ${successful.length}/${results.length} AI агентов ответили успешно.`
    : `Ни один AI агент не ответил успешно.`;

  const insights: string[] = [];
  const tips: string[] = [];

  if (successful.length > 0) {
    insights.push(`${successful.length} агентов ответили успешно`);
  }

  if (failed.length > 0) {
    insights.push(`${failed.length} агентов не ответили: ${failed.map(f => f.agentDisplay).join(', ')}`);
    tips.push(`⚠️ Проверьте API ключи для: ${failed.map(f => f.agentDisplay).join(', ')}`);
  }

  const avgDuration = successful.reduce((sum, r) => sum + r.durationMs, 0) / successful.length;
  if (successful.length > 0) {
    insights.push(`Среднее время ответа: ${Math.round(avgDuration)}мс`);
  }

  tips.push('💡 Gemini - самый быстрый для простых запросов');
  tips.push('💡 Kimi - лучшее качество детальных ответов');
  tips.push('💡 Claude-based - хорош для кода и структурированных данных');

  return { summary, insights, tips };
}

function generateHtmlReport(
  query: string,
  results: AgentResult[],
  summary: string,
  insights: string[],
  tips: string[],
  totalDuration: number,
  winner?: AgentResult,
  aiAnalysis?: AIAnalysis | null
): string {
  const successful = results.filter(r => r.success);
  const maxDuration = Math.max(...results.map(r => r.durationMs), 1);

  // Helper to escape HTML
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  };

  const escapeHtmlTitle = (text: string): string =>
    escapeHtml(text).replace(/<br>/g, ' ');

  // Helper to convert basic markdown to HTML
  const markdownToHtml = (text: string): string => {
    return text
      // Escape HTML first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Code blocks
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.slice(3, -3).replace(/^\w+\n/, '');
        return `<pre><code>${code}</code></pre>`;
      })
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      // Lists
      .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Horizontal rules
      .replace(/^---+$/gm, '<hr>')
      // Paragraphs (double newlines)
      .replace(/\n\n/g, '</p><p>')
      // Single newlines to <br>
      .replace(/\n/g, '<br>');
  };

  // Generate full agent reports (NYT STYLE - each agent gets full section)
  const agentReports = results.map((r, idx) => {
    const isWinner = r === winner;
    const emoji = r.success ? (isWinner ? '🏆' : '✅') : '❌';
    const winnerBadge = isWinner ? '<span class="agent-badge">WINNER</span>' : '';

    return `
      <section class="agent-section ${r.success ? '' : 'failed'} ${isWinner ? 'winner' : ''}">
        <div class="agent-header">
          <span class="agent-name">${emoji} ${r.agentDisplay} ${winnerBadge}</span>
          <span class="agent-meta">⏱️ ${(r.durationMs / 1000).toFixed(1)}s ${r.quality ? '• ' + '⭐'.repeat(r.quality) : ''}</span>
        </div>
        ${r.success ? `
          <div class="agent-response">
            <p>${markdownToHtml(r.response || 'Empty response')}</p>
          </div>
        ` : `
          <div class="agent-error">
            <strong>Error:</strong> ${escapeHtml(r.error || 'Unknown error')}
          </div>
        `}
      </section>
    `;
  }).join('');

  // Performance comparison table
  const perfTable = results
    .sort((a, b) => a.durationMs - b.durationMs)
    .map(r => `
      <tr class="${r === winner ? 'winner-row' : ''}">
        <td><strong>${r.agentDisplay}</strong>${r === winner ? ' 🏆' : ''}</td>
        <td>${r.success ? '✅' : '❌'}</td>
        <td>${(r.durationMs / 1000).toFixed(1)}с</td>
        <td>${r.quality ? '⭐'.repeat(r.quality) : '-'}</td>
        <td>${((r.durationMs / maxDuration) * 100).toFixed(0)}%</td>
      </tr>
    `).join('');

  const dateStr = new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });

  // Fitzcarraldo-style minimal HTML report
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlTitle(query.substring(0, 60))}</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      font-size: 18px;
      line-height: 1.7;
      color: #1a1a1a;
      background: #fff;
      max-width: 680px;
      margin: 0 auto;
      padding: 60px 24px 100px;
    }

    header {
      margin-bottom: 60px;
      padding-bottom: 30px;
      border-bottom: 1px solid #e0e0e0;
    }

    .date {
      font-size: 13px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 16px;
    }

    h1 {
      font-size: 32px;
      font-weight: 400;
      line-height: 1.2;
      margin-bottom: 16px;
      font-style: italic;
    }

    .query {
      font-size: 15px;
      color: #666;
    }

    .agent {
      margin-bottom: 50px;
      padding-bottom: 50px;
      border-bottom: 1px solid #e0e0e0;
    }

    .agent:last-child {
      border-bottom: none;
    }

    .agent-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #333;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .winner-tag {
      background: #1a1a1a;
      color: #fff;
      font-size: 10px;
      padding: 3px 8px;
      letter-spacing: 0.1em;
    }

    .agent-content {
      font-size: 17px;
      line-height: 1.8;
    }

    .agent-content p { margin-bottom: 1em; }
    .agent-content ul, .agent-content ol { margin: 1em 0; padding-left: 1.5em; }
    .agent-content li { margin-bottom: 0.5em; }
    .agent-content strong { font-weight: 600; }
    .agent-content em { font-style: italic; }
    .agent-content code { font-family: monospace; background: #f5f5f5; padding: 2px 6px; }
    .agent-content pre { background: #f5f5f5; padding: 16px; overflow-x: auto; margin: 1em 0; }
    .agent-content h2, .agent-content h3, .agent-content h4 { font-size: 17px; font-weight: 600; margin: 1.5em 0 0.5em; }
    .agent-content a { color: #1a1a1a; }

    .agent-error {
      color: #c00;
      font-size: 14px;
      font-style: italic;
    }

    footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #999;
      text-align: center;
    }

    @media (max-width: 600px) {
      body { padding: 40px 16px 60px; font-size: 16px; }
      h1 { font-size: 26px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="date">${dateStr}</div>
    <h1>AI Web Search</h1>
    <p class="query">${escapeHtml(query)}</p>
  </header>

  ${results.filter(r => r.success).map(r => `
    <article class="agent">
      <div class="agent-title">
        ${r.agentDisplay}
        ${r === winner ? '<span class="winner-tag">Fastest</span>' : ''}
      </div>
      <div class="agent-content">
        ${markdownToHtml(r.response || '')}
      </div>
    </article>
  `).join('')}

  ${results.filter(r => !r.success).length > 0 ? `
    <article class="agent">
      <div class="agent-title">Failed Agents</div>
      ${results.filter(r => !r.success).map(r => `
        <p class="agent-error">${r.agentDisplay}: ${escapeHtml(r.error || 'Unknown error')}</p>
      `).join('')}
    </article>
  ` : ''}

  <footer>
    ${results.length} agents • ${(totalDuration / 1000).toFixed(1)}s
  </footer>
</body>
</html>`;
}

/**
 * Generate Telegram message with agent attribution
 * Returns MarkdownV2-escaped text ready for Telegram
 */
export function formatTelegramWithAgent(result: MultiAgentResult): string {
  if (!result.winner) {
    const message = `❌ Ни один AI агент не ответил успешно.\n\n${result.summary}`;
    return formatTelegramMessage(message);
  }

  const truncated = result.winner.response?.substring(0, 500) || '';
  const stars = '⭐'.repeat(result.winner.quality || 0);
  const queryPreview = result.query.substring(0, 50) + (result.query.length > 50 ? '...' : '');
  const responsePreview = truncated + (truncated.length >= 500 ? '...' : '');

  const message = `🌐 **${result.winner.agentDisplay}** ${stars}

${responsePreview}

---
_Время ответа: ${result.winner.durationMs}мс | Запрос: "${queryPreview}"_`;

  return formatTelegramMessage(message);
}
