import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadModelCatalog } from "../agents/model-catalog.js";
import { runEmbeddedPiAgent } from "../agents/pi-embedded.js";
import { getReplyFromConfig } from "./reply.js";
import { runGeminiVision } from "./vision.js";

vi.mock("../agents/pi-embedded.js", () => ({
  abortEmbeddedPiRun: vi.fn().mockReturnValue(false),
  runEmbeddedPiAgent: vi.fn(),
  queueEmbeddedPiMessage: vi.fn().mockReturnValue(false),
  resolveEmbeddedSessionLane: (key: string) =>
    `session:${key.trim() || "main"}`,
}));

vi.mock("../agents/model-catalog.js", () => ({
  loadModelCatalog: vi.fn(),
}));

vi.mock("./vision.js", async () => {
  const actual = await vi.importActual<typeof import("./vision.js")>(
    "./vision.js",
  );
  return {
    ...actual,
    runGeminiVision: vi.fn(),
  };
});

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "clawdis-vision-"));
  const previousHome = process.env.HOME;
  process.env.HOME = base;
  try {
    return await fn(base);
  } finally {
    process.env.HOME = previousHome;
    await fs.rm(base, { recursive: true, force: true });
  }
}

describe("vision integration", () => {
  beforeEach(() => {
    vi.mocked(runEmbeddedPiAgent).mockReset();
    vi.mocked(runGeminiVision).mockReset();
    vi.mocked(loadModelCatalog).mockResolvedValue([
      { id: "claude-opus-4-5", name: "Opus 4.5", provider: "anthropic" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects vision output into agent prompt", async () => {
    await withTempHome(async (home) => {
      vi.mocked(runGeminiVision).mockResolvedValue({
        stdout: JSON.stringify({
          response:
            "```json\n{\"language\":\"en\",\"response\":\"hello\",\"data\":{\"ok\":true}}\n```",
        }),
        stderr: "",
      });
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "ok" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "anthropic", model: "m" },
        },
      });

      const storePath = path.join(home, "sessions.json");
      await getReplyFromConfig(
        {
          Body: "see",
          From: "+1000",
          To: "+2000",
          MediaPath: "/tmp/pic.png",
          MediaType: "image/png",
        },
        {},
        {
          agent: {
            model: "anthropic/claude-opus-4-5",
            workspace: path.join(home, "clawd"),
            vision: {
              enabled: true,
              scriptPath: "/bin/gemini_vision.sh",
              configPath: "/tmp/prompts.yaml",
              promptKey: "describe_image",
              timeoutSeconds: 10,
            },
          },
          routing: { allowFrom: ["*"] },
          session: { store: storePath },
        },
      );

      const call = vi.mocked(runEmbeddedPiAgent).mock.calls[0]?.[0];
      expect(call?.prompt).toContain("[vision] hello");
      expect(call?.prompt).toContain('[vision:data] {"ok":true}');
      expect(runGeminiVision).toHaveBeenCalledOnce();
    });
  });

  it("prefixes the user reply with the image description", async () => {
    await withTempHome(async (home) => {
      vi.mocked(runGeminiVision).mockResolvedValue({
        stdout: JSON.stringify({
          response:
            "```json\n{\"language\":\"ru\",\"response\":\"кот на диване\",\"data\":{}}\n```",
        }),
        stderr: "",
      });
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "Привет!" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "anthropic", model: "m" },
        },
      });

      const storePath = path.join(home, "sessions.json");
      const result = await getReplyFromConfig(
        {
          Body: "look",
          From: "+1000",
          To: "+2000",
          MediaPath: "/tmp/pic.png",
          MediaType: "image/png",
        },
        {},
        {
          agent: {
            model: "anthropic/claude-opus-4-5",
            workspace: path.join(home, "clawd"),
            vision: {
              enabled: true,
              scriptPath: "/bin/gemini_vision.sh",
              promptKey: "describe_image",
            },
          },
          routing: { allowFrom: ["*"] },
          session: { store: storePath },
        },
      );

      const replyText = Array.isArray(result)
        ? result[0]?.text
        : result?.text;
      expect(replyText).toContain("Я вижу: кот на диване");
      expect(replyText).toContain("Привет!");
    });
  });

  it("routes OCR prompt when the message asks to read text", async () => {
    await withTempHome(async (home) => {
      vi.mocked(runGeminiVision).mockResolvedValue({
        stdout: JSON.stringify({
          response:
            "```json\n{\"language\":\"en\",\"response\":\"ok\",\"data\":{}}\n```",
        }),
        stderr: "",
      });
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "ok" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "anthropic", model: "m" },
        },
      });

      const storePath = path.join(home, "sessions.json");
      await getReplyFromConfig(
        {
          Body: "extract the text",
          From: "+1000",
          To: "+2000",
          MediaPath: "/tmp/pic.png",
          MediaType: "image/png",
        },
        {},
        {
          agent: {
            model: "anthropic/claude-opus-4-5",
            workspace: path.join(home, "clawd"),
            vision: {
              enabled: true,
              scriptPath: "/bin/gemini_vision.sh",
              promptKey: "describe_image",
              promptKeyOcr: "ocr_extract",
            },
          },
          routing: { allowFrom: ["*"] },
          session: { store: storePath },
        },
      );

      const call = vi.mocked(runGeminiVision).mock.calls[0]?.[0];
      expect(call?.promptKey).toBe("ocr_extract");
    });
  });

  it("reuses stored vision on reply to an image", async () => {
    await withTempHome(async (home) => {
      vi.mocked(runGeminiVision).mockResolvedValue({
        stdout: JSON.stringify({
          response:
            "```json\n{\"language\":\"en\",\"response\":\"first\",\"data\":{}}\n```",
        }),
        stderr: "",
      });
      vi.mocked(runEmbeddedPiAgent).mockResolvedValue({
        payloads: [{ text: "ok" }],
        meta: {
          durationMs: 5,
          agentMeta: { sessionId: "s", provider: "anthropic", model: "m" },
        },
      });

      const storePath = path.join(home, "sessions.json");
      const baseConfig = {
        agent: {
          model: "anthropic/claude-opus-4-5",
          workspace: path.join(home, "clawd"),
          vision: {
            enabled: true,
            scriptPath: "/bin/gemini_vision.sh",
            promptKey: "describe_image",
          },
        },
        routing: { allowFrom: ["*"] },
        session: { store: storePath },
      };

      await getReplyFromConfig(
        {
          Body: "first",
          From: "+1000",
          To: "+2000",
          MediaPath: "/tmp/pic.png",
          MediaType: "image/png",
        },
        {},
        baseConfig as never,
      );

      vi.mocked(runGeminiVision).mockClear();
      vi.mocked(runEmbeddedPiAgent).mockClear();

      await getReplyFromConfig(
        {
          Body: "what about it?",
          From: "+1000",
          To: "+2000",
          ReplyToBody: "<media:image>",
        },
        {},
        baseConfig as never,
      );

      const call = vi.mocked(runEmbeddedPiAgent).mock.calls[0]?.[0];
      expect(call?.prompt).toContain("[vision] first");
      expect(runGeminiVision).not.toHaveBeenCalled();
    });
  });
});
