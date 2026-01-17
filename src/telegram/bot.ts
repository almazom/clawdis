// @ts-nocheck
import { Buffer } from "node:buffer";
import { exec, spawn } from "node:child_process";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

import { apiThrottler } from "@grammyjs/transformer-throttler";
import type { ApiClientOptions, Context, Message } from "grammy";
import { Bot, InputFile, webhookCallback } from "grammy";

import { chunkText } from "../auto-reply/chunk.js";
import { formatAgentEnvelope } from "../auto-reply/envelope.js";
import { getReplyFromConfig } from "../auto-reply/reply.js";
import { isAudio, transcribeInboundAudio } from "../auto-reply/transcription.js";
import type { ReplyPayload } from "../auto-reply/types.js";
import { loadConfig } from "../config/config.js";
import {
  parseDeepResearchCommand,
  normalizeDeepResearchTopic,
  createExecuteButton,
  createRetryButton,
  parseCallbackData,
  CALLBACK_PREFIX,
  CallbackActions,
  executeDeepResearch,
  deliverResults,
  truncateForTelegram,
  messages,
  generateGapQuestions,
  type DeepResearchProgressStage,
} from "../deep-research/index.js";
import { resolveStorePath, updateLastRoute, resolveSessionTranscriptPath, loadSessionStore } from "../config/sessions.js";
import { danger, isVerbose, logVerbose } from "../globals.js";
import { formatErrorMessage } from "../infra/errors.js";
import { categorizeIntent } from "../infra/intent-categorizer.js";
import { getChildLogger } from "../logging.js";
import { mediaKindFromMime } from "../media/constants.js";
import { detectMime } from "../media/mime.js";
import { saveMediaBuffer } from "../media/store.js";
import type { RuntimeEnv } from "../runtime.js";
import { loadWebMedia } from "../web/media.js";
import { startLivenessProbe, type LivenessProbeOptions } from "./liveness-probe.js";
import { messages as webSearchMessages } from "../web-search/messages.js";
import { executeWebSearch } from "../web-search/executor.js";
import { executeMultiAgentWebSearch, formatTelegramWithAgent } from "../web-search/multi-agent.js";
import { getAiClubReport } from "../commands/ai-club.js";
import { getAiReport } from "../commands/ai-report/index.js";
import {
  createTTSButton,
  createTTSProgressButton,
  parseTTSCallbackData,
  TTS_CALLBACK_PREFIX,
  type TTSProgressStage,
} from "../tts/button.js";
import { isTTSEnabled, synthesize } from "../tts/provider.js";
import {
  parseVoiceCommand,
  getLastAssistantMessageFromTranscript,
} from "../tts/voice-command.js";
import { formatTelegramMessage } from "./formatter.js";
import { parseMultyCommand } from "../multy/command.js";
import {
  buildMultyStatusMessage,
  parseMultyJsonl,
  resolveMultyCurrentStepLabel,
  resolveMultyModels,
} from "../multy/status.js";
import { buildMultyResultMessage } from "../multy/result.js";

const PARSE_ERR_RE =
  /can't parse entities|parse entities|find end of the entity/i;
const MESSAGE_NOT_MODIFIED_RE = /message is not modified/i;
const deepResearchInFlight = new Set<number>();
const webSearchInFlight = new Set<number>();
const MULTY_STATUS_INTERVAL_MS = 30_000;

// TTS in-flight tracking with TTL (5 minutes)
const ttsInFlight = new Map<string, number>();
const TTS_IN_FLIGHT_TTL_MS = 5 * 60 * 1000;
const TTS_CLEANUP_INTERVAL_MS = 60 * 1000; // Clean every minute

// Periodic cleanup of expired TTS entries
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, timestamp] of ttsInFlight.entries()) {
    if (now - timestamp > TTS_IN_FLIGHT_TTL_MS) {
      ttsInFlight.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logVerbose(`[tts] Cleaned up ${cleaned} expired in-flight entries`);
  }
}, TTS_CLEANUP_INTERVAL_MS);
const CATEGORY_CONFIDENCE_THRESHOLD = 0.7;
const CATEGORY_MIN_WORDS = 2;
const CATEGORY_MIN_CHARS = 6;
const AUDIO_STATUS_MESSAGE = "○ Голосовое получено. Распознаю...";
const AUDIO_STATUS_DONE = "● Готово";

type StatusMessage = {
  chatId: number;
  messageId: number;
};

type TelegramMessage = Message.CommonMessage;

type TelegramContext = {
  message: TelegramMessage;
  me?: { username?: string };
  getFile: () => Promise<{
    file_path?: string;
  }>;
};

type ReplyMarkup = Parameters<Context["api"]["editMessageText"]>[3]["reply_markup"];

export type TelegramBotOptions = {
  token: string;
  runtime?: RuntimeEnv;
  requireMention?: boolean;
  allowFrom?: Array<string | number>;
  mediaMaxMb?: number;
  proxyFetch?: typeof fetch;
  livenessProbe?: Omit<LivenessProbeOptions, "bot"> | boolean;
};

