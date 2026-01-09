import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";

const execAsync = promisify(exec);

import { loadConfig } from "../config/config.js";
import { loadSessionStore, resolveStorePath, resolveSessionTranscriptPath, type SessionEntry } from "../config/sessions.js";
import { info, warn, danger } from "../globals.js";
import { isTTSEnabled, synthesize } from "../tts/provider.js";
import type { RuntimeEnv } from "../runtime.js";
import { formatErrorMessage } from "../infra/errors.js";

const MessageSchema = z.object({
  role: z.string(),
  content: z.string(),
  timestamp: z.number().optional(),
});

type Message = z.infer<typeof MessageSchema>;

async function getLastMessage(sessionKey = "main"): Promise<string | undefined> {
  const config = loadConfig();
  const storePath = resolveStorePath(config.session?.store);
  const store = loadSessionStore(storePath);
  const session = store[sessionKey];

  if (!session || !session.sessionId) {
    return undefined;
  }

  try {
    const transcriptPath = resolveSessionTranscriptPath(session.sessionId);
    
    if (!existsSync(transcriptPath)) {
      return undefined;
    }

    // Read the transcript file (jsonl format)
    const content = await fs.readFile(transcriptPath, "utf-8");
    const lines = content.trim().split("\n").filter(line => line.trim());

    // Parse each line and find the last assistant message
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        
        if (entry.type === "message" && entry.message) {
          const msg = entry.message;
          
          if (msg.role === "assistant" && msg.content) {
            // Content is an array with text objects
            const textContent = Array.isArray(msg.content) 
              ? msg.content.find((c: any) => c.type === "text")?.text || ""
              : msg.content;
              
            if (textContent && typeof textContent === "string" && textContent.trim()) {
              return textContent;
            }
          }
        }
      } catch (parseError) {
        // Skip invalid JSON lines
        continue;
      }
    }

    return undefined;
  } catch (error) {
    throw new Error(`Failed to read transcript: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function playAudio(filePath: string, runtime: RuntimeEnv): Promise<void> {
  const platform = os.platform();
  
  try {
    if (platform === "darwin") {
      // macOS - use afplay
      runtime.log(info("🎵 Playing audio on macOS..."));
      await execAsync(`afplay "${filePath}"`);
    } else if (platform === "linux") {
      // Linux - try multiple players
      const players = ["mpg123", "mpg321", "mpv", "aplay"];
      let success = false;
      
      for (const player of players) {
        try {
          await execAsync(`which ${player}`);
          runtime.log(info(`🎵 Playing audio with ${player}...`));
          await execAsync(`${player} "${filePath}"`);
          success = true;
          break;
        } catch {
          // Player not found, try next
          continue;
        }
      }
      
      if (!success) {
        runtime.log(warn("⚠️  No suitable audio player found. Install mpg123 or mpv to play audio."));
        runtime.log(info(`💾 Audio saved to: ${filePath}`));
        return;
      }
    } else if (platform === "win32") {
      // Windows - use PowerShell
      runtime.log(info("🎵 Playing audio on Windows..."));
      await execAsync(`powershell -c "(New-Object Media.Soundplayer \\"${filePath}\\").PlaySync();"`);
    } else {
      runtime.log(warn(`⚠️  Unsupported platform: ${platform}`));
      runtime.log(info(`💾 Audio saved to: ${filePath}`));
      return;
    }
    
    // Clean up after playing
    await fs.unlink(filePath);
    runtime.log(info("✅ Audio playback completed"));
  } catch (error) {
    runtime.log(warn(`⚠️  Could not play audio: ${error instanceof Error ? error.message : String(error)}`));
    runtime.log(info(`💾 Audio saved to: ${filePath}`));
  }
}

export async function voiceCommand(
  text: string | undefined,
  opts: { session?: string; play?: boolean; json?: boolean },
  runtime: RuntimeEnv,
): Promise<void> {
  // Check if TTS is enabled
  if (!isTTSEnabled()) {
    const error = "TTS is not enabled or not configured";
    if (opts.json) {
      runtime.log(JSON.stringify({ success: false, error }, null, 2));
    } else {
      runtime.log(danger(`❌ ${error}`));
      runtime.log(info("💡 Configure TTS in ~/.clawdis/clawdis.json or set MINIMAX_API_KEY"));
    }
    return;
  }

  // If no text provided, get the last message from the session transcript
  if (!text || text.trim().length === 0) {
    const sessionKey = opts.session || "main";
    
    if (opts.json) {
      runtime.log(JSON.stringify({ 
        success: false, 
        error: "No text provided and no last message available",
        session: sessionKey 
      }, null, 2));
      return;
    }
    
    runtime.log(info(`🔍 No text provided, retrieving last message from session: ${sessionKey}`));
    
    try {
      text = await getLastMessage(sessionKey);
      if (!text) {
        runtime.log(danger(`❌ No assistant message found in session: ${sessionKey}`));
        runtime.log(info(`💡 Provide text directly: clawdis v "Your text here"`));
        runtime.log(info(`💡 Or specify a different session: clawdis v --session <session_key>`));
        return;
      }
      runtime.log(info(`📝 Using last message: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`));
    } catch (error) {
      runtime.log(danger(`❌ Failed to read session transcript: ${error instanceof Error ? error.message : String(error)}`));
      return;
    }
  }

  // Generate TTS
  if (!opts.json) {
    runtime.log(info("🎤 Generating voice message..."));
  }

  try {
    const result = await synthesize(text);

    if (!result.success) {
      const error = result.error || "Unknown TTS error";
      if (opts.json) {
        runtime.log(JSON.stringify({ success: false, error }, null, 2));
      } else {
        runtime.log(danger(`❌ TTS generation failed: ${error}`));
      }
      return;
    }

    if (!result.audioPath) {
      if (opts.json) {
        runtime.log(JSON.stringify({ success: false, error: "No audio path returned" }, null, 2));
      } else {
        runtime.log(danger("❌ No audio path returned"));
      }
      return;
    }

    // JSON output
    if (opts.json) {
      runtime.log(
        JSON.stringify(
          {
            success: true,
            text,
            audioPath: result.audioPath,
            cached: result.cached,
            truncated: result.truncated,
          },
          null,
          2,
        ),
      );
      return;
    }

    // Human-readable output
    const action = result.cached ? "📦 Retrieved from cache" : "✅ Generated";
    const infoText = result.truncated ? " (text truncated)" : "";
    runtime.log(info(`${action}${infoText}: ${result.audioPath}`));

    // Play audio if requested
    if (opts.play) {
      await playAudio(result.audioPath, runtime);
    } else {
      runtime.log(info(`💾 Audio saved to: ${result.audioPath}`));
      if (process.platform === "darwin") {
        runtime.log(info(`🎵 Use --play to auto-play, or: afplay "${result.audioPath}"`));
      } else if (process.platform === "linux") {
        runtime.log(info(`🎵 Use --play to auto-play, or: mpg123 "${result.audioPath}"`));
      }
    }
  } catch (error) {
    const message = formatErrorMessage(error);
    if (opts.json) {
      runtime.log(JSON.stringify({ success: false, error: message }, null, 2));
    } else {
      runtime.log(danger(`❌ ${message}`));
    }
  }
}

export function registerVoiceCommand(parent: any) {
  parent
    .command("v [text]")
    .alias("voice")
    .description(
      "Generate TTS voice message from text or last message (requires TTS configuration)",
    )
    .option("--session <key>", "Session to retrieve last message from (default: main)")
    .option("--play", "Auto-play the generated audio")
    .option("--json", "Output JSON format")
    .action(async (text: string | undefined, opts: any, command: any) => {
      const runtime = command.parent?.runtime;
      if (!runtime) {
        console.error("Runtime not available");
        process.exit(1);
      }
      await voiceCommand(text, opts, runtime);
    });
}
