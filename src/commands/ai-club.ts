import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

import { loadConfig } from "../config/config.js";
import { logVerbose } from "../globals.js";
import { runExec } from "../process/exec.js";

export type AiClubReport = {
  status: string;
  summary?: string;
  report_url?: string;
  channel?: string;
  period?: string;
};

const DEFAULT_CHANNEL = "@aiclubsweggs";
const MAX_SUMMARY_LENGTH = 3000;
const ANSI_REGEX = /\u001b\[[0-9;]*m/g;

type RangeResult = {
  fromIso: string;
  toIso: string;
  filter: string;
};

function buildRange(period: "today" | "week"): RangeResult {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    start.setDate(start.getDate() - 6);
    return {
      fromIso: start.toISOString(),
      toIso: now.toISOString(),
      filter: "last:7",
    };
  }

  return {
    fromIso: start.toISOString(),
    toIso: now.toISOString(),
    filter: "today",
  };
}

function extractJson(stdout: string): string | null {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const lastBrace = trimmed.lastIndexOf("}");
  const firstBrace = trimmed.lastIndexOf("{", lastBrace);
  if (firstBrace === -1 || lastBrace === -1) return null;
  return trimmed.slice(firstBrace, lastBrace + 1);
}

function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "");
}

function parseCachePath(stdout: string): string | null {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return lines[lines.length - 1];
}