export function createTelegramBot(opts: TelegramBotOptions) {
  const runtime: RuntimeEnv = opts.runtime ?? {
    log: console.log,
    error: console.error,
    exit: (code: number): never => {
      throw new Error(`exit ${code}`);
    },
  };
  const client: ApiClientOptions | undefined = opts.proxyFetch
    ? { fetch: opts.proxyFetch as unknown as ApiClientOptions["fetch"] }
    : undefined;

  const bot = new Bot(opts.token, { client });
  bot.api.config.use(apiThrottler());

  const cfg = loadConfig();
  const requireMention =
    opts.requireMention ?? cfg.telegram?.requireMention ?? true;
  const allowFrom = opts.allowFrom ?? cfg.telegram?.allowFrom;
  const mediaMaxBytes =
    (opts.mediaMaxMb ?? cfg.telegram?.mediaMaxMb ?? 5) * 1024 * 1024;
  const logger = getChildLogger({ module: "telegram-auto-reply" });

  bot.on("message", async (ctx) => {
    let progressStatus: StatusMessage | null = null;
    try {
      const msg = ctx.message;
      if (!msg) return;
      const chatId = msg.chat.id;
      const isGroup =
        msg.chat.type === "group" || msg.chat.type === "supergroup";

      // Instant acknowledgment at the very beginning
      // Skip for /web commands - they have their own status message
      const rawText = (msg.text ?? msg.caption ?? "").trim();
      const isWebCommand = /^\/web(?:@[a-z0-9_]+)?(?:\s|$)/i.test(rawText);
      const isAiClubCommand = /^\/ai_(day|daily|week)(?:@[a-z0-9_]+)?(?:\s|$)/i.test(rawText);
      const isPingCommand = /^\/ping(?:@[a-z0-9_]+)?(?:\s|$)/i.test(rawText);
      const multyCommand = parseMultyCommand(rawText);
      const isMultyCommand = Boolean(multyCommand);

      // Handle /ping command - TEST CHANGE
      if (isPingCommand) {
        await ctx.reply("🏓 Pong! CLAWDIS is running.");
        return;
      }

      if (!isWebCommand && !isAiClubCommand) {
        try {
          let initialAck = "🤔 Думаю...";
          if (msg.photo) initialAck = "📸 Вижу фото, сейчас посмотрю...";
          else if (msg.video) initialAck = "🎥 Вижу видео, сейчас изучу...";
          else if (msg.voice || msg.audio) initialAck = "🎙️ Слушаю аудио...";
          else if (msg.document) initialAck = "📂 Вижу файл, сейчас проверю...";
          if (isMultyCommand && multyCommand) {
            initialAck = buildMultyStatusMessage({
              topic: multyCommand.topic || "(missing topic)",
              models: resolveMultyModels(),
              elapsedSeconds: 0,
              steps: {},
              notifyEnabled: false,
            });
          }

          const status = await ctx.reply(initialAck);
          progressStatus = {
            chatId: ctx.chat?.id ?? chatId,
            messageId: status.message_id,
          };
        } catch (err) {
          logVerbose(`telegram initial ack failed: ${String(err)}`);
        }
      }

      const sendTyping = async () => {
        try {
          await bot.api.sendChatAction(chatId, "typing");
        } catch (err) {
          logVerbose(
            `telegram typing cue failed for chat ${chatId}: ${String(err)}`,
          );
        }
      };

      // allowFrom for direct chats
      if (!isGroup && Array.isArray(allowFrom) && allowFrom.length > 0) {
        const candidate = String(chatId);
        const allowed = allowFrom.map(String);
        const allowedWithPrefix = allowFrom.map((v) => `telegram:${String(v)}`);
        const permitted =
          allowed.includes(candidate) ||
          allowedWithPrefix.includes(`telegram:${candidate}`) ||
          allowed.includes("*");
        if (!permitted) {
          logVerbose(
            `Blocked unauthorized telegram sender ${candidate} (not in allowFrom)`,
          );
          return;
        }
      }

      const botUsername = ctx.me?.username?.toLowerCase();
      if (
        isGroup &&
        requireMention &&
        botUsername &&
        !hasBotMention(msg, botUsername)
      ) {
        logger.info({ chatId, reason: "no-mention" }, "skipping group message");
        return;
      }

      const media = await resolveMedia(
        ctx,
        mediaMaxBytes,
        opts.token,
        opts.proxyFetch,
      );
      const isAudioInput =
        !msg.text &&
        !msg.caption &&
        media?.contentType &&
        isAudio(media.contentType);
      
      let transcript: string | undefined;
      if (
        isAudioInput
      ) {
        if (progressStatus) {
          await editTelegramMessage(ctx.api, progressStatus, "🎙️ Голосовое получено. Распознаю...");
        }
        const transcribed = await transcribeInboundAudio(
          cfg,
          {
            MediaPath: media.path,
            MediaUrl: media.path,
            MediaType: media.contentType,
            Surface: "telegram",
          },
          runtime,
        );
        transcript = transcribed?.text;
      }
      const messageText = (
        msg.text ??
        msg.caption ??
        transcript ??
        ""
      ).trim();
      if (
        await handleDeepResearchMessage(
          ctx,
          cfg,
          chatId,
          messageText,
          transcript,
          progressStatus,
        )
      ) {
        return;
      }

      // Check for /v voice command
      if (
        await handleVoiceCommand(
          ctx,
          chatId,
          messageText,
          `telegram:${chatId}`,
        )
      ) {
        return;
      }

      // Check for /web command
      const webCommand = parseWebCommand(messageText, botUsername);
      if (webCommand) {
        const query = webCommand.query.trim();
        if (!query) {
          if (progressStatus) {
            await editTelegramMessage(
              ctx.api,
              progressStatus,
              webSearchMessages.error(
                "Please provide a search query after /web",
              ),
            );
          } else {
            await ctx.reply(
              webSearchMessages.error(
                "Please provide a search query after /web",
              ),
            );
          }
          return;
        }
        await runWebSearch(ctx, chatId, query, logger, progressStatus);
        return;
      }

      // Check for /ai_day or /ai_week command
      const aiClubCommand = parseAiClubCommand(messageText, botUsername);
      if (aiClubCommand) {
        await runAiClubAnalysis(ctx, chatId, aiClubCommand.period, logger, progressStatus);
        return;
      }

      // Check for /ai_report command
      const aiReportCommand = parseAiReportCommand(messageText, botUsername);
      if (aiReportCommand) {
        await runAiReportAnalysis(ctx, chatId, aiReportCommand.period, logger, progressStatus);
        return;
      }

      // Only use automatic LLM-based categorization if enabled in config
      if (
        cfg.telegram?.autoCategorize &&
        (await handleCategorizedMessage(
          ctx,
          cfg,
          chatId,
          messageText,
          transcript,
          logger,
          progressStatus,
        ))
      ) {
        return;
      }

      if (isMultyCommand && multyCommand) {
        logger.info(
          { chatId, topic: multyCommand.topic },
          "telegram /multy command received",
        );
        if (!multyCommand.topic) {
          if (progressStatus) {
            await editTelegramMessage(
              ctx.api,
              progressStatus,
              "⚙️ Usage: /multy <topic>",
            );
          } else {
            await ctx.reply("⚙️ Usage: /multy <topic>");
          }
          return;
        }
        await runMultyPipeline({
          ctx,
          chatId,
          topic: multyCommand.topic,
          statusMessage: progressStatus,
          logger,
        });
        return;
      }

      const replyTarget = describeReplyTarget(msg);
      const rawBody = (
        msg.text ??
        msg.caption ??
        transcript ??
        media?.placeholder ??
        ""
      ).trim();
      if (!rawBody) return;
      const replySuffix = replyTarget
        ? `\n\n[Replying to ${replyTarget.sender}]\n${replyTarget.body}\n[/Replying]`
        : "";
      const body = formatAgentEnvelope({
        surface: "Telegram",
        from: isGroup
          ? buildGroupLabel(msg, chatId)
          : buildSenderLabel(msg, chatId),
        timestamp: msg.date ? msg.date * 1000 : undefined,
        body: `${rawBody}${replySuffix}`,
      });

      const ctxPayload = {
        Body: body,
        From: isGroup ? `group:${chatId}` : `telegram:${chatId}`,
        To: `telegram:${chatId}`,
        ChatType: isGroup ? "group" : "direct",
        GroupSubject: isGroup ? (msg.chat.title ?? undefined) : undefined,
        SenderName: buildSenderName(msg),
        Surface: "telegram",
        MessageSid: String(msg.message_id),
        ReplyToId: replyTarget?.id,
        ReplyToBody: replyTarget?.body,
        ReplyToSender: replyTarget?.sender,
        Timestamp: msg.date ? msg.date * 1000 : undefined,
        MediaPath: media?.path,
        MediaType: media?.contentType,
        MediaUrl: media?.path,
        Transcript: transcript,
      };

      if (replyTarget && isVerbose()) {
        const preview = replyTarget.body.replace(/\s+/g, " ").slice(0, 120);
        logVerbose(
          `telegram reply-context: replyToId=${replyTarget.id} replyToSender=${replyTarget.sender} replyToBody="${preview}"`,
        );
      }

      if (!isGroup) {
        const sessionCfg = cfg.session;
        const mainKey = (sessionCfg?.mainKey ?? "main").trim() || "main";
        const storePath = resolveStorePath(sessionCfg?.store);
        await updateLastRoute({
          storePath,
          sessionKey: mainKey,
          channel: "telegram",
          to: String(chatId),
        });
      }

      if (isVerbose()) {
        const preview = body.slice(0, 200).replace(/\n/g, "\\n");
        logVerbose(
          `telegram inbound: chatId=${chatId} from=${ctxPayload.From} len=${body.length} preview="${preview}"`,
        );
      }

      const geminiMarker = "Источник: Gemini CLI";
      let usedGeminiCli = false;

      const appendGeminiMarker = (payload: ReplyPayload): ReplyPayload => {
        if (!usedGeminiCli || !payload.text) return payload;
        if (payload.text.includes(geminiMarker)) return payload;
        const suffix = `\n\n${geminiMarker}`;
        return { ...payload, text: `${payload.text}${suffix}` };
      };

      const replyResult = await getReplyFromConfig(
        ctxPayload,
        {
          onReplyStart: sendTyping,
          waitForFinalReply: true, // Wait for final reply instead of streaming
          // Tool streaming enabled - shows "Using tool: X..." messages
          onToolStart: async ({ name }) => {
            if (name === "web_search" || name === "web_fetch") {
              usedGeminiCli = true;
            }
            if (progressStatus) {
              const displayName =
                name === "web_search" || name === "web_fetch"
                  ? `${name} (Gemini CLI)`
                  : name;
              await editTelegramMessage(
                bot.api,
                progressStatus,
                formatTelegramMessage(`○ Инструмент: *${displayName}*...`),
              );
            }
          },
          onToolResult: async (payload) => {
            const markedPayload = appendGeminiMarker(payload);
            await deliverReplies({
              replies: [markedPayload],
              chatId: String(chatId),
              token: opts.token,
              runtime,
              bot,
              statusMessage: progressStatus,
            });
          },
          // onPartialReply will be suppressed by waitForFinalReply
        },
        cfg,
      );
      const replies = replyResult
        ? Array.isArray(replyResult)
          ? replyResult.map(appendGeminiMarker)
          : [appendGeminiMarker(replyResult)]
        : [];
      if (replies.length === 0) return;

      await deliverReplies({
        replies,
        chatId: String(chatId),
        token: opts.token,
        runtime,
        bot,
        statusMessage: progressStatus,
      });
    } catch (err) {
      // Clean up in-flight sets on error (if chatId was defined)
      if (typeof chatId !== 'undefined' && webSearchInFlight.has(chatId)) {
        webSearchInFlight.delete(chatId);
      }
      runtime.error?.(danger(`Telegram handler failed: ${String(err)}`));
    }
  });

  // Deep Research and TTS button callback handler
  bot.on("callback_query:data", async (ctx, next) => {
    const handled = await handleDeepResearchCallback(ctx, runtime);
    if (!handled) {
      await handleTTSCallback(ctx, runtime);
    }
    if (next) await next();
  });

  // Start liveness probe if enabled
  if (opts.livenessProbe !== false) {
    const livenessOpts =
      typeof opts.livenessProbe === "object" ? opts.livenessProbe : {};
    startLivenessProbe({ bot, ...livenessOpts });
  }

  return bot;
}

