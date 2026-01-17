/**
 * TTS CLI Executor
 */

import { Buffer } from "node:buffer";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import { loadConfig } from "../config/config.js";

const execFileAsync = promisify(execFile);

export interface ExecuteTTSOptions {
  cliPath?: string;
  timeoutMs?: number;
  dryRun?: boolean;
  speaker1?: string;
  speaker2?: string;
  outputDir?: string;
}

export interface ExecuteTTSResult {
  success: boolean;
  audioPath?: string;
  scriptPath?: string;
  error?: string;
  durationSec?: number;
}

export async function executeTTS(
  topic: string,
  options: ExecuteTTSOptions = {}
): Promise<ExecuteTTSResult> {
  const cfg = loadConfig();
  const ttsCliConfig = cfg.ttsCli;
  const {
    timeoutMs = ttsCliConfig?.timeoutMs ?? 300000, // 5 minutes for full pipeline
    dryRun = false,
    speaker1 = ttsCliConfig?.defaultSpeaker1 ?? "Alex",
    speaker2 = ttsCliConfig?.defaultSpeaker2 ?? "Sarah",
    outputDir = ttsCliConfig?.outputDir ?? "./output",
  } = options;

  // Validate topic
  if (!topic || topic.length < 5) {
    return {
      success: false,
      error: "Topic too short. Please provide a detailed topic (min 5 characters)."
    };
  }

  if (topic.length > 500) {
    return {
      success: false,
      error: "Topic too long (max 500 characters)."
    };
  }

  try {
    // Resolve CLI path - default to user's TTS CLI
    const defaultTTSCli = path.resolve(
      process.env.HOME || "/home/almaz",
      "TOOLS",
      "gemini_tts_cli_sandbox",
      "tts_cli.sh"
    );

    const cliPath = options.cliPath || ttsCliConfig?.cliPath || defaultTTSCli;
    await fs.promises.mkdir(outputDir, { recursive: true }).catch(() => {});

    if (!fs.existsSync(cliPath)) {
      return {
        success: false,
        error: `TTS CLI not found at ${cliPath}. Please check installation.`
      };
    }

    if (dryRun) {
      const placeholderPath = path.join(outputDir, `dry_run_podcast_${Date.now()}.mp3`);
      const placeholderMp3Base64 =
        "SUQzAwAAAAAAFlRFTkMAAAABAAABAgAAABNzeXN0ZW0AAAAbAAABAEF1ZGlvIEZpbGUgR2VuZXJhdGVkIGJ5IENMQVdESVM=";
      const placeholderMp3 = Buffer.from(placeholderMp3Base64, "base64");
      await fs.promises.writeFile(placeholderPath, placeholderMp3);
      return {
        success: true,
        audioPath: placeholderPath,
        durationSec: 5
      };
    }

    // Build command arguments
    const outputPath = path.join(
      outputDir,
      `telegram_podcast_${Date.now()}.mp3`,
    );
    const args = [
      "podcast",
      topic,
      "--speaker1", speaker1,
      "--speaker2", speaker2,
      "--output", outputPath,
    ];

    console.log(`[tts] Executing: ${cliPath} ${args.join(" ")}`);

    const startTime = Date.now();
    const { stdout, stderr } = await execFileAsync(cliPath, args, {
      timeout: timeoutMs,
      env: { ...process.env, PATH: process.env.PATH }
    });

    const durationSec = Math.round((Date.now() - startTime) / 1000);

    // Parse output to find generated files
    const outputMatch = stdout.match(/saved to (.+\.mp3)/i);
    let audioPath = outputMatch ? outputMatch[1] : outputPath;
    if (!fs.existsSync(audioPath)) {
      try {
        const candidates = fs.readdirSync(outputDir)
          .filter((file) => file.endsWith(".mp3") && file.startsWith("telegram_podcast_"))
          .map((file) => ({
            path: path.join(outputDir, file),
            mtimeMs: fs.statSync(path.join(outputDir, file)).mtimeMs,
          }))
          .sort((a, b) => b.mtimeMs - a.mtimeMs);
        if (candidates[0]) {
          audioPath = candidates[0].path;
        }
      } catch {
        // ignore lookup failures and keep original path
      }
    }

    return {
      success: true,
      audioPath,
      durationSec
    };

  } catch (error) {
    console.error("[tts] Execution failed:", error);
    
    // Handle timeout error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: `⏱️ Timeout after ${Math.round(timeoutMs / 1000)} seconds. The podcast generation took too long.`
      };
    }

    // Extract error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to generate podcast: ${errorMessage}`
    };
  }
}

/**
 * Check if TTS CLI is available
 */
export async function isTTSAvailable(cliPath?: string): Promise<boolean> {
  try {
    const defaultPath = path.resolve(
      process.env.HOME || "/home/almaz",
      "TOOLS",
      "gemini_tts_cli_sandbox",
      "tts_cli.sh"
    );
    
    const testPath = cliPath || defaultPath;
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    
    await execFileAsync(testPath, ["--help"]);
    return true;
  } catch {
    return false;
  }
}
