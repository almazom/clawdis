# Card 10: Telegram Collection Create

| Field | Value |
|-------|-------|
| **ID** | AGI-10 |
| **Story Points** | 2 |
| **Depends On** | 08 |
| **Sprint** | Phase 3 |

## User Story

> As a user, I want to create a new collection through a step-by-step Telegram flow.

## Context

Read before starting:
- [ui-flow.md](../ui-flow.md) - Section 3
- Collection creation flow (3 steps)

## Instructions

### Step 1: Create Module

```bash
# Create: src/telegram/collection-create.ts
```

```typescript
import { Context, Telegraf } from 'telegraf';
import { create_collection, add_to_collection } from '../../../ask_cli_agents/url_collections';

interface CreateSession {
  step: 'name' | 'description' | 'sources' | 'complete';
  name?: string;
  description?: string;
}

// In-memory session storage (use Redis in production)
const createSessions = new Map<number, CreateSession>();

export function setupCollectionCreate(bot: Telegraf): void {
  // Start creation flow
  bot.action('coll:create_start', async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    createSessions.set(chatId, { step: 'name' });

    await ctx.editMessageText(
      '➕ СОЗДАНИЕ НОВОЙ КОЛЛЕКЦИИ\n\nШаг 1/3: Введите название коллекции',
      {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Отмена', callback_data: 'coll:create_cancel' }]],
        },
      }
    );
  });

  // Cancel creation
  bot.action('coll:create_cancel', async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (chatId) createSessions.delete(chatId);

    await ctx.editMessageText('❌ Создание отменено');
  });

  // Handle name input (text message)
  bot.on('text', async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const session = createSessions.get(chatId);
    if (!session) return;

    const text = ctx.message.text;

    if (session.step === 'name') {
      session.name = text;
      session.step = 'description';

      await ctx.reply(
        '➕ СОЗДАНИЕ НОВОЙ КОЛЛЕКЦИИ\n\nШаг 2/3: Описание (опционально)',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '⏭️ Пропустить', callback_data: 'coll:create_skip_desc' },
                { text: '🔙 Назад', callback_data: 'coll:create_back_name' },
              ],
            ],
          },
        }
      );
    } else if (session.step === 'description') {
      session.description = text;
      session.step = 'sources';

      await ctx.reply(
        '➕ СОЗДАНИЕ НОВОЙ КОЛЛЕКЦИИ\n\nШаг 3/3: Добавьте первый источник (URL)',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '⏭️ Пропустить', callback_data: 'coll:create_skip_sources' }],
              [{ text: '🔙 Назад', callback_data: 'coll:create_back_desc' }],
            ],
          },
        }
      );
    } else if (session.step === 'sources') {
      const url = text;
      if (session.name && isValidUrl(url)) {
        await add_to_collection(session.name, url, url);

        await ctx.reply(
          `✅ Добавлен: ${url}`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '➕ Добавить еще', callback_data: 'coll:create_add_more' }],
                [{ text: '✓ Готово', callback_data: 'coll:create_finish' }],
              ],
            },
          }
        );
      }
    }
  });

  // Finish creation
  bot.action('coll:create_finish', async (ctx: Context) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const session = createSessions.get(chatId);
    if (!session || !session.name) return;

    // Create collection
    create_collection(session.name, session.description || '');

    await ctx.editMessageText(
      `✅ Коллекция "${session.name}" создана!`,
      {}
    );

    createSessions.delete(chatId);
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
```

## Acceptance Criteria

- [ ] File created: `src/telegram/collection-create.ts`
- [ ] 3-step creation flow works
- [ ] Cancel functionality works
- [ ] Adds sources to collection
- [ ] Type checking passes

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 10 to "completed"
3. Read next card: [11-telegram-collection-report](./11-telegram-collection-report.md)
4. Continue execution