export function createTelegramWebhookCallback(
  bot: Bot,
  path = "/telegram-webhook",
) {
  return { path, handler: webhookCallback(bot, "http") };
}

async function handleDeepResearchMessage(
  ctx: Context,
  cfg: ReturnType<typeof loadConfig>,
  chatId: number,
  messageText: string,
  transcript?: string,
  statusMessage?: StatusMessage | null,
): Promise<boolean> {
  if (cfg.deepResearch?.enabled === false) return false;

  if (!messageText) return false;

  const command = parseDeepResearchCommand(messageText);
  if (!command) {
    return false;
  }

  return handleDeepResearchTopic({
    ctx,
    cfg,
    chatId,
    topic: command.topic,
    transcript,
    source: "command",
    respondOnInvalid: true,
    statusMessage,
  });
}

async function handleVoiceCommand(
  ctx: Context,
  chatId: number,
  messageText: string,
  sessionKey: string,
): Promise<boolean> {
  const command = parseVoiceCommand(messageText);
  if (!command) {
    return false;
  }

  // Check if TTS is enabled
  if (!isTTSEnabled()) {
    await ctx.reply("TTS is not enabled. Configure MINIMAX_API_KEY in .env");
    return true;
  }

  let textToSpeak = command.text;

  // If no text provided, get last assistant message from session
  if (!textToSpeak) {
    const cfg = loadConfig();
    const sessionPath = resolveStorePath(cfg.session?.store);
    
    try {
      const store = loadSessionStore(sessionPath);
      const session = store[sessionKey];
      
      if (!session?.sessionId) {
        await ctx.reply("No session found. Send a message first.");
        return true;
      }

      // Get last assistant message from transcript
      const transcriptPath = resolveSessionTranscriptPath(session.sessionId);
      textToSpeak = await getLastAssistantMessageFromTranscript(transcriptPath);
      
      if (!textToSpeak) {
        await ctx.reply("No assistant message found in this session.");
        return true;
      }

      await ctx.reply(`🔊 Generating voice message from last response...`);
    } catch (error) {
      await ctx.reply(`❌ Error reading session: ${error instanceof Error ? error.message : String(error)}`);
      return true;
    }
  } else {
    await ctx.reply(`🔊 Generating voice message...`);
  }

  // Generate TTS
  try {
    const result = await synthesize(textToSpeak, async (progress) => {
      // Progress updates if needed
      logVerbose(`[telegram] TTS progress: ${progress}%`);
    });

    if (!result.success || !result.audioPath) {
      await ctx.reply(`❌ Failed to generate voice: ${result.error || "Unknown error"}`);
      return true;
    }

    // Send the audio file
    const audioFile = new InputFile(result.audioPath, "voice.mp3");
    const caption = result.cached ? "💾 Voice (cached)" : "🎤 Voice message";
    
    await ctx.replyWithVoice(audioFile, {
      caption,
    });

    return true;
  } catch (error) {
    await ctx.reply(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return true;
  }
}

async function handleDeepResearchTopic(params: {
  ctx: Context;
  cfg: ReturnType<typeof loadConfig>;
  chatId: number;
  topic: string;
  transcript?: string;
  source: "command" | "category";
  respondOnInvalid: boolean;
  statusMessage?: StatusMessage | null;
}): Promise<boolean> {
  const { ctx, cfg, chatId, topic, transcript, source, respondOnInvalid } =
    params;
  const trimmedTopic = topic.trim();

  if (!trimmedTopic) {
    if (respondOnInvalid) {
      if (params.statusMessage) {
        await editTelegramMessage(
          ctx.api,
          params.statusMessage,
          messages.invalidTopic(),
        );
      } else {
        await ctx.reply(messages.invalidTopic());
      }
      return true;
    }
    return false;
  }

  const normalized = normalizeDeepResearchTopic(trimmedTopic);
  if (!normalized) {
    if (!respondOnInvalid) return false;
    const questions = await generateGapQuestions({
      request: trimmedTopic,
      cfg,
    });
    if (questions && questions.length > 0) {
      const text = messages.gapQuestions(questions);
      if (params.statusMessage) {
        await editTelegramMessage(ctx.api, params.statusMessage, text);
      } else {
        await ctx.reply(text);
      }
    } else {
      if (params.statusMessage) {
        await editTelegramMessage(
          ctx.api,
          params.statusMessage,
          messages.invalidTopic(),
        );
      } else {
        await ctx.reply(messages.invalidTopic());
      }
    }
    return true;
  }

  const { topic: cleanedTopic, truncated } = normalized;
  const userId = ctx.from?.id;
  if (userId === undefined) {
    if (!respondOnInvalid) return false;
    if (params.statusMessage) {
      await editTelegramMessage(
        ctx.api,
        params.statusMessage,
        messages.missingUserId(),
      );
    } else {
      await ctx.reply(messages.missingUserId());
    }
    return true;
  }

  if (truncated) {
    logVerbose(
      `[deep-research] Topic truncated for ${userId} in chat ${chatId}`,
    );
  }
  const sourceLabel =
    source === "command" ? "Command received" : "Categorized request";
  logVerbose(
    `[deep-research] ${sourceLabel} from ${userId} in chat ${chatId}: "${cleanedTopic}"`,
  );

  const ackText = messages.acknowledgment(cleanedTopic, transcript);
  const replyMarkup = createExecuteButton(cleanedTopic, userId);
  if (params.statusMessage) {
    await editTelegramMessage(
      ctx.api,
      params.statusMessage,
      ackText,
      replyMarkup,
    );
  } else {
    await ctx.reply(ackText, { reply_markup: replyMarkup });
  }

  return true;
}

async function handleCategorizedMessage(
  ctx: Context,
  cfg: ReturnType<typeof loadConfig>,
  chatId: number,
  messageText: string,
  transcript: string | undefined,
  logger: ReturnType<typeof getChildLogger>,
  statusMessage?: StatusMessage | null,
): Promise<boolean> {
  if (!shouldCategorizeMessage(messageText)) {
    return false;
  }

  const result = await categorizeIntent(messageText);
  if (!result || result.confidence < CATEGORY_CONFIDENCE_THRESHOLD) {
    return false;
  }

  const category = normalizeCategory(result.category);
  if (isVerbose()) {
    logVerbose(
      `[intent] category="${result.category}" confidence=${result.confidence} timeMs=${result.timeMs ?? "n/a"}`,
    );
  }

  if (category === "deep") {
    if (cfg.deepResearch?.enabled === false) return false;
    return handleDeepResearchTopic({
      ctx,
      cfg,
      chatId,
      topic: messageText,
      transcript,
      source: "category",
      respondOnInvalid: false,
      statusMessage,
    });
  }

  if (category === "web") {
    if (cfg.webSearch?.enabled === false) return false;
    const query = messageText.trim();
    if (!query) return false;
    await runWebSearch(ctx, chatId, query, logger, statusMessage);
    return true;
  }

  return false;
}

function shouldCategorizeMessage(messageText: string): boolean {
  const trimmed = messageText.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return false;
  if (trimmed.length < CATEGORY_MIN_CHARS) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= CATEGORY_MIN_WORDS;
}

function normalizeCategory(category: string): "deep" | "web" | null {
  const normalized = category.toLowerCase().replace(/[\s_-]+/g, "");
  if (normalized === "deepresearch") return "deep";
  if (normalized === "web" || normalized === "websearch" || normalized === "search") {
    return "web";
  }
  return null;
}

function parseWebCommand(
  messageText: string,
  botUsername?: string,
): { query: string } | null {
  const match =
    /^\/web(?:@([a-z0-9_]+))?(?:\s+([\s\S]+))?$/i.exec(messageText.trim());
  if (!match) return null;
  const mentioned = match[1];
  if (mentioned && botUsername && mentioned.toLowerCase() !== botUsername) {
    return null;
  }
  return { query: (match[2] ?? "").trim() };
}

function parseAiClubCommand(
  messageText: string,
  botUsername?: string,
): { period: "today" | "week" } | null {
  const trimmed = messageText.trim();
  const match = /^\/ai_(day|week)(?:@([a-z0-9_]+))?$/i.exec(trimmed);
  if (!match) return null;
  const cmd = match[1].toLowerCase();
  const period = cmd === "day" ? "today" : "week";
  const mentioned = match[2];
  if (mentioned && botUsername && mentioned.toLowerCase() !== botUsername) {
    return null;
  }
  return { period: period as "today" | "week" };
}

function parseAiReportCommand(
  messageText: string,
  botUsername?: string,
): { period: "today" | "week" } | null {
  const trimmed = messageText.trim();
  const match = /^\/ai_report(?:@([a-z0-9_]+))?$/i.exec(trimmed);
  if (!match) return null;
  const mentioned = match[1];
  if (mentioned && botUsername && mentioned.toLowerCase() !== botUsername) {
    return null;
  }
  return { period: "today" };
}

async function runAiClubAnalysis(
  ctx: Context,
  chatId: number,
  period: "today" | "week",
  logger: ReturnType<typeof getChildLogger>,
  statusMessage?: StatusMessage | null,
): Promise<void> {
  const pipelineStartTime = Date.now();
  const pipelineLog = (step: number | string, emoji: string, message: string) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const elapsed = Date.now() - pipelineStartTime;
    const elapsedStr = elapsed < 1000 ? `+${elapsed}ms` : `+${(elapsed / 1000).toFixed(1)}s`;
    console.log(`[ai-club] ${timestamp} │ ${elapsedStr.padStart(8)} │ ${emoji} STEP ${step} │ ${message}`);
  };

  pipelineLog(1, "📥", `Received /ai_${period === "today" ? "day" : "week"} command`);

  let statusChatId: number | undefined = statusMessage?.chatId;
  let statusMessageId: number | undefined = statusMessage?.messageId;

  try {
    if (!statusMessageId) {
      const statusMsg = await ctx.reply("⚙️ Запускаю аналитику AI Club...");
      statusChatId = ctx.chat?.id;
      statusMessageId = statusMsg.message_id;
    } else {
      await editTelegramMessage(ctx.api, { chatId: statusChatId!, messageId: statusMessageId }, "⚙️ Собираю данные...");
    }

    pipelineLog(2, "🔍", `Fetching ${period} report from AI Club...`);
    const report = await getAiClubReport(period);

    if (!report) {
      pipelineLog(3, "❌", "Failed to get report from ai_club CLI");
      const errorMsg = "✂︎ Не удалось получить отчёт от AI Club. Проверьте логи.";
      await editTelegramMessage(ctx.api, { chatId: statusChatId!, messageId: statusMessageId }, errorMsg);
      return;
    }

    pipelineLog(4, "📝", "Processing simplified report summary...");
    
    // Extract only topics from the summary
    const lines = report.summary.split('\n');
    const topics: string[] = [];
    let inTopics = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('Ключевые темы')) {
        inTopics = true;
        continue;
      }
      if (inTopics) {
        if (trimmed.startsWith('*') || trimmed.startsWith('•') || trimmed.startsWith('-')) {
          topics.push(trimmed);
        } else if (trimmed === '' && topics.length > 0) {
          break;
        } else if (trimmed.startsWith('####') || (trimmed.startsWith('**') && !trimmed.includes(':'))) {
          break;
        }
      }
    }

    const periodLabel = period === "today" ? "Ежедневный" : "Еженедельный";
    const emoji = period === "today" ? "☀️" : "📅";
    const reportUrl =
      report.url || (await publishContent(report.summary, `ai-club-${Date.now()}`));
    const linkPart = reportUrl
      ? `\n\n🔗 [Полный отчёт](${reportUrl})`
      : "\n\n_(Полная версия недоступна)_";

    let resultMessage = `${emoji} *${periodLabel} отчёт AI Club*\n`;
    resultMessage += `📢 Канал: ${report.channel}\n\n`;

    if (topics.length > 0) {
      resultMessage += `*Ключевые темы:*\n${topics.join("\n")}\n`;
    } else {
      resultMessage += `_Темы не найдены._\n`;
    }

    resultMessage += linkPart;

    pipelineLog(5, "📤", "Sending simplified summary to Telegram...");
    await editTelegramMessage(ctx.api, { chatId: statusChatId!, messageId: statusMessageId }, resultMessage);
    pipelineLog(6, "✅", "Report delivered successfully!");

  } catch (error) {
    pipelineLog(99, "💥", `Pipeline FAILED: ${error instanceof Error ? error.message : String(error)}`);
    const errorText = error instanceof Error ? error.message : String(error);
    if (statusChatId && statusMessageId) {
      await editTelegramMessage(ctx.api, { chatId: statusChatId, messageId: statusMessageId }, `❌ Ошибка: ${errorText}`);
    }
  }
}

