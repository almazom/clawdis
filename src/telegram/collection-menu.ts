import type { Bot, Context } from "grammy";
import { buildCollectionsKeyboard, type CollectionInfo } from "./collection-keyboard.js";

/**
 * Setup collection menu commands and handlers
 */
export function setupCollectionMenu(bot: Bot<Context>): void {
  // Handle /collection command
  bot.command("collection", async (ctx) => {
    const collections = await listCollections();
    const keyboard = buildCollectionsKeyboard(collections);

    await ctx.reply("📁 ВАШИ КОЛЛЕКЦИИ", {
      reply_markup: keyboard,
    });
  });

  // Handle /collection list
  bot.command("collection list", async (ctx) => {
    const collections = await listCollections();
    const keyboard = buildCollectionsKeyboard(collections);

    await ctx.reply("📁 ВАШИ КОЛЛЕКЦИИ", {
      reply_markup: keyboard,
    });
  });
}

/**
 * Show collections menu in a context
 */
export async function showCollectionsMenu(ctx: Context): Promise<void> {
  const collections = await listCollections();
  const keyboard = buildCollectionsKeyboard(collections);

  await ctx.reply("📁 ВАШИ КОЛЛЕКЦИИ", {
    reply_markup: keyboard,
  });
}

/**
 * List available collections
 * This is a placeholder - implement based on actual storage
 */
async function listCollections(): Promise<CollectionInfo[]> {
  // TODO: Implement actual collection listing from url_collections.py
  // For now, return empty array
  return [];
}
