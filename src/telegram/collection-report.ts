import type { Context } from "grammy";
import { InlineKeyboard } from "grammy";

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

/**
 * Generate and display collection report
 */
export async function generateCollectionReport(
  ctx: Context,
  collectionName: string,
  prompt?: string,
): Promise<void> {
  const collection = await loadCollection(collectionName);
  if (!collection) {
    await ctx.reply("❌ Коллекция не найдена");
    return;
  }

  // Show loading
  const loadingMsg = await ctx.reply("🔄 Генерирую отчет...");

  try {
    // Fetch from all sources
    const analysisPrompt = prompt || "Проанализируй и выдели главные новости";
    const result = await fetchFromCollection(
      collectionName,
      analysisPrompt,
      "ask gemini",
      60,
      "json",
    );

    // Build report
    const report: CollectionReport = {
      collection: collectionName,
      totalSources: collection.sources?.length || 0,
      updatedSources: result.sources_fetched || 0,
      newArticles: calculateNewArticles(result),
      keyThemes: extractThemes(result),
      topNews: extractTopNews(result),
      updatedAt: new Date().toLocaleString("ru-RU"),
    };

    // Format report message
    const message = formatReport(report);

    // Send report with actions
    const keyboard = new InlineKeyboard()
      .row()
      .text("🔄 Обновить", `coll:refresh:${collectionName}`)
      .text("📋 Показать все", `coll:show:${collectionName}`)
      .row()
      .text("💾 Сохранить", `coll:save:${collectionName}`);

    await ctx.api.editMessageText(
      ctx.chat?.id ?? 0,
      loadingMsg.message_id,
      message,
      {
        reply_markup: keyboard,
      },
    );
  } catch {
    await ctx.api.editMessageText(
      ctx.chat?.id ?? 0,
      loadingMsg.message_id,
      "❌ Ошибка при генерации отчета",
    );
  }
}

/**
 * Format report as Telegram message
 */
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

function calculateNewArticles(_result: unknown): number {
  // TODO: Extract from actual result
  return 0;
}

function extractThemes(_result: unknown): string[] {
  // TODO: Extract from actual result
  return ["AI/ML", "Hardware", "Software"];
}

function extractTopNews(
  _result: unknown,
): Array<{ title: string; source: string; summary: string }> {
  // TODO: Extract from actual result
  return [];
}

/**
 * Load collection from storage
 */
async function loadCollection(
  _collectionName: string,
): Promise<{ sources?: Array<{ name: string; url: string }> } | null> {
  // TODO: Implement actual collection loading
  return null;
}

/**
 * Fetch from collection via url_collections.py
 */
async function fetchFromCollection(
  _collectionName: string,
  _prompt: string,
  _provider: string,
  _timeout: number,
  _format: string,
): Promise<{ sources_fetched?: number; results?: unknown[] }> {
  // TODO: Implement actual fetch
  return { sources_fetched: 0, results: [] };
}