function parseReportUrl(output: string): string | null {
  const match = /https?:\/\/[^\s"']+/i.exec(output);
  return match ? match[0] : null;
}

function parseGeneratedPath(output: string): string | null {
  const match = /(?:Generated:|File:)\s+([^\s]+)/i.exec(output);
  return match ? match[1] : null;
}

async function isReadableFile(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

async function findLatestReportFile(
  reportsDir: string,
  period: "today" | "week",
): Promise<string | null> {
  let entries: string[];
  try {
    entries = await readdir(reportsDir);
  } catch {
    return null;
  }

  const prefix = `aiclubsweggs_${period}_report_`;
  const candidates = entries.filter(
    (name) => name.startsWith(prefix) && name.endsWith(".md"),
  );
  if (candidates.length === 0) return null;

  let latestPath = "";
  let latestMtime = 0;
  for (const name of candidates) {
    const fullPath = join(reportsDir, name);
    try {
      const info = await stat(fullPath);
      if (!info.isFile()) continue;
      if (info.mtimeMs >= latestMtime) {
        latestMtime = info.mtimeMs;
        latestPath = fullPath;
      }
    } catch {
      continue;
    }
  }

  return latestPath || null;
}

function remainingTimeoutMs(startTime: number, timeoutMs: number): number {
  const elapsed = Date.now() - startTime;
  return Math.max(timeoutMs - elapsed, 0);
}

async function runLegacyAiClub(
  cmdPath: string,
  period: "today" | "week",
  channel: string,
  timeoutMs: number,
): Promise<{ summary: string; url: string; channel: string } | null> {
  const flag = period === "today" ? "--today" : "--week";
  logVerbose(`[ai-club] Running legacy ${cmdPath} ${flag}`);

  try {
    const { stdout, stderr } = await runExec(cmdPath, [flag], { timeoutMs });
    const output = stripAnsi(`${stdout}\n${stderr}`);
    const reportUrl = parseReportUrl(output) ?? "";
    const generatedPath = parseGeneratedPath(output);
    const reportsDir = generatedPath ? dirname(generatedPath) : null;
    let summary = "";

    if (reportsDir) {
      const reportPath = await findLatestReportFile(reportsDir, period);
      if (reportPath) {
        summary = await readFile(reportPath, "utf-8");
      }
    }

    if (summary.length > MAX_SUMMARY_LENGTH) {
      summary = summary.substring(0, MAX_SUMMARY_LENGTH) + "...";
    }

    return {
      summary: summary || `Report for ${period} is ready.`,
      url: reportUrl,
      channel,
    };
  } catch (err) {
    logVerbose(`[ai-club] Legacy execution failed: ${String(err)}`);
    return null;
  }
}

export async function getAiClubReport(
  period: "today" | "week",
): Promise<{
  summary: string;
  url: string;
  channel: string;
} | null> {
  const cfg = loadConfig();
  const cmdPath = cfg.aiClub?.cliPath?.trim() || "ai_club";
  const telegaPath = cfg.aiClub?.telegaV2Path?.trim() || "telega_v2";
  const profile = cfg.aiClub?.telegaV2Profile?.trim() || "default";
  const channel = cfg.aiClub?.channel?.trim() || DEFAULT_CHANNEL;
  const timeoutMs = cfg.aiClub?.timeoutMs ?? 300000;
  const pipelineStart = Date.now();

  const { fromIso, toIso, filter } = buildRange(period);
  const fetchArgs = ["fetch-range", "--profile", profile, channel, filter];

  logVerbose(`[ai-club] telega_v2: ${telegaPath} ${fetchArgs.join(" ")}`);
  logVerbose(`[ai-club] range: ${fromIso} -> ${toIso}`);

  let fetchStdout = "";
  let fetchStderr = "";

  try {
    const remainingMs = remainingTimeoutMs(pipelineStart, timeoutMs);
    if (remainingMs <= 0) {
      logVerbose("[ai-club] Timeout budget exhausted before fetch-range");
      return null;
    }
    const fetchStart = Date.now();
    const result = await runExec(telegaPath, fetchArgs, { timeoutMs: remainingMs });
    fetchStdout = result.stdout;
    fetchStderr = result.stderr;
    logVerbose(`[ai-club] telega_v2 fetch completed in ${Date.now() - fetchStart}ms`);
  } catch (err) {
    logVerbose(`[ai-club] telega_v2 failed: ${String(err)}`);
    const errOutput = err as { stdout?: string; stderr?: string };
    if (errOutput.stdout) logVerbose(`[ai-club] Failed stdout: ${errOutput.stdout}`);
    if (errOutput.stderr) logVerbose(`[ai-club] Failed stderr: ${errOutput.stderr}`);
    return await runLegacyAiClub(cmdPath, period, channel, timeoutMs);
  }

  if (fetchStderr) {
    logVerbose(`[ai-club] telega_v2 stderr: ${fetchStderr}`);
  }

  const cachePath = parseCachePath(fetchStdout);
  if (!cachePath) {
    logVerbose(`[ai-club] Missing cache path in telega_v2 output. stdout: ${fetchStdout}`);
    return await runLegacyAiClub(cmdPath, period, channel, timeoutMs);
  }

  if (!(await isReadableFile(cachePath))) {
    logVerbose(`[ai-club] Cache file missing or unreadable: ${cachePath}`);
    return await runLegacyAiClub(cmdPath, period, channel, timeoutMs);
  }

  logVerbose(`[ai-club] cache: ${cachePath}`);

  const reportArgs = ["--from-cache", cachePath, "--period", period];

  logVerbose(`[ai-club] Running ${cmdPath} ${reportArgs.join(" ")}`);

  try {
    const remainingMs = remainingTimeoutMs(pipelineStart, timeoutMs);
    if (remainingMs <= 0) {
      logVerbose("[ai-club] Timeout budget exhausted before report generation");
      return null;
    }
    const reportStart = Date.now();
    const { stdout, stderr } = await runExec(cmdPath, reportArgs, { timeoutMs: remainingMs });
    if (stderr) {
      logVerbose(`[ai-club] stderr: ${stderr}`);
    }

    const jsonStr = extractJson(stdout);
    if (!jsonStr) {
      logVerbose(`[ai-club] Could not find JSON in output. Full stdout: ${stdout}`);
      return await runLegacyAiClub(cmdPath, period, channel, remainingMs);
    }

    let report: AiClubReport;
    try {
      report = JSON.parse(jsonStr) as AiClubReport;
    } catch (parseErr) {
      logVerbose(`[ai-club] JSON parse failed: ${parseErr}. jsonStr: ${jsonStr}`);
      return null;
    }

    if (report.status !== "success") {
      logVerbose(
        `[ai-club] Report status is not success: ${report.status}. Full report: ${JSON.stringify(report)}`,
      );
      return await runLegacyAiClub(cmdPath, period, channel, remainingMs);
    }

    if (report.report_url) {
      logVerbose(`[ai-club] report url: ${report.report_url}`);
    }
    logVerbose(`[ai-club] report generation completed in ${Date.now() - reportStart}ms`);

    let summary = report.summary || "";
    if (summary.length > MAX_SUMMARY_LENGTH) {
      summary = summary.substring(0, MAX_SUMMARY_LENGTH) + "...";
    }

    return {
      summary: summary || `Report for ${period} is ready.`,
      url: report.report_url ?? "",
      channel: report.channel || channel,
    };
  } catch (err) {
    logVerbose(`[ai-club] Execution failed: ${String(err)}`);
    const errOutput = err as { stdout?: string; stderr?: string };
    if (errOutput.stdout) {
      logVerbose(`[ai-club] Failed stdout: ${errOutput.stdout}`);
    }
    if (errOutput.stderr) {
      logVerbose(`[ai-club] Failed stderr: ${errOutput.stderr}`);
    }
    return await runLegacyAiClub(cmdPath, period, channel, timeoutMs);
  }
}
