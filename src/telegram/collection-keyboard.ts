import { InlineKeyboard } from "grammy";

export interface CollectionInfo {
  name: string;
  sourceCount: number;
  lastUpdate?: string;
}

export function buildCollectionsKeyboard(
  collections: CollectionInfo[],
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  for (const coll of collections) {
    keyboard.row();
    keyboard.text(
      `🔥 ${coll.name} (${coll.sourceCount})`,
      `coll:show:${coll.name}`,
    );
    keyboard.text("📊", `coll:report:${coll.name}`);
    keyboard.text("📝", `coll:edit:${coll.name}`);
    keyboard.text("🔄", `coll:refresh:${coll.name}`);
  }

  // Add "Create new" button
  keyboard.row();
  keyboard.text("➕ Создать новую", "coll:create_start");

  return keyboard;
}

export function buildCollectionDetailKeyboard(
  collection: string,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  keyboard.row();
  keyboard.text("🔙 Назад к списку", "coll:list");
  keyboard.text("⚙️", `coll:settings:${collection}`);

  keyboard.row();
  keyboard.text("➕ Добавить источник", `coll:add_source:${collection}`);
  keyboard.text("📊 Отчет", `coll:report:${collection}`);

  keyboard.row();
  keyboard.text("🗑️ Удалить коллекцию", `coll:delete:${collection}`);

  return keyboard;
}
