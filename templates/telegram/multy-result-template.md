# Telegram /multy Result Formatting Template

This document defines the ideal formatting for /multy result messages in Telegram.
The output is sent as MarkdownV2 (via `formatTelegramMessage`), so keep it simple
and predictable.

## Rules
- Use a single bold title line: `*Тема: <TITLE>*` (no surrounding brackets).
- Keep one blank line between sections.
- Use Russian section labels exactly: `Краткое содержание:` and `Темы:`.
- Each bullet is its own paragraph (blank line between bullets).
- Use only the allowed markers: `○`, `◐`, `●`, `◑`, `①`-`⑤`.
- Do not use visual separators like `│`.
- Links:
  - Put the article URL as a raw URL on its own line to allow a preview.
  - Put raw answers as a Markdown link: `[Сырые ответы](<RAW_URL>)`.

## Template (Markdown)
```text
*Тема: <TITLE>*

Краткое содержание:

<SUMMARY_PARAGRAPH>

Темы:

① <TOPIC_1>

② <TOPIC_2>

③ <TOPIC_3>

④ <TOPIC_4>

○ <INSIGHT_1>

○ <INSIGHT_2>

○ <INSIGHT_3>

○ <INSIGHT_4>

Статья: <ARTICLE_URL>
[Сырые ответы](<RAW_URL>)
```

## Notes
- If there are no insights, omit the `○` block entirely.
- If there is no article URL, omit the `Статья:` line and disable link previews.
- The first raw URL in the message will get the Telegram preview, so keep the
  article URL first and the raw answers as a Markdown link.
