import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTelegramBot } from './bot.js';
import type { Message } from 'grammy';

// Mock AiClub module
vi.mock('../commands/ai-club.js', () => ({
  getAiClubReport: vi.fn(),
}));

import { getAiClubReport } from '../commands/ai-club.js';

// Mock grammy
const useSpy = vi.fn();
const onSpy = vi.fn();
const stopSpy = vi.fn();
const sendChatActionSpy = vi.fn();
const sendMessageSpy = vi.fn(async () => ({ message_id: 77 }));
const editMessageTextSpy = vi.fn(async () => ({ message_id: 77 }));

vi.mock('grammy', () => ({
  Bot: class {
    api = {
      config: { use: useSpy },
      sendChatAction: sendChatActionSpy,
      sendMessage: sendMessageSpy,
      editMessageText: editMessageTextSpy,
    };
    on = onSpy;
    stop = stopSpy;
    handleUpdate: any;
    constructor(public token: string) {
      // @ts-ignore
      this.handleUpdate = async (update: any) => {
        // Find the message handler and call it
        const messageHandler = onSpy.mock.calls.find(call => call[0] === 'message')?.[1];
        if (messageHandler) {
          const mockCtx = {
            message: update.message,
            chat: update.message.chat,
            from: update.message.from,
            me: { username: 'testbot' },
            api: this.api,
            reply: (text: string) => this.api.sendMessage(update.message.chat.id, text),
          };
          await messageHandler(mockCtx);
        }
      };
    }
  },
  InputFile: class {},
  webhookCallback: vi.fn(),
}));

const throttlerSpy = vi.fn(() => 'throttler');

vi.mock('@grammyjs/transformer-throttler', () => ({
  apiThrottler: () => throttlerSpy(),
}));

describe('Telegram Bot - AiClub Integration', () => {
  let bot: any;
  const mockToken = 'test-token';
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    bot = createTelegramBot({
      token: mockToken,
      runtime: {
        log: console.log,
        error: console.error,
        exit: () => { throw new Error('exit'); }
      }
    });
    
    // Ensure initial status message is sent successfully
    bot.api.sendMessage.mockResolvedValue({ message_id: 77 });
  });
  
  function createMockMessage(text: string): Message.TextMessage {
    return {
      message_id: 1,
      date: Date.now(),
      chat: {
        id: 123,
        type: 'private',
      },
      from: {
        id: 456,
        is_bot: false,
        first_name: 'Test',
      },
      text: text,
    };
  }
  
  function createMessageUpdate(message: Message) {
    return {
      update_id: 1,
      message: message,
    };
  }
  
  it('triggers ai club day report on /ai_day command', async () => {
    vi.mocked(getAiClubReport).mockResolvedValue({
      summary: 'Daily summary',
      url: 'https://example.com/day'
    });

    const message = createMockMessage('/ai_day');
    await bot.handleUpdate(createMessageUpdate(message));
    
    expect(getAiClubReport).toHaveBeenCalledWith('today');
    
    // Verify result was delivered
    const editCalls = bot.api.editMessageText.mock.calls;
    expect(editCalls[editCalls.length - 1]).toEqual([
      123,
      77,
      expect.stringContaining('Daily summary'),
      { parse_mode: "MarkdownV2", reply_markup: undefined }
    ]);
    expect(editCalls[editCalls.length - 1][2]).toContain('[Полный отчёт](https://example.com/day)');
  });

  it('triggers ai club week report on /ai_week command', async () => {
    vi.mocked(getAiClubReport).mockResolvedValue({
      summary: 'Weekly summary',
      url: 'https://example.com/week'
    });

    const message = createMockMessage('/ai_week');
    await bot.handleUpdate(createMessageUpdate(message));
    
    expect(getAiClubReport).toHaveBeenCalledWith('week');
    
    // Verify result was delivered
    const editCalls = bot.api.editMessageText.mock.calls;
    expect(editCalls[editCalls.length - 1]).toEqual([
      123,
      77,
      expect.stringContaining('Weekly summary'),
      { parse_mode: "MarkdownV2", reply_markup: undefined }
    ]);
  });
  
  it('handles report errors gracefully', async () => {
    vi.mocked(getAiClubReport).mockResolvedValue(null);
    
    const message = createMockMessage('/ai_day');
    await bot.handleUpdate(createMessageUpdate(message));
    
    const calls = bot.api.editMessageText.mock.calls;
    expect(calls[calls.length - 1]).toEqual([
      123,
      77,
      expect.stringContaining('Не удалось получить отчёт'),
      { parse_mode: "MarkdownV2", reply_markup: undefined }
    ]);
  });
});
