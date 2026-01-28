import { describe, expect, it } from "vitest";

import { buildMultyResultMessage } from "./result.js";

describe("multy result formatter", () => {
  it("uses markdown title, summaries, bullets, and links", () => {
    const articleMarkdown = [
      "# Мой заголовок",
      "",
      "## Главная идея",
      "Первое предложение. Второе предложение. Третье предложение. Четвертое предложение.",
      "",
      "- Пункт 1",
      "- Пункт 2",
      "",
      "## История и контекст",
      "- Контекст 1",
    ].join("\n");

    const message = buildMultyResultMessage({
      summary: {
        article_url: "https://example.com/article",
        raw_url: "https://example.com/raw",
        prompt: "Fallback prompt",
      },
      topic: "Fallback topic",
      articleMarkdown,
    });

    expect(message).toContain("*Тема: Мой заголовок*");
    expect(message).toContain(
      "Первое предложение. Второе предложение. Третье предложение.",
    );
    expect(message).not.toContain("Четвертое предложение");
    expect(message).toContain("① Пункт 1");
    expect(message).toContain("② Пункт 2");
    expect(message).toContain("Статья: https://example.com/article");
    expect(message).toContain("[Сырые ответы](https://example.com/raw)");
  });

  it("falls back to topic when markdown is missing", () => {
    const message = buildMultyResultMessage({
      summary: {},
      topic: "Тема без markdown",
    });

    expect(message).toContain("*Тема: Тема без markdown*");
    expect(message).toContain("Краткое содержание недоступно.");
  });
});
