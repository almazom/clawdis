# Card 08: Telegram Collection Menu

| Field | Value |
|-------|-------|
| **ID** | AGI-08 |
| **Story Points** | 2 |
| **Depends On** | 07 |
| **Sprint** | Phase 3 |

## User Story

> As a user, I want to see a main menu with all my collections.

## Context

Read before starting:
- [ui-flow.md](../ui-flow.md) - Section 1
- Collection keyboard from card 07
- URL collections loading logic

## Instructions

### Step 1: Create Menu Module

```bash
# Create: src/telegram/collection-menu.ts
```

```typescript
import { Telegraf, Context } from 'telegraf';
import { loadCollection, list_collections } from '../../../ask_cli_agents/url_collections';
import { buildCollectionsKeyboard } from './collection-keyboard';

interface CollectionMenuConfig {
  bot: Telegraf;
  collectionsDir: string;
}

export function setupCollectionMenu(config: CollectionMenuConfig): void {
  const { bot } = config;

  // Handle /collection command
  bot.command('collection', async (ctx: Context) => {
    const collections = list_collections();
    const keyboard = buildCollectionsKeyboard(collections);

    await ctx.reply('📁 ВАШИ КОЛЛЕКЦИИ', {
      reply_markup: { inline_keyboard: keyboard },
    });
  });

  // Handle /collection list
  bot.command('collection list', async (ctx: Context) => {
    const collections = list_collections();
    const keyboard = buildCollectionsKeyboard(collections);

    await ctx.reply('📁 ВАШИ КОЛЛЕКЦИИ', {
      reply_markup: { inline_keyboard: keyboard },
    });
  });
}

export async function showCollectionsMenu(ctx: Context): Promise<void> {
  const collections = list_collections();
  const keyboard = buildCollectionsKeyboard(collections);

  await ctx.reply('📁 ВАШИ КОЛЛЕКЦИИ', {
    reply_markup: { inline_keyboard: keyboard },
  });
}
```

## Acceptance Criteria

- [ ] File created: `src/telegram/collection-menu.ts`
- [ ] `/collection` command registered
- [ ] `/collection list` command registered
- [ ] Shows inline keyboard with all collections
- [ ] Type checking passes

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 08 to "completed"
3. Read next card: [09-telegram-collection-detail](./09-telegram-collection-detail.md)
4. Continue execution
