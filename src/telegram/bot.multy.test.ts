import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";
import { stat, unlink } from "node:fs/promises";
import type { Message } from "grammy";

import { createTelegramBot } from "./bot.js";

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    execFile: actual.execFile,
    spawn: spawnMock,
  };
});

vi.mock("../config/config.js", () => ({
  loadConfig: () => ({
    telegram: { autoCategorize: false },
  }),
}));

const useSpy = vi.fn();
const onSpy = vi.fn();
const stopSpy = vi.fn();
const sendChatActionSpy = vi.fn();
const sendMessageSpy = vi.fn(async () => ({ message_id: 77 }));
const editMessageTextSpy = vi.fn(async () => ({ message_id: 77 }));
const editMessageReplyMarkupSpy = vi.fn(async () => ({ message_id: 77 }));
const answerCallbackQuerySpy = vi.fn(async () => ({}));

vi.mock("grammy", () => ({
  Bot: class {
    api = {
      config: { use: useSpy },
      sendChatAction: sendChatActionSpy,
      sendMessage: sendMessageSpy,
      editMessageText: editMessageTextSpy,
      editMessageReplyMarkup: editMessageReplyMarkupSpy,
    };
    on = onSpy;
    stop = stopSpy;
    handleUpdate: any;
    constructor(public token: string) {
      // @ts-ignore
      this.handleUpdate = async (update: any) => {
        const messageHandler = onSpy.mock.calls.find(
          (call) => call[0] === "message",
        )?.[1];
        if (update.message && messageHandler) {
          const mockCtx = {
            message: update.message,
            chat: update.message.chat,
            from: update.message.from,
            me: { username: "testbot" },
            api: this.api,
            reply: (text: string, options?: Record<string, unknown>) =>
              this.api.sendMessage(update.message.chat.id, text, options),
          };
          await messageHandler(mockCtx);
        }

        const callbackHandler = onSpy.mock.calls.find(
          (call) => call[0] === "callback_query:data",
        )?.[1];
        if (update.callback_query && callbackHandler) {
          const callbackMessage = update.callback_query.message ?? {};
          const chat = callbackMessage.chat ?? update.callback_query.chat;
          const mockCtx = {
            callbackQuery: update.callback_query,
            chat,
            from: update.callback_query.from,
            me: { username: "testbot" },
            api: this.api,
            answerCallbackQuery: answerCallbackQuerySpy,
            reply: (text: string, options?: Record<string, unknown>) =>
              this.api.sendMessage(chat.id, text, options),
          };
          await callbackHandler(mockCtx);
        }
      };
    }
  },
  InlineKeyboard: class {
    callbackData?: string;
    text(_label: string, data?: string) {
      if (data) {
        this.callbackData = data;
      }
      return this;
    }
  },
  InputFile: class {},
  webhookCallback: vi.fn(),
}));

const throttlerSpy = vi.fn(() => "throttler");

vi.mock("@grammyjs/transformer-throttler", () => ({
  apiThrottler: () => throttlerSpy(),
}));