async function runAiReportAnalysis(
  ctx: Context,
  chatId: number,
  period: "today" | "week",
  logger: ReturnType<typeof getChildLogger>,
  statusMessage?: StatusMessage | null,
): Promise<void> {
  const pipelineStartTime = Date.now();
  const pipelineLog = (step: number | string, emoji: string, message: string) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const elapsed = Date.now() - pipelineStartTime;
    const elapsedStr = elapsed < 1000 ? `+${elapsed}ms` : `+${(elapsed / 1000).toFixed(1)}s`;
    console.log(`[ai-report] ${timestamp} │ ${elapsedStr.padStart(8)} │ ${emoji} STEP ${step} │ ${message}`);
  };

  pipelineLog(1, "📥", `Received /ai_report command (period: ${period})`);

  let statusChatId: number | undefined = statusMessage?.chatId;
  let statusMessageId: number | undefined = statusMessage?.messageId;

  try {
    if (!statusMessageId) {
      const statusMsg = await ctx.reply("⚙️ Генерирую AI Report...");
      statusChatId = ctx.chat?.id;
      statusMessageId = statusMsg.message_id;
    } else {
      await editTelegramMessage(ctx.api, { chatId: statusChatId!, messageId: statusMessageId }, "⚙️ Собираю данные...");
    }

    pipelineLog(2, "🔍", `Fetching ${period} data and generating report...`);
    const report = await getAiReport(period);

    if (!report) {
      pipelineLog(3, "❌", "Failed to generate AI report");
      const errorMsg = "✂︎ Не удалось создать отчёт AI Report. Проверьте логи.";
      await editTelegramMessage(ctx.api, { chatId: statusChatId!, messageId: statusMessageId }, errorMsg);
      return;
    }

    pipelineLog(4, "📤", "Sending report to Telegram...");

    // Send the pre-formatted report summary
    await editTelegramMessage(ctx.api, { chatId: statusChatId!, messageId: statusMessageId }, report.summary, {
      parse_mode: "Markdown",
    });

    pipelineLog(5, "✅", "Report delivered successfully!");

  } catch (error) {
    pipelineLog(99, "💥", `Pipeline FAILED: ${error instanceof Error ? error.message : String(error)}`);
    const errorText = error instanceof Error ? error.message : String(error);
    if (statusChatId && statusMessageId) {
      await editTelegramMessage(ctx.api, { chatId: statusChatId, messageId: statusMessageId }, `❌ Ошибка: ${errorText}`);
    }
  }
}

// Telegram max message length
const TELEGRAM_MAX_LENGTH = 4000;

/**
 * Publish content using publish_me CLI and return URL
 * Returns null if publishing fails
 */
