# AI Club Telega v2 Report Fix - Functional Requirements

> Status: ✅ COMPLETE | Last updated: 2026-01-06

## 1. Command Detection & Routing

### 1.1 Slash Commands

- **R1**: System MUST recognize `/ai_day` and `/ai_week` (case-insensitive, optional `@botname` suffix).
- **R2**: System SHOULD continue to recognize legacy `/ai_day` and `/ai_dayy` to avoid breaking existing users.
- **R3**: `/ai_day`/`/ai_day`/`/ai_dayy` MUST map to period `today`; `/ai_week` MUST map to period `week`.

## 2. telega_v2 Fetch + Segregation Pipeline

### 2.1 Fetch AI Club Messages

- **R4**: System MUST use `aiClub.telegaV2Path` to call `telega_v2 fetch-range` for the AI Club channel and requested period.
- **R5**: Fetch range MUST include *all* messages for the period:
  - `today`: from local 00:00 to now.
  - `week`: last 7 full days to now.
- **R6**: System MUST log the exact telega_v2 command, time range, and elapsed time.
- **R7**: If fetch fails (non-zero exit, missing cache file, unreadable JSON), system MUST surface the standard error message (see R13).

### 2.2 Segregation + Report Generation

- **R8**: System MUST pass the fetched messages into the AI Club segregation/report generator (`aiClub.cliPath`).
- **R9**: The report generator MUST return JSON with at least: `status`, `summary`, `report_url` (optional), and `channel`.
- **R10**: If `report_url` is missing, system MUST publish the report summary via `publish_me` and use the returned telegra.ph link.

## 3. Telegram Delivery

- **R11**: On command detection, system MUST send a status message: `⚙️ Запускаю аналитику AI Club...` (or update existing status).
- **R12**: Final message MUST include:
  - Period label (`Ежедневный`/`Еженедельный`)
  - Channel label (from report or `aiClub.channel`)
  - Key topics list (if available)
  - Full report link (telegra.ph)
- **R13**: On any failure, system MUST edit the status message to: `✂︎ Не удалось получить отчёт от AI Club. Проверьте логи.`

## 4. Error Handling & Logging

- **R14**: All pipeline steps MUST log with the existing `pipelineLog` format and include elapsed times.
- **R15**: If publishing fails but a summary exists, system SHOULD send the summary and add a note that the full report link is unavailable.

## 5. Non-Functional Requirements

- **R16**: Total pipeline time MUST respect `aiClub.timeoutMs` (default 300000ms).
- **R17**: Output MUST be formatted for Telegram MarkdownV2 (escape where needed).
- **R18**: No new persistent storage; use temp files and clean up after publishing.

## 6. Configuration

### 6.1 Config File Section

```json5
{
  aiClub: {
    cliPath: "ai_club",
    telegaV2Path: "telega_v2",
    telegaV2Profile: "default",
    channel: "@aiclubsweggs",
    timeoutMs: 300000,
  }
}
```

### 6.2 Environment Variables

| Env Variable | Config Path | Default |
|--------------|-------------|---------|
| `AI_CLUB_CLI_PATH` | `aiClub.cliPath` | `ai_club` |
| `TELEGA_V2_PATH` | `aiClub.telegaV2Path` | `telega_v2` |
| `TELEGA_V2_PROFILE` | `aiClub.telegaV2Profile` | `default` |
| `AI_CLUB_CHANNEL` | `aiClub.channel` | `@aiclubsweggs` |
| `AI_CLUB_TIMEOUT_MS` | `aiClub.timeoutMs` | `300000` |

---

## References

- `src/telegram/bot.ts`
- `src/commands/ai-club.ts`
- `src/config/config.ts`
- `docs/telegram-ai-club.md`
