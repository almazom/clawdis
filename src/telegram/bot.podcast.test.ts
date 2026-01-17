import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTelegramBot } from './bot.js';
import type { Message } from 'grammy';

// Mock TTS executor
vi.mock('../tts/executor.js', () => ({
  executeTTS: vi.fn(),
  isTTSAvailable: vi.fn(() => Promise.resolve(true)),
}));

// Mock grammy
const useSpy = vi.fn();
const onSpy = vi.fn();
const stopSpy = vi.fn();
const sendChatActionSpy = vi.fn();
const sendMessageSpy = vi.fn(async () => ({ message_id: 77 }));
const editMessageTextSpy = vi.fn(async () => ({ message_id: 77 }));
const replyWithAudioSpy = vi.fn(async () => ({ message_id: 78 }));

const throttlerSpy = vi.fn(() => 'throttler');

// Mock apiThrottler
vi.mock('@grammyjs/transformer-throttler', () => ({
  apiThrottler: () => throttlerSpy,
}));

vi.mock('grammy', () => ({
  Bot: class {
    api: any;
    on = onSpy;
    stop = stopSpy;
    handleUpdate: any;
    
    constructor(public token: string) {
      this.api = {
        sendChatAction: sendChatActionSpy,
        sendMessage: sendMessageSpy,
        editMessageText: editMessageTextSpy,
        replyWithAudio: replyWithAudioSpy,
        config: {
          use: vi.fn(),
        }
      };
      // @ts-ignore
      this.handleUpdate = async (update: any) => {
        // Find the message handler and call it
        const messageHandler = onSpy.mock.calls.find(call => call[0] === 'message')?.[1];
        if (messageHandler) {
          const ctx = {
            ...update,
            api: this.api,
            chat: update.message?.chat,
            message: update.message,
            update_id: 1,
            // Add reply method that calls sendMessage
            reply: (text: string, extra?: any) => {
              return this.api.sendMessage(update.message?.chat?.id, text, extra);
            },
            // Add replyWithAudio method
            replyWithAudio: (audio: any, extra?: any) => {
              return this.api.replyWithAudio(update.message?.chat?.id, audio, extra);
            },
          };
          await messageHandler(ctx, async () => {});
        }
      };
    }
  },
  InputFile: class InputFile {},
  webhookCallback: vi.fn(),
}));

describe('Telegram Bot - Podcast Command', () => {
  let bot: any;
  const mockToken = 'test-token';
  
  beforeEach(() => {
    vi.clearAllMocks();
    bot = createTelegramBot({ token: mockToken });
    
    // Ensure API methods are mocked
    bot.api.sendMessage.mockResolvedValue({ message_id: 77 });
  });
  
  it('parses /podcast command correctly', async () => {
    const message = {
      message_id: 1,
      from: { id: 123, username: 'testuser' },
      chat: { id: 123, type: 'private' },
      text: '/podcast Artificial Intelligence',
      date: Date.now(),
    };
    
    await bot.handleUpdate({ message });
    
    const { executeTTS } = await import('../tts/executor.js');
    expect(executeTTS).toHaveBeenCalledWith('Artificial Intelligence', expect.any(Object));
  });
  
  it('handles missing topic gracefully', async () => {
    const message = {
      message_id: 1,
      from: { id: 123, username: 'testuser' },
      chat: { id: 123, type: 'private' },
      text: '/podcast',
      date: Date.now(),
    };
    
    await bot.handleUpdate({ message });
    
    // Check that the error message was sent (it's the last call)
    const calls = bot.api.sendMessage.mock.calls;
    expect(calls[calls.length - 1]).toEqual([
      123,
      expect.stringContaining('Please provide a topic'),
      undefined
    ]);
  });
  
  it('prevents duplicate podcast generation', async () => {
    const { executeTTS } = await import('../tts/executor.js');
    vi.mocked(executeTTS).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true, durationSec: 180 }), 100))
    );
    
    const message = {
      message_id: 1,
      from: { id: 123, username: 'testuser' },
      chat: { id: 123, type: 'private' },
      text: '/podcast AI in Healthcare',
      date: Date.now(),
    };
    
    // Start first generation
    const firstPromise = bot.handleUpdate({ message });
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Try to start second
    await bot.handleUpdate({ message });
    
    // Check that the second-to-last call (or last call) contains the "already in progress" message
    const calls = bot.api.sendMessage.mock.calls;
    expect(calls[calls.length - 1]).toEqual([
      123,
      expect.stringContaining('already in progress'),
      undefined
    ]);
    
    await firstPromise;
  });
});