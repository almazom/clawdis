import type { AgentTool, AgentToolResult } from "@mariozechner/pi-ai";
import { codingTools, readTool } from "@mariozechner/pi-coding-agent";
import { type TSchema, Type } from "@sinclair/typebox";

import { detectMime } from "../media/mime.js";
import { startWebLoginWithQr, waitForWebLogin } from "../web/login-qr.js";
import {
  type BashToolDefaults,
  createBashTool,
  createProcessTool,
  type ProcessToolDefaults,
} from "./bash-tools.js";
import { createClawdisTools } from "./clawdis-tools.js";
import { sanitizeToolResultImages } from "./tool-images.js";
import { runExec } from "../process/exec.js";

const ASK_GEMINI_CLI = "/home/almaz/TOOLS/ask_cli_agents/ask_gemini";

// TODO(steipete): Remove this wrapper once pi-mono ships file-magic MIME detection
// for `read` image payloads in `@mariozechner/pi-coding-agent` (then switch back to `codingTools` directly).
type ToolContentBlock = AgentToolResult<unknown>["content"][number];
type ImageContentBlock = Extract<ToolContentBlock, { type: "image" }>;
type TextContentBlock = Extract<ToolContentBlock, { type: "text" }>;

async function sniffMimeFromBase64(
  base64: string,
): Promise<string | undefined> {
  const trimmed = base64.trim();
  if (!trimmed) return undefined;

  const take = Math.min(256, trimmed.length);
  const sliceLen = take - (take % 4);
  if (sliceLen < 8) return undefined;

  try {
    const head = Buffer.from(trimmed.slice(0, sliceLen), "base64");
    return await detectMime({ buffer: head });
  } catch {
    return undefined;
  }
}

function rewriteReadImageHeader(text: string, mimeType: string): string {
  // pi-coding-agent uses: "Read image file [image/png]"
  if (text.startsWith("Read image file [") && text.endsWith("]")) {
    return `Read image file [${mimeType}]`;
  }
  return text;
}

async function normalizeReadImageResult(
  result: AgentToolResult<unknown>,
  filePath: string,
): Promise<AgentToolResult<unknown>> {
  const content = Array.isArray(result.content) ? result.content : [];

  const image = content.find(
    (b): b is ImageContentBlock =>
      !!b &&
      typeof b === "object" &&
      (b as { type?: unknown }).type === "image" &&
      typeof (b as { data?: unknown }).data === "string" &&
      typeof (b as { mimeType?: unknown }).mimeType === "string",
  );
  if (!image) return result;

  if (!image.data.trim()) {
    throw new Error(`read: image payload is empty (${filePath})`);
  }

  const sniffed = await sniffMimeFromBase64(image.data);
  if (!sniffed) return result;

  if (!sniffed.startsWith("image/")) {
    throw new Error(
      `read: file looks like ${sniffed} but was treated as ${image.mimeType} (${filePath})`,
    );
  }

  if (sniffed === image.mimeType) return result;

  const nextContent = content.map((block) => {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: unknown }).type === "image"
    ) {
      const b = block as ImageContentBlock & { mimeType: string };
      return { ...b, mimeType: sniffed } satisfies ImageContentBlock;
    }
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: unknown }).type === "text" &&
      typeof (block as { text?: unknown }).text === "string"
    ) {
      const b = block as TextContentBlock & { text: string };
      return {
        ...b,
        text: rewriteReadImageHeader(b.text, sniffed),
      } satisfies TextContentBlock;
    }
    return block;
  });

  return { ...result, content: nextContent };
}

type AnyAgentTool = AgentTool<TSchema, unknown>;

function extractEnumValues(schema: unknown): unknown[] | undefined {
  if (!schema || typeof schema !== "object") return undefined;
  const record = schema as Record<string, unknown>;
  if (Array.isArray(record.enum)) return record.enum;
  if ("const" in record) return [record.const];
  return undefined;
}

