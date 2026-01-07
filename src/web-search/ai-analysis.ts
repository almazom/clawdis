/**
 * AI Analysis for Multi-Agent Results
 * Uses Kimi CLI to analyze all agent responses
 */

import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export interface AIAnalysis {
  summary: string;
  consensus: string[];
  insights: string[];
  contradictions: string;
  bestAgent: string;
  bestReason: string;
  recommendations: string;
}

export async function analyzeWithAI(query: string, agents: any[]): Promise<AIAnalysis | null> {
  const successful = agents.filter((a: any) => a.success);
  if (successful.length === 0) return null;

  const responses = successful
    .map((a: any) => `${a.agentDisplay} (${'⭐'.repeat(a.quality || 0)}):\n${a.response?.substring(0, 600) || 'N/A'}`)
    .join('\n\n---\n\n');

  const prompt = `Ты — экспертный аналитик AI-систем. Проанализируй ${successful.length} ответа на запрос: "${query}"

Ответы AI агентов:
${responses}

ТРЕБУЕТСЯ анализ в формате (на русском):

## Краткое резюме (2-3 предложения)
[анализ]

## Общие выводы (3-5 пунктов)
- [пункт 1]
- [пункт 2]
- [пункт 3]

## Уникальные особенности каждого ответа
- **[AGENT 1]**: [что выделяет]
- **[AGENT 2]**: [что выделяет]
...

## Противоречия и расхождения
[описание или "Существенных противоречий не обнаружено"]

## Лучший ответ: [НАЗВАНИЕ АГЕНТА]
Обоснование: [почему]

## Рекомендации для пользователя
[что делать дальше]

Ответь ТОЛЬКО анализом, без предисловий.`;

  try {
    const wrapperDir = resolveWrapperDir();
    const wrapperPath = path.resolve(wrapperDir, 'kimi_cli_web');
    const { stdout } = await execFileAsync(wrapperPath, [prompt], {
      timeout: 90000,
    });

    return parseAIResponse(stdout);
  } catch (error) {
    console.error('[AI Analysis] Failed:', error);
    return null;
  }
}

function parseAIResponse(response: string): AIAnalysis {
  const lines = response.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  
  const extractSection = (marker: string): string[] => {
    const start = lines.findIndex((l: string) => l.includes(marker));
    if (start === -1) return [];
    
    const end = lines.findIndex((l: string, i: number) => i > start && l.startsWith('## '));
    const section = end === -1 ? lines.slice(start + 1) : lines.slice(start + 1, end);
    return section.filter((l: string) => l.length > 0 && !l.startsWith('##'));
  };
  
  const summaryLines = extractSection('Краткое резюме');
  const consensusLines = extractSection('Общие выводы');
  const uniquenessLines = extractSection('Уникальные особенности');
  const contradictionLines = extractSection('Противоречия');
  const bestLines = extractSection('Лучший ответ');
  const recLines = extractSection('Рекомендации');
  
  const getBestAgent = (lines: string[]): string => {
    const line = lines.find((l: string) => l.includes('Лучший ответ:')) || lines[0] || '';
    const match = line.match(/Лучший ответ:\s*([^\n]+)/);
    return match ? match[1].trim() : 'Kimi';
  };
  
  return {
    summary: summaryLines.join(' ') || 'Анализ недоступен',
    consensus: consensusLines.map((l: string) => l.replace(/^-\s*/, '')),
    insights: uniquenessLines.map((l: string) => l.replace(/^-\s*\*?/, '')),
    contradictions: contradictionLines.join(' ') || 'Существенных противоречий не обнаружено',
    bestAgent: getBestAgent(bestLines),
    bestReason: bestLines.find((l: string) => l.includes('Обоснование:'))?.replace('Обоснование:', '').trim() || 'Недостаточно данных',
    recommendations: recLines.join(' ') || 'Нет рекомендаций',
  };
}
