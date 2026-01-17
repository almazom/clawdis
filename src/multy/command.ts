export type MultyCommand = {
  topic: string;
};

const MULTY_COMMAND_RE = /^\/mu(?:lty|ly)(?:@[a-z0-9_]+)?(?:\s+|:\s*)?(.*)$/is;

export function parseMultyCommand(message: string): MultyCommand | null {
  const trimmed = message.trim();
  const match = MULTY_COMMAND_RE.exec(trimmed);
  if (!match) return null;

  const topic = match[1]?.trim() ?? "";
  return { topic };
}
