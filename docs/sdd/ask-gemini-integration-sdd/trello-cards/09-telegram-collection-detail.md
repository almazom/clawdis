# Card 09: Telegram Collection Detail

| Field | Value |
|-------|-------|
| **ID** | AGI-09 |
| **Story Points** | 2 |
| **Depends On** | 08 |
| **Sprint** | Phase 3 |

## User Story

> As a user, I want to see detailed view of a collection with sources and actions.

## Context

Read before starting:
- [ui-flow.md](../ui-flow.md) - Section 2
- Collection detail keyboard from card 07

## Instructions

### Step 1: Create Detail Module

```bash
# Create: src/telegram/collection-detail.ts
```

```typescript
import { Context } from 'telegraf';
import { loadCollection } from '../../../ask_cli_agents/url_collections';
import { buildCollectionDetailKeyboard, buildSourceRow } from './collection-keyboard';

export interface CollectionDetailData {
  name: string;
  description?: string;
  sources: Array<{
    name: string;
    url: string;
    priority?: number;
    tags?: string[];
  }>;
  lastUpdate?: string;
}

export async function showCollectionDetail(
  ctx: Context,
  collectionName: string
): Promise<void> {
  const collection = loadCollection(collectionName);

  if (!collection) {
    await ctx.answerCbQuery('Коллекция не найдена');
    return;
  }

  const detailData: CollectionDetailData = {
    name: collection.name,
    description: collection.description,
    sources: collection.sources || [],
    lastUpdate: new Date().toLocaleDateString('ru-RU'),
  };

  // Build header
  let header = `🔥 ${detailData.name}`;
  if (detailData.lastUpdate) {
    header += `\n📊 Последнее обновление: ${detailData.lastUpdate}`;
  }
  header += `\n🔗 ${detailData.sources.length} источников`;

  // Build source rows
  const sourceRows = detailData.sources.map((source) =>
    buildSourceRow(source.name, source.url, source.priority)
  );

  // Build keyboard
  const keyboard = buildCollectionDetailKeyboard(collectionName);

  // Send message
  await ctx.editMessageText(header, {
    reply_markup: { inline_keyboard: keyboard },
  });
}

export async function showCollectionDetailNew(
  ctx: Context,
  collectionName: string
): Promise<void> {
  const collection = loadCollection(collectionName);

  if (!collection) {
    await ctx.reply('❌ Коллекция не найдена');
    return;
  }

  let text = `🔥 ${collection.name}\n\n`;
  text += `📊 Последнее обновление: ${new Date().toLocaleDateString('ru-RU')}\n`;
  text += `🔗 ${collection.sources?.length || 0} источников\n\n`;

  // List sources
  for (const source of collection.sources || []) {
    text += `📰 ${source.name}\n`;
    text += `   ${source.url}\n\n`;
  }

  const keyboard = buildCollectionDetailKeyboard(collectionName);

  await ctx.reply(text, {
    reply_markup: { inline_keyboard: keyboard },
  });
}
```

## Acceptance Criteria

- [ ] File created: `src/telegram/collection-detail.ts`
- [ ] `showCollectionDetail()` function works (edit message)
- [ ] `showCollectionDetailNew()` works (new message)
- [ ] Shows collection name, description, sources
- [ ] Type checking passes

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 09 to "completed"
3. Read next card: [10-telegram-collection-create](./10-telegram-collection-create.md)
4. Continue execution
