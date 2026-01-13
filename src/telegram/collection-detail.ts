import type { Context } from "grammy";
import { buildCollectionDetailKeyboard } from "./collection-keyboard.js";

export interface CollectionSource {
  name: string;
  url: string;
  priority?: number;
  tags?: string[];
}

export interface CollectionDetailData {
  name: string;
  description?: string;
  sources: CollectionSource[];
  lastUpdate?: string;
}

/**
 * Show collection detail by editing existing message
 */
export async function showCollectionDetail(
  ctx: Context,
  collectionName: string,
): Promise<void> {
  const collection = await loadCollection(collectionName);

  if (!collection) {
    await ctx.answerCallbackQuery("Коллекция не найдена");
    return;
  }

  const detailData: CollectionDetailData = {
    name: collection.name,
    description: collection.description,
    sources: collection.sources || [],
    lastUpdate: new Date().toLocaleDateString("ru-RU"),
  };

  // Build header
  let header = `🔥 ${detailData.name}`;
  if (detailData.lastUpdate) {
    header += `\n📊 Последнее обновление: ${detailData.lastUpdate}`;
  }
  header += `\n🔗 ${detailData.sources.length} источников | 📰 ${detailData.sources.length} статей`;

  // Build source display
  let sourceText = "";
  for (const source of detailData.sources) {
    sourceText += `\n📰 ${source.name}`;
    sourceText += `\n   ${source.url}`;
  }

  const text = header + sourceText;
  const keyboard = buildCollectionDetailKeyboard(collectionName);

  await ctx.editMessageText(text, {
    reply_markup: keyboard,
  });
}

/**
 * Show collection detail as new message
 */
export async function showCollectionDetailNew(
  ctx: Context,
  collectionName: string,
): Promise<void> {
  const collection = await loadCollection(collectionName);

  if (!collection) {
    await ctx.reply("❌ Коллекция не найдена");
    return;
  }

  let text = `🔥 ${collection.name}\n\n`;
  text += `📊 Последнее обновление: ${new Date().toLocaleDateString("ru-RU")}\n`;
  text += `🔗 ${collection.sources?.length || 0} источников\n\n`;

  // List sources
  for (const source of collection.sources || []) {
    text += `📰 ${source.name}\n`;
    text += `   ${source.url}\n\n`;
  }

  const keyboard = buildCollectionDetailKeyboard(collectionName);

  await ctx.reply(text, {
    reply_markup: keyboard,
  });
}

/**
 * Load collection from storage
 * This is a placeholder - implement based on actual storage
 */
async function loadCollection(
  _collectionName: string,
): Promise<CollectionDetailData | null> {
  // TODO: Implement actual collection loading from url_collections.py
  // For now, return null
  return null;
}
