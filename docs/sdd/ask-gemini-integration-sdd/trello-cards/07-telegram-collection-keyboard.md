# Card 07: Telegram Collection Keyboard

| Field | Value |
|-------|-------|
| **ID** | AGI-07 |
| **Story Points** | 3 |
| **Depends On** | 06 |
| **Sprint** | Phase 3 |

## User Story

> As a user, I want to see collections in an inline keyboard with action buttons.

## Context

Read before starting:
- [ui-flow.md](../ui-flow.md) - Section 1
- Existing Telegram bot code structure
- Inline keyboard patterns

## Instructions

### Step 1: Create Keyboard Module

```bash
# Create new file: src/telegram/collection-keyboard.ts
```

```typescript
import type { InlineKeyboardButton } from 'telegraf/typings/telegram-types';

interface CollectionInfo {
  name: string;
  sourceCount: number;
  lastUpdate?: string;
}

export function buildCollectionsKeyboard(collections: CollectionInfo[]): InlineKeyboardButton[][] {
  const keyboard: InlineKeyboardButton[][] = [];

  for (const coll of collections) {
    const row: InlineKeyboardButton[] = [
      {
        text: `🔥 ${coll.name} (${coll.sourceCount})`,
        callback_data: `coll:show:${coll.name}`,
      },
      {
        text: '📊',
        callback_data: `coll:report:${coll.name}`,
      },
      {
        text: '📝',
        callback_data: `coll:edit:${coll.name}`,
      },
      {
        text: '🔄',
        callback_data: `coll:refresh:${coll.name}`,
      },
    ];
    keyboard.push(row);
  }

  // Add "Create new" button
  keyboard.push([{
    text: '➕ Создать новую',
    callback_data: 'coll:create_start',
  }]);

  return keyboard;
}

export function buildCollectionDetailKeyboard(collection: string): InlineKeyboardButton[][] {
  return [
    [
      { text: '🔙 Назад к списку', callback_data: 'coll:list' },
      { text: '⚙️', callback_data: `coll:settings:${collection}` },
    ],
    [
      { text: '➕ Добавить источник', callback_data: `coll:add_source:${collection}` },
      { text: '📊 Отчет', callback_data: `coll:report:${collection}` },
    ],
    [
      { text: '🗑️ Удалить коллекцию', callback_data: `coll:delete:${collection}` },
    ],
  ];
}
```

### Step 2: Export from Module

```typescript
// Add to exports
export type { CollectionInfo } from './collection-keyboard';
```

## Acceptance Criteria

- [ ] File created: `src/telegram/collection-keyboard.ts`
- [ ] `buildCollectionsKeyboard()` function works
- [ ] `buildCollectionDetailKeyboard()` function works
- [ ] Callback data format: `coll:action:target`
- [ ] Type checking passes

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 07 to "completed"
3. Read next card: [08-telegram-collection-menu](./08-telegram-collection-menu.md)
4. Continue execution