describe("Telegram Bot - Multy Integration", () => {
  const chatId = 987654321;
  const lockPath = `/tmp/clawdis/multy-${chatId}.lock`;
  let bot: any;
  let autoClose = true;
  let lastChild: any;

  beforeEach(async () => {
    vi.useRealTimers();
    vi.clearAllMocks();
    await unlink(lockPath).catch(() => {});
    autoClose = true;
    lastChild = undefined;

    spawnMock.mockImplementation(() => {
      const child = new EventEmitter() as any;
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = vi.fn(() => {
        child.killed = true;
        return true;
      });
      child.exitCode = null;
      child.signalCode = null;
      child.killed = false;
      child.pid = 4242;
      lastChild = child;

      const originalOnce = child.once.bind(child);
      child.once = (event: string, listener: (...args: any[]) => void) => {
        const result = originalOnce(event, listener);
        if (event === "close" && autoClose) {
          queueMicrotask(() => {
            const summary = JSON.stringify({
              pipeline_version: "1",
              run_id: "run-1",
              article_url: "https://example.com/article",
              raw_url: "https://example.com/raw",
              prompt: "Test prompt",
            });
            child.stdout.emit("data", Buffer.from(`${summary}\n`));
            child.emit("close", 0, null);
          });
        }
        return result;
      };

      return child;
    });

    sendMessageSpy.mockResolvedValue({ message_id: 77 });

    bot = createTelegramBot({
      token: "test-token",
      runtime: {
        log: console.log,
        error: console.error,
        exit: () => {
          throw new Error("exit");
        },
      },
    });
  });

  function createMockMessage(text: string): Message.TextMessage {
    return {
      message_id: 1,
      date: Date.now(),
      chat: {
        id: chatId,
        type: "private",
      },
      from: {
        id: 456,
        is_bot: false,
        first_name: "Test",
      },
      text,
    };
  }

  function createMessageUpdate(message: Message) {
    return {
      update_id: 1,
      message,
    };
  }

  async function waitFor(
    condition: () => boolean | Promise<boolean>,
    timeoutMs = 1000,
  ) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await condition()) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("timeout waiting for condition");
  }

  async function waitForLock(path: string, timeoutMs = 1000) {
    await waitFor(async () => {
      try {
        await stat(path);
        return true;
      } catch {
        return false;
      }
    }, timeoutMs);
  }

  it("runs multy pipeline and delivers result", async () => {
    const message = createMockMessage("/multy тестовая тема");
    await bot.handleUpdate(createMessageUpdate(message));

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [bin, args] = spawnMock.mock.calls[0];
    expect(bin).toBe("multy");
    expect(args).toContain("тестовая тема");

    const statusCall = sendMessageSpy.mock.calls[0];
    expect(statusCall[0]).toBe(chatId);
    expect(statusCall[2]?.parse_mode).toBe("HTML");
    expect(statusCall[2]?.reply_markup).toBeTruthy();

    expect(editMessageTextSpy).toHaveBeenCalled();

    const resultCall = sendMessageSpy.mock.calls.at(-1);
    expect(resultCall?.[2]?.parse_mode).toBe("MarkdownV2");
    expect(resultCall?.[1]).toContain("https://example.com/article");
    expect(resultCall?.[1]).toContain("https://example.com/raw");

    expect(editMessageReplyMarkupSpy).toHaveBeenCalled();
  });

  it("clears lock when status update fails", async () => {
    editMessageTextSpy.mockRejectedValueOnce(new Error("boom"));
    const message = createMockMessage("/multy тестовая тема");
    await bot.handleUpdate(createMessageUpdate(message));

    await expect(stat(lockPath)).rejects.toThrow();
  });

  it("clears lock when multy exits before status update", async () => {
    autoClose = false;
    spawnMock.mockImplementationOnce(() => {
      const child = new EventEmitter() as any;
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.pid = 4242;
      queueMicrotask(() => {
        child.emit("close", 1, null);
      });
      return child;
    });

    const message = createMockMessage("/multy тестовая тема");
    await bot.handleUpdate(createMessageUpdate(message));

    await expect(stat(lockPath)).rejects.toThrow();
  });

  it("cancels multy run and clears lock", async () => {
    autoClose = false;
    const message = createMockMessage("/multy тестовая тема");
    const runPromise = bot.handleUpdate(createMessageUpdate(message));

    await waitForLock(lockPath);
    await waitFor(() => Boolean(lastChild));
    await waitFor(() => sendMessageSpy.mock.calls.length > 0);

    const replyMarkup = sendMessageSpy.mock.calls[0]?.[2]?.reply_markup as
      | { callbackData?: string }
      | undefined;
    const callbackData = replyMarkup?.callbackData;
    expect(callbackData).toMatch(/^multy:cancel:/);

    await bot.handleUpdate({
      update_id: 2,
      callback_query: {
        id: "cb1",
        data: callbackData,
        from: { id: 456 },
        message: {
          message_id: 77,
          chat: { id: chatId, type: "private" },
          text: "status",
        },
      },
    });

    expect(lastChild?.kill).toHaveBeenCalledWith("SIGTERM");

    lastChild.emit("close", 0, null);
    await runPromise;

    await expect(stat(lockPath)).rejects.toThrow();
  });
});
