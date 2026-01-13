import type { Bot, Context } from "grammy";

interface CreateSession {
  step: "name" | "description" | "sources" | "complete";
  name?: string;
  description?: string;
}

// In-memory session storage (use Redis in production)
const createSessions = new Map<number, CreateSession>();

/**
 * Setup collection creation flow
 */
export function setupCollectionCreate(bot: Bot<Context>): void {
  // Start creation flow
  bot.on("callback_query:data", async (ctx, next) => {
    const data = ctx.callbackQuery?.data;
    if (!data) {
      await next();
      return;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) {
      await next();
      return;
    }

    // Start creation
    if (data === "coll:create_start") {
      createSessions.set(chatId, { step: "name" });

      await ctx.editMessageText(
        "➕ СОЗДАНИЕ НОВОЙ КОЛЛЕКЦИИ\n\nШаг 1/3: Введите название коллекции",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔙 Отмена", callback_data: "coll:create_cancel" }],
            ],
          },
        },
      );
      await ctx.answerCallbackQuery();
      return;
    }

    // Cancel creation
    if (data === "coll:create_cancel") {
      if (chatId) createSessions.delete(chatId);

      await ctx.editMessageText("❌ Создание отменено");
      await ctx.answerCallbackQuery();
      return;
    }

    // Skip description
    if (data === "coll:create_skip_desc") {
      const session = createSessions.get(chatId);
      if (session) {
        session.step = "sources";

        await ctx.editMessageText(
          "➕ СОЗДАНИЕ НОВОЙ КОЛЛЕКЦИИ\n\nШаг 3/3: Добавьте первый источник (URL)",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "⏭️ Пропустить", callback_data: "coll:create_skip_sources" },
                  { text: "🔙 Назад", callback_data: "coll:create_back_desc" },
                ],
              ],
            },
          },
        );
      }
      await ctx.answerCallbackQuery();
      return;
    }

    // Skip sources / Finish without sources
    if (data === "coll:create_skip_sources") {
      const session = createSessions.get(chatId);
      if (session && session.name) {
        await createCollection(session.name, session.description || "");

        await ctx.editMessageText(
          `✅ Коллекция "${session.name}" создана!`,
          {},
        );

        createSessions.delete(chatId);
      }
      await ctx.answerCallbackQuery();
      return;
    }

    // Add more sources
    if (data === "coll:create_add_more") {
      await ctx.answerCallbackQuery();
      await ctx.reply(
        "➕ ДОБАВЛЕНИЕ ИСТОЧНИКА\n\nВведите URL источника",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "✓ Готово", callback_data: "coll:create_finish" }],
            ],
          },
        },
      );
      return;
    }

    // Finish creation
    if (data === "coll:create_finish") {
      const session = createSessions.get(chatId);
      if (session && session.name) {
        await createCollection(session.name, session.description || "");

        await ctx.editMessageText(
          `✅ Коллекция "${session.name}" создана!`,
          {},
        );

        createSessions.delete(chatId);
      }
      await ctx.answerCallbackQuery();
      return;
    }

    await next();
  });

  // Handle name input (text message)
  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const session = createSessions.get(chatId);
    if (!session) return;

    const text = ctx.message.text;

    if (session.step === "name") {
      session.name = text;
      session.step = "description";

      await ctx.reply(
        "➕ СОЗДАНИЕ НОВОЙ КОЛЛЕКЦИИ\n\nШаг 2/3: Описание (опционально)",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "⏭️ Пропустить", callback_data: "coll:create_skip_desc" },
                { text: "🔙 Назад", callback_data: "coll:create_back_name" },
              ],
            ],
          },
        },
      );
    } else if (session.step === "description") {
      session.description = text;
      session.step = "sources";

      await ctx.reply(
        "➕ СОЗДАНИЕ НОВОЙ КОЛЛЕКЦИИ\n\nШаг 3/3: Добавьте первый источник (URL)",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "⏭️ Пропустить", callback_data: "coll:create_skip_sources" },
                { text: "🔙 Назад", callback_data: "coll:create_back_desc" },
              ],
            ],
          },
        },
      );
    } else if (session.step === "sources") {
      const url = text;
      if (session.name && isValidUrl(url)) {
        await addToCollection(session.name, url, url);

        await ctx.reply(`✅ Добавлен: ${url}`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "➕ Добавить еще", callback_data: "coll:create_add_more" }],
              [{ text: "✓ Готово", callback_data: "coll:create_finish" }],
            ],
          },
        });
      }
    }
  });
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create collection via URL collections module
 */
async function createCollection(
  _name: string,
  _description: string,
): Promise<void> {
  // TODO: Implement actual collection creation via url_collections.py
}

/**
 * Add source to collection
 */
async function addToCollection(
  _name: string,
  _url: string,
  _title: string,
): Promise<void> {
  // TODO: Implement actual source addition via url_collections.py
}