function mergePropertySchemas(existing: unknown, incoming: unknown): unknown {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const existingEnum = extractEnumValues(existing);
  const incomingEnum = extractEnumValues(incoming);
  if (existingEnum || incomingEnum) {
    const values = Array.from(
      new Set([...(existingEnum ?? []), ...(incomingEnum ?? [])]),
    );
    const merged: Record<string, unknown> = {};
    for (const source of [existing, incoming]) {
      if (!source || typeof source !== "object") continue;
      const record = source as Record<string, unknown>;
      for (const key of ["title", "description", "default"]) {
        if (!(key in merged) && key in record) merged[key] = record[key];
      }
    }
    const types = new Set(values.map((value) => typeof value));
    if (types.size === 1) merged.type = Array.from(types)[0];
    merged.enum = values;
    return merged;
  }

  return existing;
}

function normalizeToolParameters(tool: AnyAgentTool): AnyAgentTool {
  const schema =
    tool.parameters && typeof tool.parameters === "object"
      ? (tool.parameters as Record<string, unknown>)
      : undefined;
  if (!schema) return tool;
  if ("type" in schema && "properties" in schema) return tool;
  if (!Array.isArray(schema.anyOf)) return tool;
  const mergedProperties: Record<string, unknown> = {};
  const requiredCounts = new Map<string, number>();
  let objectVariants = 0;

  for (const entry of schema.anyOf) {
    if (!entry || typeof entry !== "object") continue;
    const props = (entry as { properties?: unknown }).properties;
    if (!props || typeof props !== "object") continue;
    objectVariants += 1;
    for (const [key, value] of Object.entries(
      props as Record<string, unknown>,
    )) {
      if (!(key in mergedProperties)) {
        mergedProperties[key] = value;
        continue;
      }
      mergedProperties[key] = mergePropertySchemas(
        mergedProperties[key],
        value,
      );
    }
    const required = Array.isArray((entry as { required?: unknown }).required)
      ? (entry as { required: unknown[] }).required
      : [];
    for (const key of required) {
      if (typeof key !== "string") continue;
      requiredCounts.set(key, (requiredCounts.get(key) ?? 0) + 1);
    }
  }

  const baseRequired = Array.isArray(schema.required)
    ? schema.required.filter((key) => typeof key === "string")
    : undefined;
  const mergedRequired =
    baseRequired && baseRequired.length > 0
      ? baseRequired
      : objectVariants > 0
        ? Array.from(requiredCounts.entries())
            .filter(([, count]) => count === objectVariants)
            .map(([key]) => key)
        : undefined;

  return {
    ...tool,
    parameters: {
      ...schema,
      type: "object",
      properties:
        Object.keys(mergedProperties).length > 0
          ? mergedProperties
          : (schema.properties ?? {}),
      ...(mergedRequired && mergedRequired.length > 0
        ? { required: mergedRequired }
        : {}),
      additionalProperties:
        "additionalProperties" in schema ? schema.additionalProperties : true,
    } as unknown as TSchema,
  };
}

