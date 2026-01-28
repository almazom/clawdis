import { describe, expect, it } from "vitest";

import {
  extractFirstUrl,
  parseVoiceCommand,
  stripMarkdownForSpeech,
} from "./voice-command.js";

describe("parseVoiceCommand", () => {
  it("parses /v with text", () => {
    expect(parseVoiceCommand("/v hello")?.text).toBe("hello");
  });

  it("parses /v with bot mention", () => {
    expect(parseVoiceCommand("/v@testbot hello")?.text).toBe("hello");
  });

  it("parses tts and vtt triggers", () => {
    expect(parseVoiceCommand("tts hello")?.text).toBe("hello");
    expect(parseVoiceCommand("vtt: hello")?.text).toBe("hello");
  });

  it("parses ozvuchi trigger", () => {
    expect(parseVoiceCommand("озвучи текст")?.text).toBe("текст");
  });

  it("ignores near-misses", () => {
    expect(parseVoiceCommand("ttsfoo")).toBeNull();
  });
});

describe("extractFirstUrl", () => {
  it("extracts and trims trailing punctuation", () => {
    expect(extractFirstUrl("https://example.com.")).toBe("https://example.com");
    expect(extractFirstUrl("See https://example.com/path), thanks")).toBe(
      "https://example.com/path",
    );
  });
});

describe("stripMarkdownForSpeech", () => {
  it("strips common markdown and normalizes whitespace", () => {
    const input = "**Краткое резюме:**\n- пункт 1\n- пункт 2";
    expect(stripMarkdownForSpeech(input)).toBe(
      "Краткое резюме: пункт 1. пункт 2.",
    );
  });
});
