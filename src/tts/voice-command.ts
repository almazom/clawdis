/**
 * Parse /v voice command from message text
 * Format: /v [text] or just /v to use last message
 */
export function parseVoiceCommand(message: string): { text?: string } | null {
  const trimmed = message.trim();
  const VOICE_COMMAND_RE = /^\/v(?:@\w+)?(?:\s+(.+))?$/i;
  
  const match = VOICE_COMMAND_RE.exec(trimmed);
  if (!match) return null;
  
  // If no text provided, will use last message from session
  return { text: match[1] };
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