function createWhatsAppLoginTool(): AnyAgentTool {
  return {
    label: "WhatsApp Login",
    name: "whatsapp_login",
    description:
      "Generate a WhatsApp QR code for linking, or wait for the scan to complete.",
    parameters: Type.Object({
      action: Type.Union([Type.Literal("start"), Type.Literal("wait")]),
      timeoutMs: Type.Optional(Type.Number()),
      force: Type.Optional(Type.Boolean()),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const action = (args as { action?: string })?.action ?? "start";
      if (action === "wait") {
        const result = await waitForWebLogin({
          timeoutMs:
            typeof (args as { timeoutMs?: unknown }).timeoutMs === "number"
              ? (args as { timeoutMs?: number }).timeoutMs
              : undefined,
        });
        return {
          content: [{ type: "text", text: result.message }],
          details: { connected: result.connected },
        };
      }

      const result = await startWebLoginWithQr({
        timeoutMs:
          typeof (args as { timeoutMs?: unknown }).timeoutMs === "number"
            ? (args as { timeoutMs?: number }).timeoutMs
            : undefined,
        force:
          typeof (args as { force?: unknown }).force === "boolean"
            ? (args as { force?: boolean }).force
            : false,
      });

      if (!result.qrDataUrl) {
        return {
          content: [
            {
              type: "text",
              text: result.message,
            },
          ],
          details: { qr: false },
        };
      }

      const text = [
        result.message,
        "",
        "Open WhatsApp → Linked Devices and scan:",
        "",
        `![whatsapp-qr](${result.qrDataUrl})`,
      ].join("\n");
      return {
        content: [{ type: "text", text }],
        details: { qr: true },
      };
    },
  };
}

function createClawdisReadTool(base: AnyAgentTool): AnyAgentTool {
  return {
    ...base,
    execute: async (toolCallId, params, signal) => {
      const result = (await base.execute(
        toolCallId,
        params,
        signal,
      )) as AgentToolResult<unknown>;
      const record =
        params && typeof params === "object"
          ? (params as Record<string, unknown>)
          : undefined;
      const filePath =
        typeof record?.path === "string" ? String(record.path) : "<unknown>";
      const normalized = await normalizeReadImageResult(result, filePath);
      return sanitizeToolResultImages(normalized, `read:${filePath}`);
    },
  };
}

function createAskGeminiTool(): AnyAgentTool {
  return {
    label: "Ask Gemini",
    name: "ask_gemini_basic",
    description:
      "Send AI query to Gemini with dynamic mindset selection. Supports: review, codereview, arch, qa, debug, research, critical, project, ux, docs, ocr, url, epub",
    parameters: Type.Object({
      prompt: Type.String({
        description: "The query/prompt to send to AI",
      }),
      mindset: Type.Optional(
        Type.String({
          description:
            "Persona/mindset: review, codereview, arch, qa, debug, research, critical, project, ux, docs, ocr, url, epub",
        }),
      ),
      model: Type.Optional(
        Type.String({
          description: "Model to use (default: gemini-2.0-flash)",
        }),
      ),
      timeout: Type.Optional(
        Type.Number({
          description: "Timeout in seconds (default: 60)",
        }),
      ),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { prompt, mindset, model, timeout } = args as {
        prompt: string;
        mindset?: string;
        model?: string;
        timeout?: number;
      };

      try {
        const args: string[] = ["-c", prompt];
        if (mindset) args.push("--mindset", mindset);
        if (model) args.push("--model", model);
        if (timeout) args.push("--timeout", String(timeout));

        const result = await runExec(ASK_GEMINI_CLI, args, {
          timeoutMs: (timeout ?? 60) * 1000,
        });
        return {
          content: [{ type: "text", text: result.stdout || result.stderr }],
          details: {},
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `Error: ${String(error)}` },
          ],
          details: {},
        };
      }
    },
  };
}

function createAskGeminiWebTool(): AnyAgentTool {
  return {
    label: "Ask Gemini Web",
    name: "ask_gemini_web",
    description:
      "Perform web search using Gemini with automatic web fetch capabilities for current information",
    parameters: Type.Object({
      query: Type.String({
        description: "Search query for current/recent information",
      }),
      mindset: Type.Optional(
        Type.String({
          description: "Persona/mindset for analysis",
        }),
      ),
      enableWeb: Type.Optional(
        Type.Boolean({
          description: "Enable web search (default: true)",
          default: true,
        }),
      ),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { query, mindset, enableWeb } = args as {
        query: string;
        mindset?: string;
        enableWeb?: boolean;
      };

      try {
        const cliArgs: string[] = ["-c", query];
        if (enableWeb !== false) {
          cliArgs.push("--web");
        }
        if (mindset) cliArgs.push("--mindset", mindset);

        const result = await runExec(ASK_GEMINI_CLI, cliArgs, {
          timeoutMs: 120_000,
        });
        return {
          content: [{ type: "text", text: result.stdout || result.stderr }],
          details: {},
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `Error: ${String(error)}` },
          ],
          details: {},
        };
      }
    },
  };
}

