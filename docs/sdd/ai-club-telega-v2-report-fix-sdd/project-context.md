# Project Context Notes

## Current Behavior (AI Club)

- Telegram commands `/ai_day` and `/ai_week` are parsed in `src/telegram/bot.ts` via `parseAiClubCommand` and handled by `runAiClubAnalysis`.
- `runAiClubAnalysis` calls `getAiClubReport` (in `src/commands/ai-club.ts`), then extracts "Ключевые темы" from the report summary and edits the Telegram status message with the final result.
- When `getAiClubReport` returns `null`, the user sees: `✂︎ Не удалось получить отчёт от AI Club. Проверьте логи.`

## Current Integration Points

- `src/commands/ai-club.ts` calls an external CLI (`ai_club` by default) with `--today` or `--week`, then parses JSON output: `status`, `summary`, `report_url`, `channel`.
- AI Club config exists in `src/config/config.ts` with `aiClub.cliPath`, `aiClub.telegaV2Path`, and `aiClub.timeoutMs`, plus env overrides (`AI_CLUB_CLI_PATH`, `TELEGA_V2_PATH`, `AI_CLUB_TIMEOUT_MS`).
- `docs/telegram-ai-club.md` documents the current `/ai_day` and `/ai_week` flow and expected CLI JSON.

## Related Tests

- `src/telegram/bot.ai-club.test.ts` covers `/ai_day` and `/ai_week` behavior and error handling.
- `src/commands/ai-club.repro.test.ts` currently expects `telega_v2` to be invoked with `fetch-range` (designed to fail today).

## telega_v2 Tooling

- `docs/e2e-telega-v2/TELEGA-V2-USAGE.md` describes `telega_v2` commands (`send`, `fetch`, `read`) and session profiles.

## Observed Constraints

- AI Club reports are delivered via Telegram and formatted with MarkdownV2.
- The AI Club pipeline is a wrapper around external CLI tools; failures must be logged and surfaced with the standard error message.
