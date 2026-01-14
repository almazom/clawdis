# Card 12: Telegram Collection Callback

| Field | Value |
|-------|-------|
| **ID** | AGI-12 |
| **Story Points** | 2 |
| **Depends On** | 07, 11 |
| **Sprint** | Phase 3 |

## User Story

> As a developer, I want a unified callback handler for all collection actions.

## Context

Read before starting:
- Callback data format from card 07
- All collection actions need routing

## Instructions

### Step 1: Create Callback Handler

```bash
# Create: src/telegram/collection-callback.ts
```

```typescript
import { Context, Telegraf } from 'telegraf';
import { showCollectionsMenu } from './collection-menu';
import { showCollectionDetailNew } from './collection-detail';
import { generateCollectionReport } from './collection-report';
import { delete_collection } from '../../../ask_cli_agents/url_collections';

type CallbackAction =
  | 'list'
  | 'show'
  | 'report'
  | 'edit'
  | 'refresh'
  | 'settings'
  | 'delete'
  | 'add_source'
  | 'save';

interface ParsedCallback {
  action: CallbackAction;
  collection?: string;
  extra?: string;
}

export function parseCallbackData(data: string): ParsedCallback {
  const parts = data.split(':');
  return {
    action: parts[1] as CallbackAction,
    collection: parts[2],
    extra: parts[3],
  };
}

export function setupCollectionCallbacks(bot: Telegraf): void {
  bot.action(/^coll:(.+)$/, async (ctx: Context) => {
    const callbackData = ctx.match[1];
    const parsed = parseCallbackData(`coll:${callbackData}`);

    try {
      switch (parsed.action) {
        case 'list':
          await showCollectionsMenu(ctx);
          break;

        case 'show':
          if (parsed.collection) {
            await showCollectionDetailNew(ctx, parsed.collection);
          }
          break;

        case 'report':
          if (parsed.collection) {
            await generateCollectionReport(ctx, parsed.collection);
          }
          break;

        case 'edit':
          if (parsed.collection) {
            await ctx.answerCbQuery('Редактирование: ' + parsed.collection);
          }
          break;

        case 'refresh':
          if (parsed.collection) {
            await ctx.answerCbQuery('Обновление...');
            await generateCollectionReport(ctx, parsed.collection);
          }
          break;

        case 'settings':
          if (parsed.collection) {
            await ctx.answerCbQuery('Настройки: ' + parsed.collection);
          }
          break;

        case 'delete':
          if (parsed.collection) {
            await ctx.editMessageText(
              `🗑️ Удалить коллекцию "${parsed.collection}"?\n\nЭто действие нельзя отменить.`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '✅ Да, удалить', callback_data: `coll:delete_confirm:${parsed.collection}` },
                      { text: '❌ Отмена', callback_data: `coll:show:${parsed.collection}` },
                    ],
                  ],
                },
              }
            );
          }
          break;

        case 'delete_confirm':
          if (parsed.collection) {
            delete_collection(parsed.collection);
            await ctx.editMessageText(`✅ Коллекция "${parsed.collection}" удалена`);
          }
          break;

        case 'add_source':
          if (parsed.collection) {
            await ctx.answerCbQuery('Добавление источника...');
          }
          break;

        case 'save':
          if (parsed.collection) {
            await ctx.answerCbQuery('Сохранение...');
          }
          break;
      }

      // Answer callback query
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Callback error:', error);
      await ctx.answerCbQuery('Ошибка');
    }
  });
}
```

## Acceptance Criteria

- [ ] File created: `src/telegram/collection-callback.ts`
- [ ] `setupCollectionCallbacks()` function works
- [ ] Routes all callback actions correctly
- [ ] Delete confirmation flow works
- [ ] Type checking passes

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 12 to "completed"
3. Read next card: [13-skill-files](./13-skill-files.md)
4. Continue execution
