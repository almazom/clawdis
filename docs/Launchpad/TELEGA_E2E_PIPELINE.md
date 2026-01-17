# Telega E2E Pipeline (Almaz -> Elena Bot)

This document captures the full endpoint-to-endpoint (E2E) Telegram verification flow used in this repo.
It is designed so an AI agent can run the loop independently and confirm whether changes affect the bot
behavior, especially Markdown/formatting.

Short trigger phrase for agents: "Telega-e2e" (the rebuild decision is automatic).

## Purpose

- Verify changes end-to-end via Telegram with real send + delay + fetch.
- Decide when a rebuild/restart is required and rerun until behavior matches expectations.

## Tools

- `restart-ai` (gateway health + restart/update)
- `rebuild-fast` (full rebuild + restart)
- `telega` (send/fetch via Telegram)

## Targets (fixed)

- Sender profile: `almazom`
- Bot: `@Lana_smartai_bot` (Elena)

## Preflight

1. Ensure the gateway is healthy:

```bash
restart-ai --check-only --json
```

Expectation: confidence >= 95. If lower, run `restart-ai` first.

## Rebuild/Restart (when needed)

Preferred: `rebuild-fast` (build + restart + update).

```bash
rebuild-fast
```

If you only need a restart (no rebuild), use:

```bash
restart-ai
```

## Send -> Delay -> Fetch (core loop)

### 1) Send from profile "almazom"

Use heredoc to avoid shell expansion and to preserve Markdown safely:

```bash
telega --user almazom --target @Lana_smartai_bot --no-confirm --markdown "$(cat <<'EOF'
Проверь форматирование:

*Конвенции именования Skills*

1. name и description важны
2. use `name` + `description`
3. Пример: `openai-whisper`
EOF
)"
```

Notes:
- Always use `--user almazom` for this bot.
- Use `--markdown` when testing Markdown behavior.
- Use `--no-confirm` to avoid auto-fetch so you control delay + fetch timing.

### 2) Delay

```bash
sleep 4
```

### 3) Fetch recent messages

```bash
telega --user almazom --fetch @Lana_smartai_bot 5
```

The command prints the cache file path. Open it to inspect:

```bash
cat /home/almaz/TOOLBOX/tools/telega/vendor/telega_v2/data/cache/Lana_smartai_bot_YYYYMMDD_HHMMSS.json
```

## Evaluate (reasoning)

Check for:

- Escaped backslashes (e.g., `\\*` or `\\!`) still visible in the text.
- Missing Markdown formatting (bold/inline code not applied).
- Bot replies still showing "raw" escapes or broken list syntax.

Note: The fetch output is plain text, so visual rendering must be verified in the Telegram UI
if you suspect formatting issues.

## Decision Loop (automatic)

Repeat until the outcome is correct:

1. Send message -> delay -> fetch.
2. If formatting is still broken:
   - Run `rebuild-fast`.
   - Repeat send -> delay -> fetch.
3. If formatting is correct, stop and report success.

## Expected Outcome

- Messages are delivered from `almazom` to `@Lana_smartai_bot`.
- Bot replies show no raw backslash escapes.
- MarkdownV2 formatting renders properly in Telegram UI.
