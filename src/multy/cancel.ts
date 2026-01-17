import { InlineKeyboard } from "grammy";

export const MULTY_CANCEL_CALLBACK_PREFIX = "multy:cancel:";
const OWNER_ID_PREFIX = "u";

export function createMultyCancelButton(params: {
  runId: string;
  ownerId?: number;
}): InlineKeyboard {
  const ownerSegment =
    params.ownerId !== undefined ? `${OWNER_ID_PREFIX}${params.ownerId}:` : "";
  const callbackData = `${MULTY_CANCEL_CALLBACK_PREFIX}${ownerSegment}${params.runId}`;
  return new InlineKeyboard().text("Отменить", callbackData);
}

export function parseMultyCancelCallbackData(data: string): {
  runId: string;
  ownerId?: number;
} | null {
  if (!data.startsWith(MULTY_CANCEL_CALLBACK_PREFIX)) {
    return null;
  }
  const payload = data.slice(MULTY_CANCEL_CALLBACK_PREFIX.length);
  if (!payload) return null;
  const colonIndex = payload.indexOf(":");
  if (colonIndex === -1) {
    return { runId: payload };
  }
  const maybeOwner = payload.slice(0, colonIndex);
  const runId = payload.slice(colonIndex + 1);
  if (!runId) return null;
  if (
    maybeOwner.startsWith(OWNER_ID_PREFIX) &&
    /^\d+$/.test(maybeOwner.slice(OWNER_ID_PREFIX.length))
  ) {
    return {
      runId,
      ownerId: Number(maybeOwner.slice(OWNER_ID_PREFIX.length)),
    };
  }
  if (/^\d+$/.test(maybeOwner)) {
    return { runId, ownerId: Number(maybeOwner) };
  }
  return { runId: payload };
}
