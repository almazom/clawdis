# Card 11: Telegram Collection Report

| Field | Value |
|-------|-------|
| **ID** | AGI-11 |
| **Story Points** | 2 |
| **Depends On** | 07 |
| **Sprint** | Phase 3 |

## User Story

> As a user, I want to generate and view a rich report of my collection analysis.

## Context

Read before starting:
- [ui-flow.md](../ui-flow.md) - Section 3
- Report structure in ui-flow.md

## Instructions

### Step 1: Create Report Module

```bash
# Create: src/telegram/collection-report.ts
```

```typescript
import { Context } from 'telegraf';
import { loadCollection } from '../../../ask_cli_agents/url_collections';
import { fetch_from_collection } from '../../../ask_cli_agents/url_collections';

export interface CollectionReport {
  collection: string;
  totalSources: number;
  updatedSources: number;
  newArticles: number;
  keyThemes: string[];
  topNews: Array<{
    title: string;
    source: string;
    summary: string;
  }>;
  updatedAt: string;
}

export async function generateCollectionReport(
  ctx: Context,
  collectionName: string,
  prompt?: string
): Promise<void> {
  const collection = loadCollection(collectionName);
  if (!collection) {
    await ctx.reply('❌ Коллекция не найдена');
    return;
  }

  // Show loading
  await ctx.reply('🔄 Генерирую отчет...');

  // Fetch from all sources
  const analysisPrompt = prompt || 'Проанализируй и выдели главные новости';
  const result = await fetch_from_collection(
    collectionName,
    analysisPrompt,
    'ask gemini',
    60,
    'json'
  );

  // Build report
  const report: CollectionReport = {
    collection: collectionName,
    totalSources: collection.sources?.length || 0,
    updatedSources: result.sources_fetched || 0,
    newArticles: calculateNewArticles(result),
    keyThemes: extractThemes(result),
    topNews: extractTopNews(result),
    updatedAt: new Date().toLocaleString('ru-RU'),
  };

  // Format report message
  const message = formatReport(report);

  // Send report with actions
  await ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔄 Обновить', callback_data: `coll:refresh:${collectionName}` },
          { text: '📋 Показать все', callback_data: `coll:show:${collectionName}` },
        ],
        [{ text: '💾 Сохранить', callback_data: `coll:save:${collectionName}` }],
      ],
    },
  });
}

function formatReport(report: CollectionReport): string {
  let text = `📊 ОТЧЕТ: ${report.collection}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `📅 Обновлено: ${report.updatedAt}\n`;
  text += `🔗 Источников: ${report.totalSources} | ✅ ${report.updatedSources} обновлено\n\n`;

  text += `📈 СТАТИСТИКА\n`;
  text += `├── Новых статей: ${report.newArticles}\n`;
  text += `└── Ключевых тем: ${report.keyThemes.length}\n\n`;

  if (report.topNews.length > 0) {
    text += `🔥 ГЛАВНЫЕ НОВОСТИ\n`;
    for (const news of report.topNews.slice(0, 5)) {
      text += `\n${news.title} (${news.source})`;
      text += `\n💬 "${news.summary.slice(0, 100)}..."\n`;
    }
  }

  return text;
}

function calculateNewArticles(result: any): number {
  return result.results?.length || 0;
}

function extractThemes(result: any): string[] {
  return ['AI/ML', 'Hardware', 'Software']; // Extract from analysis
}

function extractTopNews(result: any): Array<{ title: string; source: string; summary: string }> {
  return result.results?.map((r: any) => ({
    title: r.name || 'Unknown',
    source: r.url || 'Unknown',
    summary: r.data?.response || '',
  })) || [];
}
```

## Acceptance Criteria

- [ ] File created: `src/telegram/collection-report.ts`
- [ ] `generateCollectionReport()` function works
- [ ] Shows statistics, themes, top news
- [ ] Inline buttons for actions
- [ ] Type checking passes

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 11 to "completed"
3. Read next card: [12-telegram-collection-callback](./12-telegram-collection-callback.md)
4. Continue execution
