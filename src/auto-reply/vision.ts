import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { runExec } from "../process/exec.js";
import { resolveUserPath } from "../utils.js";

export type GeminiVisionRequest = {
  scriptPath: string;
  files: string[];
  configPath?: string;
  prompt?: string;
  promptKey?: string;
  model?: string;
  outputFormat?: "text" | "json" | "stream-json";
  responseJson?: boolean;
  tail?: string;
  noTail?: boolean;
  timeoutSeconds?: number;
  logPath?: string;
  logOutputChars?: number;
};

export type GeminiVisionRawResult = {
  stdout: string;
  stderr: string;
};

export type GeminiVisionParsedResult = {
  raw: string;
  envelope?: Record<string, unknown>;
  responseText: string;
  responseJson?: Record<string, unknown>;
  language?: string;
  response?: string;
  data?: unknown;
};

type VisionLogEntry = {
  ts: string;
  event: "start" | "success" | "error";
  scriptPath: string;
  args: string[];
  files: string[];
  configPath?: string;
  promptKey?: string;
  model?: string;
  outputFormat?: string;
  responseJson?: boolean;
  timeoutSeconds?: number;
  durationMs?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
};

export async function runGeminiVision(
  request: GeminiVisionRequest,
): Promise<GeminiVisionRawResult> {
  const scriptPath = request.scriptPath?.trim();
  if (!scriptPath) {
    throw new Error("gemini vision scriptPath is required");
  }
  const files = request.files?.map((file) => file.trim()).filter(Boolean);
  if (!files || files.length === 0) {
    throw new Error("gemini vision requires at least one file");
  }

  const prompt = request.prompt?.trim();
  const promptKey = request.promptKey?.trim();
  if (prompt && promptKey) {
    throw new Error("gemini vision cannot combine prompt and promptKey");
  }
  const tail = request.tail?.trim();
  if (tail && request.noTail) {
    throw new Error("gemini vision cannot combine tail and noTail");
  }

  const args: string[] = [];
  if (request.configPath?.trim()) {
    args.push("--config", request.configPath.trim());
  }
  if (promptKey) {
    args.push("--prompt-key", promptKey);
  } else if (prompt) {
    args.push("--prompt", prompt);
  }
  if (request.model?.trim()) {
    args.push("--model", request.model.trim());
  }
  if (request.outputFormat?.trim()) {
    args.push("--output-format", request.outputFormat.trim());
  }
  if (typeof request.responseJson === "boolean") {
    args.push(request.responseJson ? "--response-json" : "--no-response-json");
  }
  if (tail) {
    args.push("--tail", tail);
  } else if (request.noTail) {
    args.push("--no-tail");
  }
  if (
    typeof request.timeoutSeconds === "number" &&
    Number.isFinite(request.timeoutSeconds) &&
    request.timeoutSeconds > 0
  ) {
    args.push("--timeout", `${Math.ceil(request.timeoutSeconds)}`);
  }

  for (const file of files) {
    args.push("--file", file);
  }

  const logPath = normalizeLogPath(request.logPath);
  const logOutputChars = normalizeLogOutputChars(request.logOutputChars);
  const baseLog: Omit<VisionLogEntry, "event" | "ts"> = {
    scriptPath,
    args,
    files,
    configPath: request.configPath?.trim() || undefined,
    promptKey,
    model: request.model?.trim() || undefined,
    outputFormat: request.outputFormat?.trim(),
    responseJson: request.responseJson,
    timeoutSeconds: request.timeoutSeconds,
  };
  const startTime = Date.now();
  await appendVisionLog(logPath, {
    ...baseLog,
    ts: new Date(startTime).toISOString(),
    event: "start",
  });

  const timeoutMs =
    typeof request.timeoutSeconds === "number" &&
    Number.isFinite(request.timeoutSeconds) &&
    request.timeoutSeconds > 0
      ? Math.max(Math.ceil(request.timeoutSeconds * 1000), 1000)
      : undefined;
  const maxBuffer = 10 * 1024 * 1024;
  try {
    const { stdout, stderr } = await runExec(scriptPath, args, {
      timeoutMs,
      maxBuffer,
    });
    const durationMs = Date.now() - startTime;
    await appendVisionLog(logPath, {
      ...baseLog,
      ts: new Date().toISOString(),
      event: "success",
      durationMs,
      stdout: truncateIf(stdout, logOutputChars),
      stderr: truncateIf(stderr, logOutputChars),
    });
    return { stdout, stderr };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errOutput = extractExecOutput(err);
    const details = formatExecDetails(errOutput);
    await appendVisionLog(logPath, {
      ...baseLog,
      ts: new Date().toISOString(),
      event: "error",
      durationMs,
      stdout: truncateIf(errOutput?.stdout, logOutputChars),
      stderr: truncateIf(errOutput?.stderr, logOutputChars),
      error: details,
    });
    const suffix = details ? ` (${details})` : "";
    const message = `gemini vision failed${suffix}`;
    throw new Error(message);
  }
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function extractExecOutput(
  err: unknown,
): { stdout?: string; stderr?: string; message?: string } | undefined {
  if (!err || typeof err !== "object") return undefined;
  const rec = err as { stdout?: unknown; stderr?: unknown; message?: unknown };
  return {
    stdout: typeof rec.stdout === "string" ? rec.stdout : undefined,
    stderr: typeof rec.stderr === "string" ? rec.stderr : undefined,
    message: typeof rec.message === "string" ? rec.message : undefined,
  };
}

function formatExecDetails(
  errOutput: { stdout?: string; stderr?: string; message?: string } | undefined,
): string | undefined {
  if (!errOutput) return undefined;
  const chunks: string[] = [];
  if (errOutput.stderr && errOutput.stderr.trim()) {
    chunks.push(`stderr: ${truncate(errOutput.stderr.trim(), 400)}`);
  }
  if (errOutput.stdout && errOutput.stdout.trim()) {
    chunks.push(`stdout: ${truncate(errOutput.stdout.trim(), 400)}`);
  }
  if (chunks.length > 0) return chunks.join("; ");
  if (errOutput.message && errOutput.message.trim()) {
    return truncate(errOutput.message.trim(), 400);
  }
  return undefined;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function truncateIf(value: string | undefined, max: number): string | undefined {
  if (value == null) return undefined;
  if (max <= 0) return undefined;
  return truncate(value, max);
}

function normalizeLogPath(pathValue?: string): string | undefined {
  const trimmed = pathValue?.trim();
  if (!trimmed) return undefined;
  return resolveUserPath(trimmed);
}

function normalizeLogOutputChars(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 4000;
  }
  return Math.max(Math.floor(value), 0);
}

async function appendVisionLog(
  logPath: string | undefined,
  entry: VisionLogEntry,
): Promise<void> {
  if (!logPath) return;
  try {
    await mkdir(path.dirname(logPath), { recursive: true });
    const line = `${JSON.stringify(entry)}\n`;
    await appendFile(logPath, line, "utf-8");
  } catch {
    // Never break the vision pipeline due to log failures.
  }
}

function parseJsonObject(
  raw: string,
): { ok: true; value: Record<string, unknown> } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return { ok: false };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false };
  }
}

export function parseGeminiVisionOutput(
  stdout: string,
): GeminiVisionParsedResult {
  const raw = stdout ?? "";
  const rawTrimmed = raw.trim();
  const envelopeParsed = parseJsonObject(rawTrimmed);
  const envelope = envelopeParsed.ok ? envelopeParsed.value : undefined;

  const envelopeResponse =
    envelope && typeof envelope.response === "string"
      ? String(envelope.response)
      : "";
  const responseText = envelopeResponse ? envelopeResponse : rawTrimmed;
  const stripped = stripCodeFences(responseText);

  const responseParsed = parseJsonObject(stripped);
  const responseJson = responseParsed.ok ? responseParsed.value : undefined;

  const language =
    responseJson && typeof responseJson.language === "string"
      ? responseJson.language
      : undefined;
  const response =
    responseJson && typeof responseJson.response === "string"
      ? responseJson.response
      : responseText.trim() || undefined;
  const data = responseJson ? responseJson.data : undefined;

  return {
    raw,
    envelope,
    responseText,
    responseJson,
    language,
    response,
    data,
  };
}