async function publishContent(
  content: string,
  slug: string,
  isHtml = false,
): Promise<string | null> {
  const timestamp = new Date().toISOString().slice(11, 23);
  const log = (msg: string) => console.log(`[publish] ${timestamp} │ ${msg}`);

  try {
    // Write content to temp file
    const ext = isHtml ? '.html' : '.md';
    const tempFile = join(tmpdir(), `clawdis-${Date.now()}${ext}`);
    await writeFile(tempFile, content, 'utf-8');
    log(`Created temp file: ${tempFile}`);

    // Call publish_me CLI
    const args = isHtml ? '--direct' : '';
    const cmd = `publish_me ${args} --slug "${slug}" "${tempFile}"`;
    log(`Running: ${cmd}`);

    const { stdout } = await execAsync(cmd, { timeout: 30000 });

    // Clean up temp file
    await unlink(tempFile).catch(() => {});

    // Parse JSON output to get URL
    try {
      const result = JSON.parse(stdout);
      if (result.url) {
        log(`Published to: ${result.url}`);
        return result.url;
      }
    } catch {
      // Try to extract URL from output
      const urlMatch = stdout.match(/https?:\/\/[^\s"]+/);
      if (urlMatch) {
        log(`Published to: ${urlMatch[0]}`);
        return urlMatch[0];
      }
    }

    log('Failed to extract URL from publish_me output');
    return null;
  } catch (error) {
    log(`Publish failed: ${error}`);
    return null;
  }
}

async function runWebSearch(
  ctx: Context,
  chatId: number,
  query: string,
  logger: ReturnType<typeof getChildLogger>,
  statusMessage?: StatusMessage | null,
): Promise<void> {
  const pipelineStartTime = Date.now();

  // URL detection helper
  const isUrl = (text: string): boolean => {
    const urlPattern = /^(https?:\/\/|www\.)[^\s<>"{}|\\^`\[\]]+$/i;
    return urlPattern.test(text.trim());
  };

  const pipelineLog = (step: number | string, emoji: string, message: string) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const elapsed = Date.now() - pipelineStartTime;
    const elapsedStr = elapsed < 1000
      ? `+${elapsed}ms`
      : `+${(elapsed / 1000).toFixed(1)}s`;
    const paddedElapsed = elapsedStr.padStart(8);
    console.log(`[web-search] ${timestamp} │ ${paddedElapsed} │ ${emoji} STEP ${step} │ ${message}`);
  };

  // Detect if input is a URL
  if (isUrl(query)) {
    pipelineLog(0.5, "🔗", `URL detected: "${query}"`);
    // Convert URL to a summarize query for the AI agents
    query = `Проанализируй и расскажи主要内容 этой веб-страницы: ${query}`;
    pipelineLog(0.5, "🔄", `Converted to search query: "${query.slice(0, 50)}..."`);
  }

  pipelineLog(1, "📥", `Received /web command: "${query.slice(0, 50)}${query.length > 50 ? '...' : ''}"`);

  // Check if already searching for this chat
  if (webSearchInFlight.has(chatId)) {
    pipelineLog(1, "⏸️", `Search already in-flight for chat ${chatId}, skipping`);
    await ctx.reply("🔍 Поиск уже выполняется для этого чата. Пожалуйста, подождите.");
    return;
  }

  // Mark as in-flight
  webSearchInFlight.add(chatId);
  pipelineLog(2, "🔒", `Marked chat ${chatId} as in-flight`);

  let statusChatId: number | undefined = statusMessage?.chatId;
  let statusMessageId: number | undefined = statusMessage?.messageId;

  try {
    // Send initial status message (DO NOT EDIT - send new message)
    pipelineLog(3, "💬", "Sending initial status message to Telegram");
    const statusMsg = await ctx.reply("🥊 Запускаю AI бой...");
    statusChatId = ctx.chat?.id;
    statusMessageId = statusMsg.message_id;
    pipelineLog(3, "✅", `Status message sent (msgId: ${statusMessageId})`);

    if (!statusChatId || !statusMessageId) {
      throw new Error("Failed to get message ID for status update");
    }

    // Execute multi-agent search with IMMEDIATE first result delivery
    pipelineLog(4, "🥊", "Starting multi-agent AI search...");
    let firstResultSent = false;

    const result = await executeMultiAgentWebSearch(query, {
      onStatus: (status) => {
        // Forward agent status to pipeline log with proper step mapping
        const stepInfo = status.includes("Starting AI Fight") ? { step: "4.1", emoji: "🥊" } :
                         status.includes("Launching") ? { step: "4.2", emoji: "⚔️" } :
                         status.includes("is searching") ? { step: "4.3", emoji: "🔍" } :
                         status.includes("done in") ? { step: "4.4", emoji: "✅" } :
                         status.includes("failed") ? { step: "4.5", emoji: "❌" } :
                         status.includes("First result ready") ? { step: "4.6", emoji: "🚀" } :
                         status.includes("Grace period") ? { step: "4.7", emoji: "⏱️" } :
                         status.includes("Got") && status.includes("results") ? { step: "4.8", emoji: "📊" } :
                         status.includes("Single agent") ? { step: "4.9", emoji: "📝" } :
                         status.includes("analysis") ? { step: "5.0", emoji: "🤖" } :
                         { step: "4.x", emoji: "🔄" };
        console.log(`[web-search] ${new Date().toISOString().slice(11, 23)} │ ${stepInfo.emoji} STEP ${stepInfo.step} │ ${status}`);
      },

      // FAST PATH: Send first result to Telegram IMMEDIATELY
      onFirstResult: async (firstResult) => {
        firstResultSent = true;

        // Step 5.1: Winner detected
        pipelineLog(5.1, "🏆", `WINNER DETECTED: ${firstResult.agentDisplay}`);
        pipelineLog(5.1, "⏱️", `Response time: ${firstResult.durationMs}ms`);
        pipelineLog(5.1, "⭐", `Quality rating: ${'⭐'.repeat(firstResult.quality || 0)} (${firstResult.quality}/5)`);

        // Step 5.2: Prepare message
        const stars = '⭐'.repeat(firstResult.quality || 0);
        const responsePreview = (firstResult.response || '').substring(0, 2000);
        const queryPreview = query.substring(0, 50) + (query.length > 50 ? '...' : '');
        pipelineLog(5.2, "📝", `Preparing message: ${responsePreview.length} chars`);

        const fastMessage = `🌐 *${firstResult.agentDisplay}* ${stars}

${responsePreview}${responsePreview.length >= 2000 ? '...' : ''}

---
_Время: ${firstResult.durationMs}мс | "${queryPreview}"_`;

        // Step 5.3: Format for Telegram
        pipelineLog(5.3, "🔧", `Formatting MarkdownV2 for Telegram...`);
        const formattedMessage = formatTelegramMessage(fastMessage);
        pipelineLog(5.3, "📏", `Formatted message: ${formattedMessage.length} chars`);

        // Step 5.4: Send to Telegram
        pipelineLog(5.4, "📤", `SENDING TO TELEGRAM → chat ${chatId}...`);
        try {
          const sentMsg = await ctx.reply(formattedMessage, { parse_mode: "MarkdownV2" });
          pipelineLog(5.5, "✅", `🎉 SUCCESS! Message delivered (msgId: ${sentMsg.message_id})`);
          pipelineLog(5.5, "👀", `USER NOW SEES: ${firstResult.agentDisplay} result in Telegram`);

          // 🧹 Delete the status message "🥊 Запускаю AI бой..." now that we have a result
          if (statusChatId && statusMessageId) {
            try {
              await ctx.api.deleteMessage(statusChatId, statusMessageId);
              pipelineLog(5.6, "🗑️", `Deleted status message (msgId: ${statusMessageId})`);
            } catch (delErr) {
              pipelineLog(5.6, "⚠️", `Could not delete status message: ${delErr}`);
            }
          }
        } catch (sendError) {
          pipelineLog(5.4, "⚠️", `MarkdownV2 failed: ${sendError}`);
          pipelineLog(5.4, "🔄", `Trying plain text fallback...`);
          // Fallback: plain text
          const plainMsg = await ctx.reply(fastMessage.replace(/[*_\[\]()~`>#+=|{}.!\\-]/g, ''));
          pipelineLog(5.5, "✅", `Plain text sent (msgId: ${plainMsg.message_id})`);
          pipelineLog(5.5, "👀", `USER NOW SEES: ${firstResult.agentDisplay} result (plain)`);

          // 🧹 Delete the status message even on fallback
          if (statusChatId && statusMessageId) {
            try {
              await ctx.api.deleteMessage(statusChatId, statusMessageId);
              pipelineLog(5.6, "🗑️", `Deleted status message (msgId: ${statusMessageId})`);
            } catch (delErr) {
              pipelineLog(5.6, "⚠️", `Could not delete status message: ${delErr}`);
            }
          }
        }
      },
    });

    pipelineLog(6, "📊", `Multi-agent search complete: ${result.agents.filter(a => a.success).length}/${result.agents.length} agents succeeded`);

    // If first result was already sent, publish HTML with ALL results
    if (firstResultSent && result.winner) {
      pipelineLog(7, "✅", `Winner was ${result.winner.agentDisplay} (already sent via fast path)`);

      // 📤 PUBLISH HTML with ALL agents results
      pipelineLog(7.1, "📄", `Publishing HTML report with all ${result.agents.length} agents...`);
      const slug = `web-search-full-${Date.now()}`;
      const contentToPublish = result.htmlReport || `# ${query}\n\n${JSON.stringify(result, null, 2)}`;
      const publishedUrl = await publishContent(contentToPublish, slug, true);

      if (publishedUrl) {
        pipelineLog(7.2, "🔗", `Published: ${publishedUrl}`);

        // Send link to user
        const linkMessage = `📊 *Полный AI Анализ* (${result.agents.filter(a => a.success).length} агентов)

🔗 [Открыть полный отчёт](${publishedUrl})

_${result.winner.agentDisplay} выиграл гонку, но все агенты предоставили ценные инсайты!_`;

        try {
          await ctx.reply(formatTelegramMessage(linkMessage), { parse_mode: "MarkdownV2" });
          pipelineLog(7.3, "✅", "Sent HTML link to user");
        } catch {
          // Link sending is optional
        }
      }

      // AI analysis summary removed - not valuable for user

      pipelineLog(9, "🎉", "Pipeline completed successfully!");
    } else if (result.winner && !firstResultSent) {
      // Fallback: first result callback didn't fire (shouldn't happen)
      pipelineLog(6, "🏆", `Winner: ${result.winner.agentDisplay} (${result.winner.durationMs}ms, quality: ${result.winner.quality})`);

      // Format the message
      pipelineLog(7, "📤", "Formatting winner response...");
      const message = formatTelegramWithAgent(result);
      const fullResponse = result.winner.response || '';
      pipelineLog(7, "📝", `Message: ${message.length} chars, Full response: ${fullResponse.length} chars`);

      // Check if response is too long for Telegram
      if (fullResponse.length > TELEGRAM_MAX_LENGTH) {
        pipelineLog(8, "📄", `Response too long (${fullResponse.length} > ${TELEGRAM_MAX_LENGTH}), publishing full version...`);

        // Generate slug from query
        const slug = `web-search-${Date.now()}`;

        // Publish full response (or HTML report if available)
        const contentToPublish = result.htmlReport || `# ${query}\n\n${fullResponse}`;
        const isHtml = !!result.htmlReport;
        const publishedUrl = await publishContent(contentToPublish, slug, isHtml);

        // Create truncated message with link
        const truncatedResponse = fullResponse.slice(0, 1500) + '...';
        const stars = '⭐'.repeat(result.winner.quality || 0);
        const linkPart = publishedUrl
          ? `\n\n[📖 Читать полностью →](${publishedUrl})`
          : '\n\n_(Полная версия недоступна)_';

        const truncatedMessage = `🌐 *${result.winner.agentDisplay}* ${stars}\n\n${truncatedResponse}${linkPart}\n\n_Время: ${result.winner.durationMs}мс_`;

        try {
          await ctx.reply(formatTelegramMessage(truncatedMessage), { parse_mode: "MarkdownV2" });
          pipelineLog(8, "✅", `Sent truncated message with link: ${publishedUrl || 'none'}`);
        } catch (sendError) {
          pipelineLog(8, "❌", `Failed to send truncated message: ${sendError}`);
          // Fallback: send plain text
          await ctx.reply(truncatedMessage.replace(/[*_\[\]()~`>#+=|{}.!\\-]/g, ''));
        }
      } else {
        // Message fits, send normally
        try {
          await ctx.reply(message, { parse_mode: "MarkdownV2" });
          pipelineLog(7, "✅", "Winner response sent successfully");
        } catch (sendError) {
          pipelineLog(7, "❌", `Failed to send formatted message: ${sendError}`);
          throw sendError;
        }
      }

      pipelineLog(9, "🎉", "Pipeline completed successfully!");
    } else {
      pipelineLog(6, "❌", "No winner - all agents failed");
      // All agents failed - send error as NEW message
      const errorDetails = result.agents
        .filter(a => !a.success)
        .map(a => `${a.agentDisplay}: ${a.error}`)
        .join('\n');

      pipelineLog(7, "📤", "Sending error message to Telegram...");
      const errorMessage = `❌ Все AI агенты не ответили.\n\nВозможные причины:\n- Проверьте API ключи в .env\n- Проверьте подключение к интернету\n\n${errorDetails}`;

      await ctx.reply(errorMessage);
      pipelineLog(7, "✅", "Error message sent");
    }
  } catch (error) {
    pipelineLog(99, "💥", `Pipeline FAILED: ${error instanceof Error ? error.message : String(error)}`);
    logger.error({ chatId, error }, "Web search execution failed");

    const errorText = error instanceof Error ? error.message : String(error);
    const errorMessage = `❌ Ошибка поиска:\n\n${errorText}\n\nПопробуйте позже или проверьте настройки.`;

    // Send error as NEW message (don't try to edit)
    await ctx.reply(errorMessage);
  } finally {
    // Always remove from in-flight set
    webSearchInFlight.delete(chatId);
    pipelineLog(10, "🔓", `Released in-flight lock for chat ${chatId}`);
  }
}

async function editTelegramMessage(
  api: Bot["api"],
  statusMessage: StatusMessage,
  text: string,
  replyMarkup?: ReplyMarkup,
): Promise<void> {
  const formatted = formatTelegramMessage(text);
  try {
    await api.editMessageText(statusMessage.chatId, statusMessage.messageId, formatted, {
      parse_mode: "MarkdownV2",
      reply_markup: replyMarkup,
    });
  } catch (err) {
    const errText = formatErrorMessage(err);
    if (MESSAGE_NOT_MODIFIED_RE.test(errText)) {
      return;
    }
    if (PARSE_ERR_RE.test(errText)) {
      await api.editMessageText(statusMessage.chatId, statusMessage.messageId, formatted, {
        reply_markup: replyMarkup,
      });
      return;
    }
    throw err;
  }
}

async function runMultyPipeline(params: {
  ctx: Context;
  chatId: number;
  topic: string;
  statusMessage: StatusMessage | null;
  logger: ReturnType<typeof getChildLogger>;
}): Promise<void> {
  const { ctx, chatId, topic, logger } = params;
  let statusMessage = params.statusMessage;
  const workspace = process.cwd();
  const tmpRoot = join(workspace, "tmp");
  await mkdir(tmpRoot, { recursive: true });
  const publishEnabled = true;
  const notifyEnabled = false;
  const jsonLogPath = join(
    tmpRoot,
    `multy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jsonl`,
  );
  const env = { ...process.env };
  if (!env.ASK_CLI_AGENTS_ROOT) {
    env.ASK_CLI_AGENTS_ROOT = "/home/almaz/TOOLS/ask_cli_agents";
  }
  const models = resolveMultyModels(env);
  const startMs = Date.now();

  if (!statusMessage) {
    const initial = buildMultyStatusMessage({
      topic,
      models,
      elapsedSeconds: 0,
      steps: {},
      publishEnabled,
      notifyEnabled,
    });
    const status = await ctx.reply(initial);
    statusMessage = { chatId: ctx.chat?.id ?? chatId, messageId: status.message_id };
  }

  const child = spawn(
    "multy",
    ["--theme", "silent", "--json-log", jsonLogPath, "--workspace", workspace, topic],
    { env, cwd: workspace },
  );

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const readSteps = async () => {
    try {
      const content = await readFile(jsonLogPath, "utf8");
      return parseMultyJsonl(content);
    } catch {
      return {};
    }
  };

  const updateStatus = async () => {
    if (!statusMessage) return;
    const steps = await readSteps();
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const text = buildMultyStatusMessage({
      topic,
      models,
      elapsedSeconds,
      steps,
      publishEnabled,
      notifyEnabled,
    });
    await editTelegramMessage(ctx.api, statusMessage, text);
  };

  const interval = setInterval(() => {
    updateStatus().catch((err) => {
      logVerbose(`multy status update failed: ${String(err)}`);
    });
  }, MULTY_STATUS_INTERVAL_MS);

  await updateStatus();

  const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolve) => {
      child.on("close", (code, signal) => resolve({ code, signal }));
    },
  );

  clearInterval(interval);

  const steps = await readSteps();
  const combinedOutput = `${stdout}\n${stderr}`.trim();
  const summary = extractMultySummary(combinedOutput);

  if (exit.code !== 0) {
    const stepLabel = resolveMultyCurrentStepLabel(steps, {
      publishEnabled,
      notifyEnabled,
    });
    const reason = extractMultyErrorReason(combinedOutput) ?? "unknown error";
    const failureText = [
      "[Multy pipeline failed]",
      "",
      `Topic: "${topic}"`,
      `Step: ${stepLabel}`,
      `Reason: ${reason}`,
    ].join("\n");
    if (statusMessage) {
      await editTelegramMessage(ctx.api, statusMessage, failureText);
    } else {
      await ctx.reply(failureText);
    }
    logger.error({ topic, code: exit.code, signal: exit.signal }, "multy pipeline failed");
    return;
  }

  await updateStatus();

  if (!summary) {
    const fallbackText = [
      "[Multy pipeline done]",
      "",
      `Topic: "${topic}"`,
      "Result: completed, but no summary payload was captured.",
    ].join("\n");
    await ctx.reply(formatTelegramMessage(fallbackText), {
      parse_mode: "MarkdownV2",
    });
    return;
  }

  let articleMarkdown = "";
  const articlePath = String(summary.article_ru_path || "").trim();
  if (articlePath) {
    try {
      articleMarkdown = await readFile(articlePath, "utf8");
    } catch (err) {
      logVerbose(`multy article read failed: ${String(err)}`);
    }
  }

  const totalSeconds = Math.round((summary.total_duration_ms ?? 0) / 1000);
  const resultLines = buildMultyResultMessage({
    summary: {
      prompt: summary.prompt as string | undefined,
      article_url: summary.article_url as string | undefined,
      raw_url: summary.raw_url as string | undefined,
      run_metadata_path: summary.run_metadata_path as string | undefined,
    },
    topic,
    articleMarkdown,
    showRunPath: false,
  });

  await ctx.reply(formatTelegramMessage(resultLines), {
    parse_mode: "MarkdownV2",
    disable_web_page_preview: true,
  });
}

function extractMultySummary(output: string): Record<string, unknown> | null {
  const lines = output.split("\n").map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (!line.startsWith("{")) continue;
    try {
      const payload = JSON.parse(line) as Record<string, unknown>;
      if (payload.pipeline_version && payload.run_id) {
        return payload;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractMultyErrorReason(output: string): string | null {
  const lines = output.split("\n").map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (!line || line.startsWith("{")) continue;
    return line.length > 200 ? `${line.slice(0, 200)}...` : line;
  }
  return null;
}

function formatSeconds(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0s";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

async function handleDeepResearchCallback(
  ctx: Context,
  runtime: RuntimeEnv,
): Promise<boolean> {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith(CALLBACK_PREFIX)) {
    return false;
  }

  const parsed = parseCallbackData(data);
  if (!parsed) {
    await ctx.answerCallbackQuery({ text: messages.callbackInvalid() });
    return true;
  }

  const { action, topic, ownerId } = parsed;
  const callerId = ctx.from?.id;

  if (callerId === undefined) {
    await ctx.answerCallbackQuery({ text: messages.callbackInvalid() });
    return true;
  }

  const isPrivateChat = ctx.chat?.type === "private";
  // Allow ownerless callbacks only in private chats (legacy buttons).
  if (ownerId === undefined && !isPrivateChat) {
    await ctx.answerCallbackQuery({ text: messages.callbackInvalid() });
    return true;
  }

  if (ownerId !== undefined && ownerId !== callerId) {
    await ctx.answerCallbackQuery({ text: messages.callbackUnauthorized() });
    return true;
  }

  const effectiveOwnerId = ownerId ?? callerId;

  if (action !== CallbackActions.EXECUTE && action !== CallbackActions.RETRY) {
    await ctx.answerCallbackQuery({ text: messages.callbackInvalid() });
    return true;
  }

  if (deepResearchInFlight.has(callerId)) {
    await ctx.answerCallbackQuery({ text: messages.callbackBusy() });
    return true;
  }

  const normalized = normalizeDeepResearchTopic(topic);
  if (!normalized) {
    await ctx.answerCallbackQuery({ text: messages.callbackInvalid() });
    return true;
  }

  const normalizedTopic = normalized.topic;
  if (normalized.truncated) {
    logVerbose(
      `[deep-research] Callback topic truncated for ${callerId}: "${normalizedTopic}"`,
    );
  }

  try {
    deepResearchInFlight.add(callerId);

    await ctx.answerCallbackQuery({ text: messages.callbackAcknowledgment() });
    const statusMessage = await ctx.reply(messages.progress("starting"), {
      parse_mode: "MarkdownV2",
    });
    const statusChatId = ctx.chat?.id;
    const statusMessageId = statusMessage.message_id;
    let statusStage: DeepResearchProgressStage = "starting";
    let statusRunId: string | undefined;
    let lastStatusText = messages.progress(statusStage);

    const updateStatus = async (
      nextStage?: DeepResearchProgressStage,
      nextRunId?: string,
    ) => {
      if (!statusChatId || !statusMessageId) return;
      if (nextStage) statusStage = nextStage;
      if (nextRunId) statusRunId = nextRunId;
      const nextText = messages.progress(statusStage, statusRunId);
      if (nextText === lastStatusText) return;
      lastStatusText = nextText;
      try {
        await ctx.api.editMessageText(
          statusChatId,
          statusMessageId,
          nextText,
          { parse_mode: "MarkdownV2" },
        );
      } catch (err) {
        logVerbose(
          `[deep-research] Failed to update status message: ${String(err)}`,
        );
      }
    };

    const mapEventToStage = (
      eventName?: string,
    ): DeepResearchProgressStage | null => {
      switch (eventName) {
        case "run.start":
          return "starting";
        case "run.notice":
        case "interaction.start":
          return "working";
        case "agent_summary.start":
          return "summarizing";
        case "publish.start":
          return "publishing";
        case "run.complete":
          return "done";
        default:
          return null;
      }
    };

    logVerbose(
      `[deep-research] Starting execution for topic: "${normalizedTopic}"`,
    );
    const executeResult = await executeDeepResearch({
      topic: normalizedTopic,
      onEvent: (event) => {
        if (event.run_id) {
          void updateStatus(undefined, String(event.run_id));
        }
        const stage = mapEventToStage(
          typeof event.event === "string" ? event.event : undefined,
        );
        if (stage) {
          void updateStatus(stage);
        }
      },
    });

    const deliveryContext = {
      sendMessage: async (text: string) => {
        try {
          const formatted = formatTelegramMessage(`○ ${text}`);
          await ctx.reply(truncateForTelegram(formatted), {
            parse_mode: "MarkdownV2",
          });
        } catch {
          await ctx.reply(truncateForTelegram(text));
        }
      },
      sendError: async (text: string) => {
        const formatted = formatTelegramMessage(`✂︎ ${text}`);
        await ctx.reply(formatted, {
          parse_mode: "MarkdownV2",
          reply_markup: createRetryButton(normalizedTopic, effectiveOwnerId),
        });
      },
    };

    const success = await deliverResults(executeResult, deliveryContext);

    if (success) {
      await updateStatus("done");
      logVerbose(
        `[deep-research] Completed successfully for topic: "${normalizedTopic}"`,
      );
    } else {
      await updateStatus("failed");
      logVerbose(`[deep-research] Failed for topic: "${normalizedTopic}"`);
    }
  } catch (error) {
    runtime.error?.(
      danger(`[deep-research] Unexpected error: ${String(error)}`),
    );
    await ctx.reply(
      messages.error(
        error instanceof Error ? error.message : "Unexpected error",
      ),
      {
        reply_markup: createRetryButton(
          normalizedTopic,
          effectiveOwnerId,
        ),
      },
    );
  } finally {
    deepResearchInFlight.delete(callerId);
  }

  return true;
}

async function handleTTSCallback(
  ctx: Context,
  runtime: RuntimeEnv,
): Promise<boolean> {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith(TTS_CALLBACK_PREFIX)) {
    return false;
  }

  const textHash = parseTTSCallbackData(data);
  if (!textHash) {
    await ctx.answerCallbackQuery({ text: "Invalid TTS callback" });
    return true;
  }

  const callerId = ctx.from?.id;
  if (callerId === undefined) {
    await ctx.answerCallbackQuery({ text: "Invalid user" });
    return true;
  }

  // Check if already processing (with TTL check)
  const flightKey = `${callerId}:${textHash}`;
  const now = Date.now();
  const existingTimestamp = ttsInFlight.get(flightKey);
  if (existingTimestamp && now - existingTimestamp < TTS_IN_FLIGHT_TTL_MS) {
    await ctx.answerCallbackQuery({ text: "Уже генерирую..." });
    return true;
  }

  // Add with current timestamp
  ttsInFlight.set(flightKey, now);

  try {
    await ctx.answerCallbackQuery({ text: "Генерирую аудио..." });

    // Get original message to extract result text
    const msg = ctx.callbackQuery.message;
    if (!msg || !("text" in msg)) {
      await ctx.reply("Ошибка: не найден оригинальный результат");
      return true;
    }

    // Extract web search result text from message
    const resultText = msg.text
      .replace(/^○ Результат поиска:\n\n/, "")
      .trim();

    if (!resultText) {
      await ctx.reply("Ошибка: пустой результат");
      return true;
    }

    const chatId = ctx.chat?.id;
    const messageId = msg.message_id;

    if (!chatId || !messageId) {
      await ctx.reply("Ошибка: не получен ID чата");
      return true;
    }

    // Progress update function
    let currentStage: TTSProgressStage = 0;
    const updateProgress = async (stage: TTSProgressStage) => {
      if (stage === currentStage) return;
      currentStage = stage;
      try {
        const button = createTTSProgressButton(stage, textHash);
        await ctx.api.editMessageReplyMarkup(chatId, messageId, button);
      } catch (err) {
        console.warn(`[tts] Failed to update progress: ${err}`);
      }
    };

    // Generate audio
    const result = await synthesize(resultText, async (percentage) => {
      if (percentage >= 100) await updateProgress(4);
      else if (percentage >= 75) await updateProgress(3);
      else if (percentage >= 50) await updateProgress(2);
      else if (percentage >= 25) await updateProgress(1);
      else await updateProgress(0);
    });

    if (result.success && result.audioPath) {
      // Send audio file
      const fs = await import("node:fs");
      if (fs.existsSync(result.audioPath)) {
        const file = new InputFile(result.audioPath, "tts.mp3");

        // Build caption with cache and truncation info
        let caption = "🎙️";
        if (result.cached) caption += " (из кэша)";
        if (result.truncated) caption += " (текст укорочен)";

        await ctx.api.sendVoice(chatId, file, { caption });
      }
      // Remove button
      await ctx.api.editMessageReplyMarkup(chatId, messageId);
    } else {
      // Show error, remove button
      await ctx.api.editMessageText(
        chatId,
        messageId,
        `✂︎ Озвучка не удалась:\n\n${result.error || "Неизвестная ошибка"}`,
      );
    }
  } finally {
    ttsInFlight.delete(flightKey);
  }

  return true;
}

async function deliverReplies(params: {
  replies: ReplyPayload[];
  chatId: string;
  token: string;
  runtime: RuntimeEnv;
  bot: Bot;
  statusMessage?: StatusMessage | null;
}) {
  const { replies, chatId, runtime, bot, statusMessage } = params;
  let statusEdited = false;
  for (const reply of replies) {
    if (!reply?.text && !reply?.mediaUrl && !(reply?.mediaUrls?.length ?? 0)) {
      runtime.error?.(danger("Telegram reply missing text/media"));
      continue;
    }
    const mediaList = reply.mediaUrls?.length
      ? reply.mediaUrls
      : reply.mediaUrl
        ? [reply.mediaUrl]
        : [];
    if (mediaList.length === 0) {
      const chunks = chunkText(reply.text || "", 4000);
      for (const chunk of chunks) {
        if (statusMessage && !statusEdited) {
          await editTelegramMessage(bot.api, statusMessage, chunk);
          statusEdited = true;
          continue;
        }
        await sendTelegramText(bot, chatId, chunk, runtime);
      }
      continue;
    }
    if (statusMessage && !statusEdited) {
      await editTelegramMessage(bot.api, statusMessage, AUDIO_STATUS_DONE);
      statusEdited = true;
    }
    // media with optional caption on first item
    let first = true;
    for (const mediaUrl of mediaList) {
      const media = await loadWebMedia(mediaUrl);
      const kind = mediaKindFromMime(media.contentType ?? undefined);
      const file = new InputFile(media.buffer, media.fileName ?? "file");
      const caption = first ? (reply.text ?? undefined) : undefined;
      first = false;
      if (kind === "image") {
        await bot.api.sendPhoto(chatId, file, { caption });
      } else if (kind === "video") {
        await bot.api.sendVideo(chatId, file, { caption });
      } else if (kind === "audio") {
        await bot.api.sendAudio(chatId, file, { caption });
      } else {
        await bot.api.sendDocument(chatId, file, { caption });
      }
    }
  }
  if (statusMessage && !statusEdited) {
    await editTelegramMessage(bot.api, statusMessage, AUDIO_STATUS_DONE);
  }
}

function buildSenderName(msg: TelegramMessage) {
  const name =
    [msg.from?.first_name, msg.from?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || msg.from?.username;
  return name || undefined;
}

function buildSenderLabel(msg: TelegramMessage, chatId: number | string) {
  const name = buildSenderName(msg);
  const username = msg.from?.username ? `@${msg.from.username}` : undefined;
  let label = name;
  if (name && username) {
    label = `${name} (${username})`;
  } else if (!name && username) {
    label = username;
  }
  const idPart = `id:${chatId}`;
  return label ? `${label} ${idPart}` : idPart;
}

function buildGroupLabel(msg: TelegramMessage, chatId: number | string) {
  const title = msg.chat?.title;
  if (title) return `${title} id:${chatId}`;
  return `group:${chatId}`;
}

function hasBotMention(msg: TelegramMessage, botUsername: string) {
  const text = (msg.text ?? msg.caption ?? "").toLowerCase();
  if (text.includes(`@${botUsername}`)) return true;
  const entities = msg.entities ?? msg.caption_entities ?? [];
  for (const ent of entities) {
    if (ent.type !== "mention") continue;
    const slice = (msg.text ?? msg.caption ?? "").slice(
      ent.offset,
      ent.offset + ent.length,
    );
    if (slice.toLowerCase() === `@${botUsername}`) return true;
  }
  return false;
}

async function resolveMedia(
  ctx: TelegramContext,
  maxBytes: number,
  token: string,
  proxyFetch?: typeof fetch,
): Promise<{ path: string; contentType?: string; placeholder: string } | null> {
  const msg = ctx.message;
  const m =
    msg.photo?.[msg.photo.length - 1] ??
    msg.video ??
    msg.document ??
    msg.audio ??
    msg.voice;
  if (!m?.file_id) return null;
  const file = await ctx.getFile();
  if (!file.file_path) {
    throw new Error("Telegram getFile returned no file_path");
  }
  const fetchImpl = proxyFetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("fetch is not available; set telegram.proxy in config");
  }
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download telegram file: HTTP ${res.status} ${res.statusText}`,
    );
  }
  const data = Buffer.from(await res.arrayBuffer());
  const mime = await detectMime({
    buffer: data,
    headerMime: res.headers.get("content-type"),
    filePath: file.file_path,
  });
  const saved = await saveMediaBuffer(data, mime, "inbound", maxBytes);
  let placeholder = "<media:document>";
  if (msg.photo) placeholder = "<media:image>";
  else if (msg.video) placeholder = "<media:video>";
  else if (msg.audio || msg.voice) placeholder = "<media:audio>";
  return { path: saved.path, contentType: saved.contentType, placeholder };
}

async function sendTelegramText(
  bot: Bot,
  chatId: string,
  text: string,
  runtime: RuntimeEnv,
): Promise<number | undefined> {
  const formatted = formatTelegramMessage(`○ ${text}`);
  try {
    const res = await bot.api.sendMessage(chatId, formatted, {
      parse_mode: "MarkdownV2",
    });
    return res.message_id;
  } catch (err) {
    const errText = formatErrorMessage(err);
    if (PARSE_ERR_RE.test(errText)) {
      runtime.log?.(
        `telegram markdown parse failed; retrying without formatting: ${errText}`,
      );
      const res = await bot.api.sendMessage(chatId, formatted, {});
      return res.message_id;
    }
    throw err;
  }
}

function describeReplyTarget(msg: TelegramMessage) {
  const reply = msg.reply_to_message;
  if (!reply) return null;
  const replyBody = (reply.text ?? reply.caption ?? "").trim();
  let body = replyBody;
  if (!body) {
    if (reply.photo) body = "<media:image>";
    else if (reply.video) body = "<media:video>";
    else if (reply.audio || reply.voice) body = "<media:audio>";
    else if (reply.document) body = "<media:document>";
  }
  if (!body) return null;
  const sender = buildSenderName(reply);
  const senderLabel = sender ? `${sender}` : "unknown sender";
  return {
    id: reply.message_id ? String(reply.message_id) : undefined,
    sender: senderLabel,
    body,
  };
}
