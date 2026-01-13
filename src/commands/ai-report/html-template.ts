/**
 * HTML Template Generator
 * Layer 4: Creates HTML report and publishes to web
 */

import * as fs from 'fs';
import * as path from 'path';
import { type ReportStats } from './types.js';

interface PublishResult {
  url: string;
  htmlPath: string;
}

function generateHtml(stats: ReportStats, period: string, channel: string): string {
  const topicsHtml = stats.topics.slice(0, 10).map(topicStat => {
    const count = topicStat.count;
    const examples = topicStat.examples?.slice(0, 2).join(' ') || '';

    return `
            <div class="topic">
                <div class="topic-main">
                    <span class="tag">${topicStat.tag}</span>
                    <span class="count">${count} messages</span>
                </div>
                ${examples ? `<div class="topic-example">${escapeHtml(examples)}</div>` : ''}
            </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Club ${period.charAt(0).toUpperCase() + period.slice(1)} Report</title>
    <style>
        :root {
            --bg: #0f0f0f;
            --sec: #1a1a1a;
            --text: #f5f5f5;
            --muted: #888;
            --accent: #00d4aa;
            --border: #333;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            padding: 2rem;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
        }
        h1 { color: var(--accent); font-size: 1.8rem; margin-bottom: 0.5rem; }
        h2 { font-size: 1.2rem; margin-bottom: 1rem; color: var(--muted); }
        .meta { color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: var(--sec);
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value { font-size: 1.5rem; color: var(--accent); font-weight: bold; }
        .stat-label { font-size: 0.8rem; color: var(--muted); }
        .topics { background: var(--sec); padding: 1.5rem; border-radius: 12px; }
        .topic {
            padding: 0.75rem 0;
            border-bottom: 1px solid var(--border);
        }
        .topic:last-child { border-bottom: none; }
        .topic-main { display: flex; justify-content: space-between; align-items: center; }
        .tag { color: var(--accent); font-weight: 500; }
        .count { color: var(--muted); }
        .topic-example {
            margin-top: 0.5rem;
            font-size: 0.85rem;
            color: var(--muted);
            font-style: italic;
        }
        .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
            font-size: 0.8rem;
            color: var(--muted);
        }
        .channel-badge {
            display: inline-block;
            background: var(--accent);
            color: var(--bg);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <span class="channel-badge">${escapeHtml(channel)}</span>
    <h1>AI Club ${period.charAt(0).toUpperCase() + period.slice(1)} Report</h1>
    <p class="meta">${stats.date_range.earliest} — ${stats.date_range.latest}</p>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${stats.total_messages}</div>
            <div class="stat-label">Messages</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.unique_senders}</div>
            <div class="stat-label">Senders</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.topics.length}</div>
            <div class="stat-label">Topics</div>
        </div>
    </div>

    ${stats.topics.length > 0 ? `
    <div class="topics">
        <h2>Top Topics</h2>
        ${topicsHtml}
    </div>
    ` : `
    <div class="topics">
        <p style="color: var(--muted);">No topics found</p>
    </div>
    `}

    <div class="footer">
        Generated ${new Date().toISOString()}
    </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export function createHtmlReport(
  stats: ReportStats,
  period: 'today' | 'week',
  channel: string,
  reportsDir: string = '/home/almaz/TOOLS/channel_grabber_via_telega_n_published/reports'
): PublishResult {
  // Ensure reports directory exists
  fs.mkdirSync(reportsDir, { recursive: true });

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `ai_report_${period}_${timestamp}.html`;
  const htmlPath = path.join(reportsDir, filename);

  // Generate HTML
  const html = generateHtml(stats, period, channel);

  // Write file
  fs.writeFileSync(htmlPath, html, 'utf-8');

  return {
    url: `file://${htmlPath}`,
    htmlPath
  };
}

export function publishHtml(htmlPath: string): string {
  try {
    const { execSync } = require('child_process');
    const output = execSync(`/home/almaz/TOOLS/publish_to_web/publish_me --direct "${htmlPath}" 2>&1`, {
      encoding: 'utf-8'
    });

    const urlMatch = output.match(/https?:\/\/[^\s"']+/);
    return urlMatch ? urlMatch[0] : `file://${htmlPath}`;
  } catch {
    return `file://${htmlPath}`;
  }
}

export { generateHtml, escapeHtml };
