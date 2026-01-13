/**
 * AI Report Command Handler
 * Layer 5: Bot command integration - /ai_report command
 *
 * Full pipeline:
 * 1. Fetch messages via telega_v2
 * 2. Parse cache and extract stats (types.ts)
 * 3. Generate report data (generate.ts)
 * 4. Create HTML and publish (html-template.ts)
 * 5. Return URL to Telegram
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../../config/config.js";
import { logVerbose } from "../../globals.js";
import { runExec } from "../../process/exec.js";
import { parseCache, filterByPeriod, type CacheData, type ReportStats } from "./types.js";

const DEFAULT_CHANNEL = "@aiclubsweggs";

type RangeResult = {
  fromIso: string;
  toIso: string;
  filter: string;
};

function buildRange(period: "today" | "week"): RangeResult {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    start.setDate(start.getDate() - 6);
    return {
      fromIso: start.toISOString(),
      toIso: now.toISOString(),
      filter: "last:7",
    };
  }

  return {
    fromIso: start.toISOString(),
    toIso: now.toISOString(),
    filter: "today",
  };
}

function parseCachePath(stdout: string): string | null {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  // Return the last line that looks like a path
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes("/")) {
      return lines[i];
    }
  }
  return lines[lines.length - 1] || null;
}

function formatTelegramResponse(stats: ReportStats, period: string, reportUrl: string): string {
  const lines = [
    `📊 *AI Club ${period} Report*`,
    `────────────────────`,
    `💬 *${stats.total_messages}* messages`,
    `👥 *${stats.unique_senders}* participants`,
    ``,
  ];

  // Top Topics
  if (stats.top_topics.length > 0) {
    lines.push(`🏷️ *Key Topics:*`);
    for (const topic of stats.top_topics.slice(0, 5)) {
      const topicStat = stats.topics.find(t => t.tag === topic);
      const count = topicStat?.count || 0;
      lines.push(`  #${topic}: ${count}`);
    }
  } else {
    lines.push(`🏷️ *No topics found*`);
  }
  lines.push(``);

  // Active Participants
  if (stats.top_senders.length > 0) {
    lines.push(`👤 *Active Participants:*`);
    for (let i = 0; i < Math.min(5, stats.top_senders.length); i++) {
      const sender = stats.top_senders[i];
      lines.push(`  ${i + 1}. ${sender.name}: ${sender.message_count}`);
    }
  }

  lines.push(``);
  lines.push(`📅 ${stats.date_range.earliest} — ${stats.date_range.latest}`);
  lines.push(``);
  lines.push(`🔗 [Full Report](${reportUrl})`);

  return lines.join('\n');
}

async function generateHtml(stats: ReportStats, period: string, channel: string): Promise<string> {
  const topicsHtml = stats.topics.slice(0, 10).map(topicStat => {
    const count = topicStat.count;

    return `
            <div class="topic">
                <span class="tag">${topicStat.tag}</span>
                <span class="count">${count}</span>
            </div>`;
  }).join('');

  const sendersHtml = stats.top_senders.slice(0, 10).map(sender => {
    return `
            <div class="topic">
                <span class="sender">${sender.name}</span>
                <span class="count">${sender.message_count}</span>
            </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Club ${period.charAt(0).toUpperCase() + period.slice(1)} Report</title>
    <style>
        :root { --bg: #0f0f0f; --sec: #1a1a1a; --text: #f5f5f5; --muted: #888; --accent: #00d4aa; }
        body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; line-height: 1.6; max-width: 800px; margin: 0 auto; }
        h1 { color: var(--accent); font-size: 1.8rem; margin-bottom: 0.5rem; }
        h2 { font-size: 1.2rem; margin-bottom: 1rem; color: var(--muted); }
        .meta { color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: var(--sec); padding: 1rem; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 1.5rem; color: var(--accent); font-weight: bold; }
        .stat-label { font-size: 0.8rem; color: var(--muted); }
        .section { background: var(--sec); padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; }
        .topic { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #333; }
        .topic:last-child { border-bottom: none; }
        .tag { color: var(--accent); }
        .sender { color: #ff9f43; }
        .count { color: var(--muted); }
    </style>
</head>
<body>
    <h1>AI Club ${period.charAt(0).toUpperCase() + period.slice(1)} Report</h1>
    <p class="meta">${stats.date_range.earliest} — ${stats.date_range.latest}</p>

    <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${stats.total_messages}</div><div class="stat-label">Messages</div></div>
        <div class="stat-card"><div class="stat-value">${stats.unique_senders}</div><div class="stat-label">Participants</div></div>
        <div class="stat-card"><div class="stat-value">${stats.topics.length}</div><div class="stat-label">Topics</div></div>
    </div>

    <div class="section">
        <h2>Top Topics</h2>
        ${topicsHtml || '<p style="color: var(--muted);">No topics found</p>'}
    </div>

    <div class="section">
        <h2>Active Participants</h2>
        ${sendersHtml || '<p style="color: var(--muted);">No participant data</p>'}
    </div>
</body>
</html>`;

  return html;
}

async function publishHtml(html: string): Promise<string> {
  const reportsDir = "/home/almaz/TOOLS/channel_grabber_via_telega_n_published/reports";
  await mkdir(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `ai_report_${timestamp}.html`;
  const htmlPath = join(reportsDir, filename);

  await writeFile(htmlPath, html, 'utf-8');

  // Publish to web
  try {
    const { stdout } = await runExec("/home/almaz/TOOLS/publish_to_web/publish_me", ["--direct", htmlPath], { timeoutMs: 30000 });
    const urlMatch = stdout.match(/https?:\/\/[^\s"']+/);
    return urlMatch ? urlMatch[0] : `file://${htmlPath}`;
  } catch {
    return `file://${htmlPath}`;
  }
}

function remainingTimeoutMs(startTime: number, timeoutMs: number): number {
  const elapsed = Date.now() - startTime;
  return Math.max(timeoutMs - elapsed, 0);
}

export async function getAiReport(
  period: "today" | "week",
): Promise<{
  summary: string;
  url: string;
  channel: string;
} | null> {
  const cfg = loadConfig();
  const telegaPath = "/home/almaz/TOOLS/telega_v2/telega_v2";
  const profile = cfg.aiClub?.telegaV2Profile?.trim() || "default";
  const channel = cfg.aiClub?.channel?.trim() || DEFAULT_CHANNEL;
  const timeoutMs = cfg.aiClub?.timeoutMs ?? 300000;
  const pipelineStart = Date.now();

  const { filter } = buildRange(period);
  const fetchArgs = ["fetch-range", "--profile", profile, channel, filter];

  logVerbose(`[ai-report] telega_v2: ${telegaPath} ${fetchArgs.join(" ")}`);

  // Step 1: Fetch messages via telega_v2
  let fetchStdout = "";
  let fetchStderr = "";

  try {
    const remainingMs = remainingTimeoutMs(pipelineStart, timeoutMs);
    if (remainingMs <= 0) {
      logVerbose("[ai-report] Timeout before fetch-range");
      return null;
    }

    const fetchStart = Date.now();
    const result = await runExec(telegaPath, fetchArgs, { timeoutMs: remainingMs });
    fetchStdout = result.stdout;
    fetchStderr = result.stderr;
    logVerbose(`[ai-report] telega_v2 fetch completed in ${Date.now() - fetchStart}ms`);
  } catch (err) {
    logVerbose(`[ai-report] telega_v2 failed: ${String(err)}`);
    return null;
  }

  // Step 2: Parse cache path
  const cachePath = parseCachePath(fetchStdout);
  if (!cachePath) {
    logVerbose(`[ai-report] Missing cache path. stdout: ${fetchStdout}`);
    return null;
  }

  logVerbose(`[ai-report] cache: ${cachePath}`);

  // Step 3: Read and parse cache
  let cacheData: CacheData;
  try {
    const rawCache = await readFile(cachePath, 'utf-8');
    cacheData = JSON.parse(rawCache);
  } catch (err) {
    logVerbose(`[ai-report] Failed to read/parse cache: ${String(err)}`);
    return null;
  }

  // Step 4: Process data (filter by period, extract stats)
  const filteredData = filterByPeriod(cacheData, period);
  const stats = parseCache(filteredData);

  logVerbose(`[ai-report] Processed ${stats.total_messages} messages, ${stats.topics.length} topics`);

  // Step 5: Generate HTML
  const html = await generateHtml(stats, period, channel);

  // Step 6: Publish to web
  let reportUrl: string;
  try {
    const remainingMs = remainingTimeoutMs(pipelineStart, timeoutMs);
    if (remainingMs <= 0) {
      logVerbose("[ai-report] Timeout before publish");
      return null;
    }
    reportUrl = await publishHtml(html);
  } catch (err) {
    logVerbose(`[ai-report] Publish failed: ${String(err)}`);
    reportUrl = "file://error";
  }

  // Step 7: Format response
  const summary = formatTelegramResponse(stats, period, reportUrl);

  return {
    summary,
    url: reportUrl,
    channel,
  };
}
