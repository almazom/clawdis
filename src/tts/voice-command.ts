/**
 * Parse /v voice command from message text
 * Format: /v [text] or just /v to use last message
 */
export function parseVoiceCommand(message: string): { text?: string } | null {
  const trimmed = message.trim();
  if (!trimmed) return null;

  const slashMatch = /^\/v(?:@\w+)?(?:\s+(.+))?$/i.exec(trimmed);
  if (slashMatch) {
    return { text: slashMatch[1] };
  }

  const triggerMatch =
    /^(?:tts|vtt|озвучи)(?:(?:\s*[:,-]\s*)|(?:\s+)|$)([\s\S]+)?$/i.exec(trimmed);
  if (!triggerMatch) return null;

  return { text: triggerMatch[1] };
}

/**
 * Get last assistant message from session transcript
 */
export async function getLastAssistantMessageFromTranscript(
  transcriptPath: string
): Promise<string | null> {
  try {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(transcriptPath, "utf-8");
    const lines = content.trim().split("\n").filter(line => line.trim());

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        
        if (entry.type === "message" && entry.message) {
          const msg = entry.message;
          
          if (msg.role === "assistant" && msg.content) {
            const content = msg.content;
            if (Array.isArray(content) && content.length > 0) {
              const textContent = content[0];
              if (textContent?.type === "text" && textContent.text) {
                return textContent.text;
              }
            }
          }
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function extractFirstUrl(text: string): string | null {
  const match = /https?:\/\/[^\s<>()]+/i.exec(text);
  if (!match) return null;

  return match[0].replace(/[)\],.!?]+$/, "");
}

export function stripMarkdownForSpeech(text: string): string {
  let output = text;
  output = output.replace(/```[\s\S]*?```/g, "\n");
  output = output.replace(/`([^`\n]+)`/g, "$1");
  output = output.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  output = output.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  output = output.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  output = output.replace(/^\s*>+\s?/gm, "");
  output = output.replace(/^\s*(?:[-*+•]|\d+\.)\s+/gm, "");
  output = output.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1");

  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => (/[.!?:;]$/.test(line) ? line : `${line}.`))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
