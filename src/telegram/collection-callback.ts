import type { Bot, Context } from "grammy";
import { showCollectionsMenu } from "./collection-menu.js";
import {
  showCollectionDetail,
  showCollectionDetailNew,
} from "./collection-detail.js";
import { generateCollectionReport } from "./collection-report.js";

type CallbackAction =
  | "list"
  | "show"
  | "report"
  | "edit"
  | "refresh"
  | "settings"
  | "delete"
  | "delete_confirm"
  | "add_source"
  | "save";

interface ParsedCallback {
  action: CallbackAction;
  collection?: string;
  extra?: string;
}

/**
 * Parse callback data into structured form
 */
export function parseCallbackData(data: string): ParsedCallback {
  const parts = data.split(":");
  return {
    action: parts[1] as CallbackAction,
    collection: parts[2],
    extra: parts[3],
  };
}

/**
 * Setup unified callback handler for all collection actions
 */
export function setupCollectionCallbacks(bot: Bot<Context>): void {
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data;
    if (!data || !data.startsWith("coll:")) {
      await next();
      return;
    }

    const parsed = parseCallbackData(data);

    try {
      switch (parsed.action) {
        case "list":
          await showCollectionsMenu(ctx);
          break;

        case "show":
          if (parsed.collection) {
            await showCollectionDetailNew(ctx, parsed.collection);
          }
          break;

        case "report":
          if (parsed.collection) {
            await generateCollectionReport(ctx, parsed.collection);
          }
          break;

        case "edit":
          if (parsed.collection) {
            await ctx.answerCallbackQuery(`Редактирование: ${parsed.collection}`);
          }
          break;

        case "refresh":
          if (parsed.collection) {
            await ctx.answerCallbackQuery("Обновление...");
            await generateCollectionReport(ctx, parsed.collection);
          }
          break;

        case "settings":
          if (parsed.collection) {
            await ctx.answerCallbackQuery(`Настройки: ${parsed.collection}`);
          }
          break;

        case "delete":
          if (parsed.collection) {
            await ctx.editMessageText(
              `🗑️ Удалить коллекцию "${parsed.collection}"?\n\nЭто действие нельзя отменить.`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "✅ Да, удалить",
                        callback_data: `coll:delete_confirm:${parsed.collection}`,
                      },
                      {
                        text: "❌ Отмена",
                        callback_data: `coll:show:${parsed.collection}`,
                      },
                    ],
                  ],
                },
              },
            );
          }
          break;

        case "delete_confirm":
          if (parsed.collection) {
            await deleteCollection(parsed.collection);
            await ctx.editMessageText(
              `✅ Коллекция "${parsed.collection}" удалена`,
            );
          }
          break;

        case "add_source":
          if (parsed.collection) {
            await ctx.answerCallbackQuery("Добавление источника...");
          }
          break;

        case "save":
          if (parsed.collection) {
            await ctx.answerCallbackQuery("Сохранение...");
          }
          break;
      }

      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error("Callback error:", error);
      await ctx.answerCallbackQuery("Ошибка");
    }
  });
}

/**
 * Delete collection via url_collections.py
 */
async function deleteCollection(_collectionName: string): Promise<void> {
  // TODO: Implement actual deletion
}
