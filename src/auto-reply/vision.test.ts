import { describe, expect, it, vi } from "vitest";

import {
  parseGeminiVisionOutput,
  runGeminiVision,
} from "./vision.js";

const runExecMock = vi.hoisted(
  () => vi.fn(async () => ({ stdout: "ok\n", stderr: "" })),
);

vi.mock("../process/exec.js", () => ({
  runExec: runExecMock,
}));

const appendFileMock = vi.hoisted(() => vi.fn(async () => undefined));
const mkdirMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("node:fs/promises", () => ({
  appendFile: appendFileMock,
  mkdir: mkdirMock,
}));

describe("parseGeminiVisionOutput", () => {
  it("extracts response/data from fenced JSON envelope", () => {
    const stdout = JSON.stringify({
      response:
        "```json\n{\"language\":\"ru\",\"response\":\"hello\",\"data\":{\"ok\":true}}\n```",
    });
    const parsed = parseGeminiVisionOutput(stdout);
    expect(parsed.response).toBe("hello");
    expect(parsed.data).toEqual({ ok: true });
    expect(parsed.language).toBe("ru");
  });

  it("falls back to raw text when output is not JSON", () => {
    const parsed = parseGeminiVisionOutput("plain text");
    expect(parsed.response).toBe("plain text");
    expect(parsed.responseJson).toBeUndefined();
  });

  it("parses fenced JSON without wrapper envelope", () => {
    const stdout =
      "```json\n{\"language\":\"en\",\"response\":\"ok\",\"data\":{\"foo\":1}}\n```";
    const parsed = parseGeminiVisionOutput(stdout);
    expect(parsed.response).toBe("ok");
    expect(parsed.data).toEqual({ foo: 1 });
    expect(parsed.language).toBe("en");
  });

  it("parses unfenced JSON in wrapper response", () => {
    const stdout = JSON.stringify({
      response: "{\"language\":\"en\",\"response\":\"yo\",\"data\":{}}",
    });
    const parsed = parseGeminiVisionOutput(stdout);
    expect(parsed.response).toBe("yo");
    expect(parsed.data).toEqual({});
  });
});

describe("runGeminiVision", () => {
  it("builds the wrapper command args", async () => {
    await runGeminiVision({
      scriptPath: "/bin/gemini_vision.sh",
      files: ["/tmp/img.png"],
      configPath: "/tmp/prompts.yaml",
      promptKey: "describe_image",
      model: "gemini-test",
      outputFormat: "json",
      responseJson: false,
      tail: "Respond in English.",
      logPath: "/tmp/vision.log",
      logOutputChars: 10,
      timeoutSeconds: 7,
    });
    expect(runExecMock).toHaveBeenCalledWith(
      "/bin/gemini_vision.sh",
      [
        "--config",
        "/tmp/prompts.yaml",
        "--prompt-key",
        "describe_image",
        "--model",
        "gemini-test",
        "--output-format",
        "json",
        "--no-response-json",
        "--tail",
        "Respond in English.",
        "--timeout",
        "7",
        "--file",
        "/tmp/img.png",
      ],
      expect.objectContaining({ timeoutMs: 7000 }),
    );
    expect(appendFileMock).toHaveBeenCalled();
  });

  it("rejects when both prompt and promptKey are provided", async () => {
    await expect(
      runGeminiVision({
        scriptPath: "/bin/gemini_vision.sh",
        files: ["/tmp/img.png"],
        prompt: "Describe it",
        promptKey: "describe_image",
      }),
    ).rejects.toThrow(/prompt and promptKey/);
  });

  it("rejects when both tail and noTail are provided", async () => {
    await expect(
      runGeminiVision({
        scriptPath: "/bin/gemini_vision.sh",
        files: ["/tmp/img.png"],
        tail: "Keep it short",
        noTail: true,
      }),
    ).rejects.toThrow(/tail and noTail/);
  });
});
