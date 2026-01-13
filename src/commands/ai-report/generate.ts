#!/usr/bin/env node
/**
 * AI Report Generator
 * Layer 3: Report Generation - generates report data from cached messages
 *
 * Usage: generate.ts --cache <path> --period <today|week> [--json]
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseCache, filterByPeriod, type CacheData, type ReportStats, type CacheMeta } from './types.js';

interface GenerateOptions {
  cachePath: string;
  period: 'today' | 'week';
  outputJson?: boolean;
}

function parseArgs(): GenerateOptions {
  const args = process.argv.slice(2);
  const options: GenerateOptions = {
    cachePath: '',
    period: 'today',
    outputJson: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--cache':
        options.cachePath = args[++i] || '';
        break;
      case '--period':
        options.period = (args[++i] as 'today' | 'week') || 'today';
        break;
      case '--json':
        options.outputJson = true;
        break;
    }
  }

  return options;
}

function generateReportData(cachePath: string, period: 'today' | 'week'): { stats: ReportStats; meta: CacheMeta } {
  // Read and parse cache
  const rawData = fs.readFileSync(cachePath, 'utf-8');
  const cacheData: CacheData = JSON.parse(rawData);

  // Filter by period
  const filteredData = filterByPeriod(cacheData, period);

  // Generate stats
  const stats = parseCache(filteredData);

  return {
    stats,
    meta: filteredData.meta
  };
}

function formatReportForTelegram(stats: ReportStats, period: string): string {
  const lines = [
    `📊 *AI Club ${period} Report*`,
    `━━━━━━━━━━━━━━━━`,
    `💬 Messages: *${stats.total_messages}*`,
    `👥 Senders: *${stats.unique_senders}*`,
    ``
  ];

  if (stats.top_topics.length > 0) {
    lines.push(`🏷️ *Top Topics:*`);
    for (const topic of stats.top_topics) {
      const topicStat = stats.topics.find(t => t.tag === topic);
      const count = topicStat?.count || 0;
      lines.push(`  #${topic}: ${count}`);
    }
    lines.push(``);
  } else {
    lines.push(`🏷️ *No topics found*`);
    lines.push(``);
  }

  lines.push(`📅 Period: ${stats.date_range.earliest} - ${stats.date_range.latest}`);

  return lines.join('\n');
}

function main(): void {
  const options = parseArgs();

  if (!options.cachePath) {
    console.error('Error: --cache <path> is required');
    process.exit(1);
  }

  if (!fs.existsSync(options.cachePath)) {
    console.error(`Error: Cache file not found: ${options.cachePath}`);
    process.exit(1);
  }

  try {
    const { stats, meta } = generateReportData(options.cachePath, options.period);

    if (options.outputJson) {
      // Output JSON for programmatic use
      console.log(JSON.stringify({
        status: 'success',
        period: options.period,
        channel: meta.channel,
        stats,
        generated_at: new Date().toISOString()
      }, null, 2));
    } else {
      // Output Telegram-formatted text
      console.log(formatReportForTelegram(stats, options.period));
    }
  } catch (error) {
    console.error(`Error generating report: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main();