function createAskGeminiDeepDiveTool(): AnyAgentTool {
  return {
    label: "Ask Gemini Deep Dive",
    name: "ask_gemini_deep_dive",
    description:
      "Deep research: диприсерч, deep dive, deep research, исследование - comprehensive analysis with web search and research mindset",
    parameters: Type.Object({
      query: Type.String({
        description: "Research question or topic for deep analysis",
      }),
      collection: Type.Optional(
        Type.String({
          description: "URL collection name for parallel source analysis",
        }),
      ),
      sources: Type.Optional(
        Type.Array(
          Type.String({
            description: "Individual URLs to analyze",
          }),
        ),
      ),
      mindset: Type.Optional(
        Type.String({
          description: "Override mindset (default: research)",
          default: "research",
        }),
      ),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { query, collection, sources, mindset } = args as {
        query: string;
        collection?: string;
        sources?: string[];
        mindset?: string;
      };

      try {
        const cliArgs: string[] = [
          "-c",
          query,
          "--web",
          "--mindset",
          mindset ?? "research",
        ];

        if (collection) {
          cliArgs.push("--url-collection", collection);
        }

        if (sources && sources.length > 0) {
          for (const url of sources) {
            cliArgs.push("--url", url);
          }
        }

        const result = await runExec(ASK_GEMINI_CLI, cliArgs, {
          timeoutMs: 180_000,
        });
        return {
          content: [{ type: "text", text: result.stdout || result.stderr }],
          details: {},
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `Error: ${String(error)}` },
          ],
          details: {},
        };
      }
    },
  };
}

function createAskGeminiPdfTool(): AnyAgentTool {
  return {
    label: "Ask Gemini PDF",
    name: "ask_gemini_pdf",
    description: "Analyze PDF documents with page selection and OCR support",
    parameters: Type.Object({
      file: Type.String({
        description: "Path to PDF file",
      }),
      pages: Type.Optional(
        Type.String({
          description:
            "Page selection: 1-5, 1,3,5, or 1-10,15-20",
        }),
      ),
      ocr: Type.Optional(
        Type.Boolean({
          description: "Enable OCR for scanned documents (default: false)",
          default: false,
        }),
      ),
      prompt: Type.String({
        description: "Analysis instruction for the document",
      }),
      mindset: Type.Optional(
        Type.String({
          description: "Persona/mindset for analysis",
        }),
      ),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { file, pages, ocr, prompt, mindset } = args as {
        file: string;
        pages?: string;
        ocr?: boolean;
        prompt: string;
        mindset?: string;
      };

      try {
        const cliArgs: string[] = ["-f", file, "-c", prompt];
        if (pages) cliArgs.push("--pages", pages);
        if (ocr) cliArgs.push("--ocr");
        if (mindset) cliArgs.push("--mindset", mindset);

        const result = await runExec(ASK_GEMINI_CLI, cliArgs, {
          timeoutMs: 180_000,
        });
        return {
          content: [{ type: "text", text: result.stdout || result.stderr }],
          details: {},
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `Error: ${String(error)}` },
          ],
          details: {},
        };
      }
    },
  };
}

function createAskGeminiCollectionTool(): AnyAgentTool {
  return {
    label: "Ask Gemini Collection",
    name: "ask_gemini_collection",
    description:
      "Parallel analysis of multiple URLs from a URL collection for comprehensive research",
    parameters: Type.Object({
      collection: Type.String({
        description: "URL collection name (without .yaml)",
      }),
      prompt: Type.String({
        description: "Analysis prompt for all sources",
      }),
      mindset: Type.Optional(
        Type.String({
          description: "Persona/mindset for analysis",
        }),
      ),
      timeout: Type.Optional(
        Type.Number({
          description: "Timeout per URL in seconds (default: 60)",
          default: 60,
        }),
      ),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { collection, prompt, mindset, timeout } = args as {
        collection: string;
        prompt: string;
        mindset?: string;
        timeout?: number;
      };

      try {
        const cliArgs: string[] = [
          "--url-collection",
          collection,
          "-c",
          prompt,
        ];
        if (mindset) cliArgs.push("--mindset", mindset);
        if (timeout) cliArgs.push("--timeout", String(timeout));

        const result = await runExec(ASK_GEMINI_CLI, cliArgs, {
          timeoutMs: (timeout ?? 60) * 1000 * 10, // 10x for collection
        });
        return {
          content: [{ type: "text", text: result.stdout || result.stderr }],
          details: {},
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `Error: ${String(error)}` },
          ],
          details: {},
        };
      }
    },
  };
}

