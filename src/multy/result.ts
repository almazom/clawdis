type MultySummary = {
  prompt?: string;
  article_url?: string;
  raw_url?: string;
  run_metadata_path?: string;
};

type MarkdownSections = Record<string, string[]>;

const SECTION_HEADERS = [
  "Главная идея",
  "История и контекст",
  "Ключевые особенности",
  "Почему это важно",
  "Интересные факты",
  "Связи и влияние",
  "Рекомендации для читателя",
];

export function buildMultyResultMessage(params: {
  summary: MultySummary;
  topic: string;
  articleMarkdown?: string;
  summaryOverride?: string;
  showRunPath?: boolean;
}): string {
  const {
    summary,
    topic,
    articleMarkdown = "",
    summaryOverride,
    showRunPath = false,
  } = params;
  const title =
    extractTitle(articleMarkdown) ??
    summary.prompt ??
    topic;
  const sections = parseSections(articleMarkdown);
  const summaryText =
    summaryOverride ??
    compressSummary(
      extractFirstParagraph(sections["Главная идея"] ?? []) ??
        extractFirstParagraph(findFirstSectionParagraphs(sections)) ??
        "",
      3,
    ) ??
    "Краткое содержание недоступно.";
  const bullets = extractBullets(sections);
  const topics = bullets.slice(0, 4);
  const insights = bullets.slice(4, 8);
  const fallbackTopics = topics.length > 0 ? topics : fallbackSectionTopics(sections);
  const fallbackInsights =
    insights.length > 0 ? insights : fallbackSentenceInsights(summaryText);

  const lines: string[] = [
    `*Тема: ${title}*`,
    "",
    "Краткое содержание:",
    "",
    summaryText,
    "",
    "Темы:",
    "",
    ...formatNumbered(fallbackTopics, ["①", "②", "③", "④", "⑤"]),
    "",
    ...formatNumbered(fallbackInsights, ["○", "○", "○", "○", "○"]),
  ];

  const linkLines: string[] = [];
  if (summary.article_url) {
    linkLines.push(`Статья: ${summary.article_url}`);
  }
  if (summary.raw_url) {
    linkLines.push(`[Сырые ответы](${summary.raw_url})`);
  }
  if (linkLines.length > 0) {
    lines.push("", ...linkLines);
  }
  if (showRunPath && summary.run_metadata_path) {
    lines.push(`🧾 Run: ${summary.run_metadata_path}`);
  }

  return lines.join("\n");
}

function extractTitle(markdown: string): string | null {
  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      return trimmed.slice(2).trim();
    }
  }
  return null;
}

function parseSections(markdown: string): MarkdownSections {
  const sections: MarkdownSections = {};
  let current: string | null = null;
  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      const header = trimmed.slice(3).trim();
      if (SECTION_HEADERS.includes(header)) {
        current = header;
        sections[current] = [];
      } else {
        current = null;
      }
      continue;
    }
    if (current) {
      sections[current].push(trimmed);
    }
  }
  return sections;
}

function extractFirstParagraph(lines: string[]): string | null {
  const buffer: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (buffer.length > 0) break;
      continue;
    }
    buffer.push(line);
  }
  if (buffer.length === 0) return null;
  return buffer.join(" ").replace(/\s+/g, " ").trim();
}

function extractBullets(sections: MarkdownSections): string[] {
  const bullets: string[] = [];
  for (const key of SECTION_HEADERS) {
    const lines = sections[key] ?? [];
    for (const line of lines) {
      if (!line) continue;
      const match = line.match(/^[-*•]\s+(.*)$/);
      if (match && match[1]) {
        bullets.push(cleanLine(match[1]));
      }
    }
  }
  return bullets;
}

function findFirstSectionParagraphs(sections: MarkdownSections): string[] {
  for (const header of SECTION_HEADERS) {
    const lines = sections[header];
    if (lines && lines.some((line) => line.trim().length > 0)) {
      return lines;
    }
  }
  return [];
}

function cleanLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function fallbackSectionTopics(sections: MarkdownSections): string[] {
  const topics: string[] = [];
  for (const header of SECTION_HEADERS) {
    if (sections[header] && topics.length < 4) {
      topics.push(header);
    }
  }
  return topics.slice(0, 4);
}

function fallbackSentenceInsights(summaryText: string): string[] {
  const parts = summaryText
    .split(/[.!?]\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.slice(0, 4);
}

function formatNumbered(items: string[], symbols: string[]): string[] {
  const lines = items.slice(0, Math.min(4, symbols.length)).map((item, index) => {
    const symbol = symbols[index] ?? "○";
    return `${symbol} ${item}`;
  });
  const spaced: string[] = [];
  for (const line of lines) {
    if (spaced.length > 0) spaced.push("");
    spaced.push(line);
  }
  return spaced;
}

function compressSummary(text: string, maxSentences: number): string | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return sentences.slice(0, Math.max(2, Math.min(maxSentences, 3))).join(" ");
}
