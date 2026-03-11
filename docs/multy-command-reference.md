# Telegram `/multy` Command Reference

**Version:** 1.0  
**Last Updated:** 2026-03-11

---

## Overview

The `/multy` command triggers a **multisampling pipeline** that runs multiple AI models in sequence to analyze a topic and produce a comprehensive article with translations, delivered back to Telegram.

---

## Usage

```bash
/multy <topic>
/muly <topic>              # Alias
/multy@botname <topic>     # With bot mention
```

**Examples:**
```
/multy ai weekly highlights
/muly impact of quantum computing
/multy@clawdis_bot latest AI breakthroughs
```

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Telegram   │────▶│  Clawdis Bot │────▶│  multy CLI      │
│   User      │     │  (bot.ts)    │     │  (external)     │
└─────────────┘     └──────────────┘     └─────────────────┘
       ▲                    │                      │
       │                    │                      ▼
       │            ┌──────────────┐     ┌─────────────────┐
       │            │  Lock File   │     │  JSONL Log      │
       │            │  /tmp/clawdis│     │  {runId}.jsonl  │
       │            └──────────────┘     └─────────────────┘
       │                    │                      │
       │                    ▼                      ▼
       │            ┌──────────────┐     ┌─────────────────┐
       └────────────│  Status Msg  │◀────│  Step Events    │
                    │  (30s interval)    │  (timestamps)   │
                    └──────────────┘     └─────────────────┘
```

---

## Pipeline Steps

| Step | Key | Description |
|------|-----|-------------|
| 1 | `command` | Command received, lock acquired |
| 2 | `multisampling` | Multiple AI models generate responses |
| 3 | `synthesis` | Responses are synthesized into unified analysis |
| 4 | `writing` | Article and raw files are written |
| 5 | `translation` | Content is translated |
| 6 | `publishing` | (Optional) Article is published |
| 7 | `done` | (Optional) Notification sent |

---

## Status Message Format

```
Тема: "ai weekly highlights"
Модели: GLM-4.7, Kimi-K2-Thinking, MiniMax-M2.1
Прошло: 45с
Прогресс: 40% [####------]

Статус:
● Команда получена (5с)
● Мультисэмплинг (12с)
◐ Синтез (33с)
○ Запись файлов
○ Перевод
○ Публикация
○ Готово

Обновление каждые 30с.
[Отменить]
```

**Markers:**
- `●` — Completed
- `◐` — In progress
- `○` — Pending

---

## Lock Mechanism

**Purpose:** Prevent concurrent `/multy` runs in the same chat.

**Lock File:** `/tmp/clawdis/multy-{chatId}.lock`

**Lock Payload:**
```json
{
  "chatId": 123456789,
  "topic": "ai weekly highlights",
  "runId": "multy_1709598393423_hpw2sy",
  "startedAt": 1709598393423,
  "pid": 12345,
  "updatedAt": 1709598403423
}
```

**Behavior:**
- **Stale detection:** Locks older than 60 seconds are auto-cleared
- **Heartbeat:** Lock updated every 10 seconds during execution
- **Conflict response:**
  ```
  ⏸️ Уже выполняется /multy. Дождитесь завершения текущего запуска.
  ```

---

## Cancel Mechanism

**Inline Button Callback:** `multy:cancel:u{ownerId}:{runId}`

**Security:**
- Only the command initiator (owner) can cancel
- Chat ID is validated
- Already-completed runs cannot be canceled

**Cancel Flow:**
1. User clicks "Отменить" button
2. Bot sends `SIGTERM` to multy process
3. After 10 seconds, sends `SIGKILL` if still running
4. Status updated to:
   ```
   ⛔ Отменено пользователем.
   ```

---

## Result Message Format

```
*Тема: AI Weekly Highlights*

Краткое содержание:

This week delivered major enhancements to the Clawdis ecosystem...

Темы:

① Multisampling Pipeline
② Telegram Bot Improvements
③ System Reliability
④ Developer Tooling

○ Key insight 1
○ Key insight 2
○ Key insight 3
○ Key insight 4

Статья: https://example.com/article
[Сырые ответы](https://example.com/raw)
🧾 Run: /path/to/metadata.json
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `IFLOW_MODELS` | `glm,kimi-thinking,minimax` | Comma-separated model list |
| `MULTY_BIN` | `multy` | Path to multy CLI binary |
| `ASK_CLI_AGENTS_ROOT` | `/home/almaz/TOOLS/ask_cli_agents` | Agents root directory |

### Config File (`~/.clawdis/clawdis.json`)

```json
{
  "telegram": {
    "multyPublish": true,    // Enable publish step (default: true)
    "multyNotify": false     // Enable notify step (default: false)
  }
}
```

---

## CLI Invocation

The bot spawns the multy CLI with:

```bash
multy \
  --theme silent \
  --json-log {runId}.jsonl \
  --workspace {cwd} \
  {topic}
```

**JSONL Log Format:**
```json
{"step": "start", "timestamp": 1709598393.423}
{"step": "multisample_done", "timestamp": 1709598405.123}
{"step": "synthesis_done", "timestamp": 1709598438.456}
{"step": "article_written", "timestamp": 1709598445.789}
{"step": "raw_written", "timestamp": 1709598445.790}
{"step": "translation_done", "timestamp": 1709598460.123}
{"step": "publish_done", "timestamp": 1709598480.456}
{"step": "notify_done", "timestamp": 1709598485.789}
```

---

## Error Handling

| Error | Response |
|-------|----------|
| CLI not found | "multy CLI not found in PATH. Install it or set MULTY_BIN/PATH." |
| Auth error | Detected from JSONL, shows auth error message |
| Lock conflict | "⏸️ Уже выполняется /multy..." |
| Process crash | Error extracted from stderr, lock cleared |

---

## Testing

### Manual Test

```bash
# Ensure gateway is healthy
restart-ai --check-only

# Send command via Telegram
pnpm clawdis agent \
  --message "/multy test topic" \
  --provider telegram \
  --to <TELEGRAM_ID> \
  --deliver
```

### E2E Test Loop

```bash
TELEGA_E2E_SEQUENCE=multy \
TELEGA_E2E_MAX_CYCLES=1 \
bash scripts/telega-e2e-loop.sh
```

**Expected duration:** ~600 seconds (10 minutes)

---

## Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/multy/command.ts` | 15 | Command parsing & validation |
| `src/multy/status.ts` | 293 | Progress tracking & status messages |
| `src/multy/result.ts` | 199 | Result aggregation & formatting |
| `src/multy/cancel.ts` | 45 | Cancel button & callback handling |
| `src/telegram/bot.ts` | 540+ | Main integration (lines 1516-2055) |

**Tests:**
- `src/multy/command.test.ts`
- `src/multy/status.test.ts`
- `src/multy/result.test.ts`
- `src/multy/cancel.test.ts`
- `src/telegram/bot.multy.test.ts`
- `src/telegram/bot.multy.lock.e2e.test.ts`

---

## Related Documentation

- [Telegram Slash Commands](telegram-slash-commands.md)
- [Telegram Bot Configuration](telegram.md)
- [Configuration Guide](configuration.md)

---

## Troubleshooting

### Lock Stuck

```bash
# Clear manually
rm /tmp/clawdis/multy-<chatId>.lock
```

### Check Logs

```bash
# Bot logs
tail -f /tmp/clawdis/clawdis-$(date +%Y-%m-%d).log

# Multy JSONL log
cat tmp/multy_*_{runId}.jsonl | jq .
```

### Verify multy CLI

```bash
which multy
multy --help
```