export function createClawdisCodingTools(options?: {
  bash?: BashToolDefaults & ProcessToolDefaults;
}): AnyAgentTool[] {
  const bashToolName = "bash";
  const base = (codingTools as unknown as AnyAgentTool[]).flatMap((tool) => {
    if (tool.name === readTool.name) return [createClawdisReadTool(tool)];
    if (tool.name === bashToolName) return [];
    return [tool as AnyAgentTool];
  });
  const bashTool = createBashTool(options?.bash);
  const processTool = createProcessTool({
    cleanupMs: options?.bash?.cleanupMs,
  });
  const tools: AnyAgentTool[] = [
    ...base,
    bashTool as unknown as AnyAgentTool,
    processTool as unknown as AnyAgentTool,
    createWhatsAppLoginTool(),
    ...createClawdisTools(),
    createWebSearchTool(),
    createWebFetchTool(),
    createAskGeminiTool(),
    createAskGeminiWebTool(),
    createAskGeminiDeepDiveTool(),
    createAskGeminiPdfTool(),
    createAskGeminiCollectionTool(),
  ];
  return tools.map(normalizeToolParameters);
}

// Global map to track tool calls across requests (per-process)
const GLOBAL_TOOL_CALL_TRACKER = new Map<string, { count: number; ts: number }>();
const MAX_TOOL_CALLS_PER_MINUTE = 10;
const TOOL_CALL_WINDOW_MS = 60000; // 1 minute

function checkAndIncrementToolCall(toolName: string): boolean {
  const now = Date.now();
  const key = `${toolName}`;
  
  // Clean up old entries
  for (const [k, data] of GLOBAL_TOOL_CALL_TRACKER.entries()) {
    if (now - data.ts > TOOL_CALL_WINDOW_MS) {
      GLOBAL_TOOL_CALL_TRACKER.delete(k);
    }
  }
  
  const data = GLOBAL_TOOL_CALL_TRACKER.get(key) || { count: 0, ts: now };
  
  // Reset if window expired
  if (now - data.ts > TOOL_CALL_WINDOW_MS) {
    data.count = 0;
    data.ts = now;
  }
  
  data.count += 1;
  GLOBAL_TOOL_CALL_TRACKER.set(key, data);
  
  return data.count <= MAX_TOOL_CALLS_PER_MINUTE;
}

function extractWebSearchQuery(args: unknown): string {
  if (typeof args === "string") {
    const trimmed = args.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractWebSearchQuery(parsed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (!args || typeof args !== "object") return "";

  const record = args as Record<string, unknown>;
  const candidate =
    record.query ?? record.q ?? record.text ?? record.input;

  return typeof candidate === "string" ? candidate.trim() : "";
}

function extractWebFetchArgs(args: unknown): { url: string; goal?: string } {
  if (typeof args === "string") {
    const trimmed = args.trim();
    if (!trimmed) return { url: "" };
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractWebFetchArgs(parsed);
      } catch {
        return { url: trimmed };
      }
    }
    return { url: trimmed };
  }

  if (!args || typeof args !== "object") return { url: "" };

  const record = args as Record<string, unknown>;
  const rawUrl = record.url ?? record.link ?? record.href ?? record.input;
  const rawGoal = record.goal ?? record.mode ?? record.action;

  return {
    url: typeof rawUrl === "string" ? rawUrl.trim() : "",
    goal: typeof rawGoal === "string" && rawGoal.trim() ? rawGoal.trim() : undefined,
  };
}

