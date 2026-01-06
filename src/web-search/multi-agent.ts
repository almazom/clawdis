/**
 * Multi-Agent Web Search Executor
 * Runs 5 AI agents in parallel and generates comprehensive report
 * Shows agent attribution in Telegram responses
 */

import { execSync } from 'node:child_process';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';

const execAsync = promisify(exec);

// Import AI analysis
import { analyzeWithAI, type AIAnalysis } from './ai-analysis.js';

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
  aiAnalysis?: AIAnalysis;
}

const AGENTS = [
  { name: 'gemini', script: 'gemini_cli_web', display: 'Gemini CLI', emoji: '⚡' },
  { name: 'kimi', script: 'kimi_cli_web', display: 'Kimi CLI', emoji: '🔍' },
  { name: 'qwen', script: 'qwen_cli_web', display: 'Qwen CLI', emoji: '🐉' },
  { name: 'minimax', script: 'minimax_cli_web', display: 'MiniMax Claude', emoji: '🧠' },
  { name: 'glm', script: 'glm_cli_web', display: 'GLM Claude', emoji: '🪄' },
];

export async function executeMultiAgentWebSearch(
  query: string,
  onStatus?: (status: string) => void
): Promise<MultiAgentResult> {
  const startTime = Date.now();
  const agentPromises: Promise<AgentResult>[] = [];

  onStatus?.(`🥊 Starting AI Fight: "${query}"`);
  onStatus?.(`⚔️  Launching 5 AI agents...`);

  // Spawn all 5 agents in parallel
  for (const agent of AGENTS) {
    const promise = runAgent(agent, query, onStatus);
    agentPromises.push(promise);
  }

  // Wait for all
  const results = await Promise.all(agentPromises);
  const totalDuration = Date.now() - startTime;

  // Find winner (fastest successful)
  const successful = results.filter(r => r.success);
  const winner = successful.sort((a, b) => a.durationMs - b.durationMs)[0];

  // Generate summary and insights
  const { summary, insights, tips } = analyzeResults(query, results, winner);

  // Generate AI-powered analysis
  onStatus?.('🤖 Generating AI analysis...');
  const aiAnalysis = await analyzeWithAI(query, results);

  // Generate HTML report
  const htmlReport = generateHtmlReport(query, results, summary, insights, tips, totalDuration, winner, aiAnalysis);

  return {
    query,
    winner,
    agents: results,
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
  onStatus?: (status: string) => void
): Promise<AgentResult> {
  const startTime = Date.now();

  onStatus?.(`${agent.emoji} ${agent.display} is searching...`);

  try {
    const wrapperPath = `/home/almaz/zoo_flow/clawdis/scripts/ai-wrappers/${agent.script}`;
    const { stdout, stderr } = await execAsync(`"${wrapperPath}" "${query}"`, {
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
    if (json.response) return json.response;
    if (Array.isArray(json) && json[0]?.text) return json[0].text;
    if (typeof json === 'string') return json;
  } catch { }

  const cleaned = output
    .replace(/--- RESULT ---/g, '')
    .replace(/\[Tool:.*?\]/g, '')
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
  aiAnalysis?: AIAnalysis
): string {
  const successful = results.filter(r => r.success);
  const maxDuration = Math.max(...results.map(r => r.durationMs), 1);

  const agentBars = results.map(r => {
    const width = Math.max(5, (r.durationMs / maxDuration) * 100);
    const color = r.success ? (r === winner ? '#ffd700' : '#00d4ff') : '#ff6b6b';
    const status = r.success ? '✅' : '❌';
    return `
      <div style="margin: 12px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span><strong>${r.agentDisplay}</strong> ${status}</span>
          <span>${r.durationMs}мс ${r.success ? '⭐'.repeat(r.quality || 0) : ''}</span>
        </div>
        <div style="background: #333; border-radius: 4px; height: 24px; position: relative;">
          <div style="background: ${color}; height: 100%; border-radius: 4px; width: ${width}%; transition: width 0.5s;"></div>
          <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #000; font-weight: bold; font-size: 12px;">
            ${Math.round(width)}%
          </span>
        </div>
      </div>
    `;
  }).join('');

  const insightsList = insights.map(i => `<li>${i}</li>`).join('');
  const tipsList = tips.map(t => `<li>${t}</li>`).join('');

  const winnerBanner = winner
    ? `<div style="background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);">
        <h2 style="margin: 0; color: #000; font-size: 2em;">🏆 Победитель: ${winner.agentDisplay}</h2>
        <p style="margin: 15px 0 0 0; font-size: 1.4em;">⏱️ ${(winner.durationMs / 1000).toFixed(1)}с | Качество: ${'⭐'.repeat(winner.quality || 0)}</p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>🥊 AI Бой: Поиск</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 950px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%); color: #eee; min-height: 100vh; }
    h1 { color: #ffd700; border-bottom: 3px solid #ffd700; padding-bottom: 15px; font-size: 2em; text-align: center; }
    h2 { color: #00d4ff; margin-top: 35px; border-left: 4px solid #00d4ff; padding-left: 15px; }
    .query { background: linear-gradient(135deg, #16213e, #1a1a2e); padding: 20px; border-radius: 10px; font-size: 1.2em; margin: 20px 0; border: 1px solid #00d4ff; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin: 25px 0; }
    .stat { background: linear-gradient(135deg, #16213e, #0f3460); padding: 20px; border-radius: 10px; text-align: center; border: 1px solid #333; transition: transform 0.2s; }
    .stat:hover { transform: translateY(-3px); border-color: #00d4ff; }
    .stat-value { font-size: 2.2em; font-weight: bold; color: #00d4ff; }
    .stat-label { color: #aaa; font-size: 0.95em; margin-top: 5px; }
    .chart-container { background: #16213e; padding: 25px; border-radius: 12px; margin: 20px 0; border: 1px solid #333; }
    .chart-title { color: #ffd700; margin-bottom: 20px; font-size: 1.2em; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #16213e; border-radius: 8px; overflow: hidden; }
    th, td { padding: 14px 12px; text-align: left; border-bottom: 1px solid #333; }
    th { background: linear-gradient(135deg, #0f3460, #16213e); color: #ffd700; font-weight: 600; }
    tr:hover { background: rgba(0, 212, 255, 0.05); }
    .success { background: rgba(0, 255, 136, 0.08); }
    .failed { background: rgba(255, 107, 107, 0.08); }
    .summary { background: linear-gradient(135deg, #16213e, #0f3460); padding: 25px; border-radius: 10px; border-left: 5px solid #ffd700; white-space: pre-wrap; line-height: 1.6; }
    .insights, .tips { background: #16213e; padding: 25px; border-radius: 10px; margin: 15px 0; }
    .insights { border-left: 5px solid #00d4ff; }
    .tips { border-left: 5px solid #ff6b6b; }
    ul { margin: 0; padding-left: 25px; }
    li { margin: 8px 0; line-height: 1.5; }
    .timestamp { color: #666; font-size: 0.9em; margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px solid #333; }
    .winner-badge { display: inline-block; background: #ffd700; color: #000; padding: 3px 10px; border-radius: 20px; font-size: 0.8em; margin-left: 10px; }
  </style>
</head>
<body>
  <h1>🥊 AI Бой: Веб-Поиск</h1>

  <div class="query">
    <strong>Запрос:</strong> ${query}
  </div>

  ${winnerBanner}

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${results.length}</div>
      <div class="stat-label">🤖 Агентов</div>
    </div>
    <div class="stat">
      <div class="stat-value">${successful.length}</div>
      <div class="stat-label">✅ Успешно</div>
    </div>
    <div class="stat">
      <div class="stat-value">${(totalDuration / 1000).toFixed(1)}с</div>
      <div class="stat-label">⏱️ Общее время</div>
    </div>
    <div class="stat">
      <div class="stat-value">${Math.round(successful.reduce((sum, r) => sum + r.durationMs, 0) / successful.length || 0)}мс</div>
      <div class="stat-label">📊 Среднее</div>
    </div>
  </div>

  <h2>📊 Время отклика (визуализация)</h2>
  <div class="chart-container">
    <div class="chart-title">⏱️ Скорость ответа агентов (от самого быстрого к медленному)</div>
    ${agentBars}
  </div>

  <h2>📋 Детализация</h2>
  <table>
    <thead>
      <tr>
        <th>🤖 Агент</th>
        <th>Статус</th>
        <th>⏱️ Время</th>
        <th>⭐ Качество</th>
        <th>📝 Ответ</th>
      </tr>
    </thead>
    <tbody>
      ${results.map(r => `
        <tr class="${r.success ? 'success' : 'failed'}">
          <td><strong>${r.agentDisplay}</strong>${r === winner ? '<span class="winner-badge">🏆 Победитель</span>' : ''}</td>
          <td>${r.success ? '✅' : '❌'}</td>
          <td>${r.durationMs}мс</td>
          <td>${r.quality ? '⭐'.repeat(r.quality) : '-'}</td>
          <td>${r.success ? (r.response?.substring(0, 200) + '...' || 'OK') : r.error}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>📈 Итоги</h2>
  <div class="summary">${summary}</div>

  ${aiAnalysis ? `
  <h2>🤖 AI Анализ</h2>
  <div class="ai-analysis" style="background: linear-gradient(135deg, #16213e, #0f3460); padding: 25px; border-radius: 10px; border-left: 5px solid #00d4ff; margin: 20px 0;">
    <div style="margin-bottom: 20px;">
      <h3 style="color: #ffd700; margin-bottom: 10px;">📋 Краткое резюме</h3>
      <p style="line-height: 1.6;">${aiAnalysis.summary}</p>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #ffd700; margin-bottom: 10px;">📌 Общие выводы</h3>
      <ul style="line-height: 1.6;">
        ${aiAnalysis.consensus.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #ffd700; margin-bottom: 10px;">💡 Уникальные особенности</h3>
      <ul style="line-height: 1.6;">
        ${aiAnalysis.insights.map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #ffd700; margin-bottom: 10px;">⚠️ Противоречия</h3>
      <p style="line-height: 1.6;">${aiAnalysis.contradictions}</p>
    </div>

    <div style="margin-bottom: 20px; background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; padding: 15px; border-radius: 8px;">
      <h3 style="color: #000; margin-bottom: 10px;">⭐ Лучший ответ: ${aiAnalysis.bestAgent}</h3>
      <p style="color: #000; line-height: 1.6;"><strong>Обоснование:</strong> ${aiAnalysis.bestReason}</p>
    </div>

    <div>
      <h3 style="color: #ffd700; margin-bottom: 10px;">🎯 Рекомендации</h3>
      <p style="line-height: 1.6;">${aiAnalysis.recommendations}</p>
    </div>
  </div>
  ` : '<div style="background: #16213e; padding: 20px; border-radius: 10px; border-left: 5px solid #ff6b6b; margin: 20px 0;"><h3 style="color: #ff6b6b;">⚠️ AI Анализ недоступен</h3><p style="color: #aaa;">Анализ не был сгенерирован (возможно, ошибка или таймаут)</p></div>'}

  <h2>💡 Инсайты</h2>
  <div class="insights">
    <ul>
      ${insightsList}
    </ul>
  </div>

  <h2>🎯 Рекомендации</h2>
  <div class="tips">
    <ul>
      ${tipsList}
    </ul>
  </div>

  <div class="timestamp">
    🕐 Сгенерировано: ${new Date().toLocaleString('ru-RU')}
  </div>
</body>
</html>`;
}

/**
 * Generate Telegram message with agent attribution
 */
export function formatTelegramWithAgent(result: MultiAgentResult): string {
  if (!result.winner) {
    return `❌ Ни один AI агент не ответил успешно.

${result.summary}`;
  }

  const truncated = result.winner.response?.substring(0, 500) || '';

  return `🌐 **${result.winner.agentDisplay}** ${'⭐'.repeat(result.winner.quality || 0)}

${truncated}${truncated.length >= 500 ? '...' : ''}

---
_Время ответа: ${result.winner.durationMs}мс | Запрос: "${result.query.substring(0, 50)}${result.query.length > 50 ? '...' : ''}"_

[Полный отчёт →](#)`;
}