export function createWebSearchTool(): AnyAgentTool {
  return {
    name: "web_search",
    description: "Search the web for current information. Use when user asks about recent events, current data, or explicitly says 'google', 'search', or 'find'. Always returns results in Russian.",
    parameters: Type.Object({
      query: Type.String({
        description: "The search query to look up on the web",
        examples: ["weather in Moscow today", "latest news about AI", "who won the world cup 2022"],
      }),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const query = extractWebSearchQuery(args);
      const argsType = Array.isArray(args) ? "array" : typeof args;
      console.log('[DEBUG] web_search called with query:', JSON.stringify(query), 'args type:', argsType);
      
      // Validate query parameter
      if (!query || query.trim() === '') {
        console.error('[web_search] ERROR: Query is empty or undefined');
        console.error('[web_search] This usually means the AI agent failed to extract the search terms from the message');
        console.error('[web_search] Raw args:', JSON.stringify(args));
        return {
          content: [
            { type: "text", text: "❌ Ошибка: не удалось извлечь поисковый запрос из сообщения. Попробуйте сформулировать запрос иначе." },
          ],
        };
      }
      try {
        // Loop protection
        if (!checkAndIncrementToolCall('web_search')) {
          return {
            content: [
              { type: "text", text: "✂︎ Превышен лимит вызовов web_search (защита от бесконечного цикла)" },
            ],
          };
        }
        
        // Use the fixed executor instead of CLI
        const { executeWebSearch } = await import("../web-search/executor.js");
        
        const result = await executeWebSearch(query);
        
        if (result.success && result.result?.response) {
          return {
            content: [
              { type: "text", text: `○ Результат поиска:\n${result.result.response}` },
            ],
          };
        }
        
        // Handle errors from executor
        if (!result.success) {
          return {
            content: [
              { type: "text", text: result.error || "✂︎ Поиск не удался" },
            ],
          };
        }
        
        return {
          content: [
            { type: "text", text: "✂︎ Поиск не дал результатов" },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `✂︎ Ошибка: ${String(error)}` },
          ],
        };
      }
    },
  } as unknown as AnyAgentTool;
}

/**
 * URL detection helper
 */
function isUrl(text: string): boolean {
  const urlPattern = /^(https?:\/\/|www\.)[^\s<>"{}|\\^`\[\]]+$/i;
  return urlPattern.test(text.trim());
}

export function createWebFetchTool(): AnyAgentTool {
  return {
    name: "web_fetch",
    description: "Fetch content from a URL. Use when user sends a link/URL and wants to read its content. Also works for summarizing articles, docs, or web pages.",
    parameters: Type.Object({
      url: Type.String({
        description: "The URL to fetch content from",
        examples: ["https://example.com/article", "https://docs.python.org/3.12/"],
      }),
      goal: Type.Optional(Type.String({
        description: "What to do with the content: 'summary', 'extract', 'analyze', or 'full'",
        default: "summary",
      })),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { url, goal } = extractWebFetchArgs(args);
      const safeGoal =
        goal && ["summary", "extract", "analyze", "full"].includes(goal)
          ? goal
          : undefined;
      console.log('[DEBUG] web_fetch called with url:', JSON.stringify(url), 'goal:', safeGoal);

      // Validate URL
      if (!url || !isUrl(url)) {
        return {
          content: [
            { type: "text", text: "❌ Ошибка: неверный URL. Убедитесь, что ссылка начинается с http:// или https://" },
          ],
        };
      }

      try {
        // Loop protection
        if (!checkAndIncrementToolCall('web_fetch')) {
          return {
            content: [
              { type: "text", text: "✂︎ Превышен лимит вызовов web_fetch (защита от бесконечного цикла)" },
            ],
          };
        }

        // Use gemini-based webReader adapter (has network access via Google API)
        // This works in isolated environments where direct fetch() is blocked
        const { fetchViaWebReader } = await import("../web-fetch/webReader-adapter.js");
        const content = await fetchViaWebReader(url, { timeout: 120000, goal: safeGoal });

        return {
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `❌ Ошибка загрузки URL: ${String(error).slice(0, 200)}` },
          ],
        };
      }
    },
  } as unknown as AnyAgentTool;
}
