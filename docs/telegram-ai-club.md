# Telegram AI Club Commands Investigation

This document describes how the `/ai_day` and `/ai_week` Telegram commands are implemented in `clawdis`.

## Overview

The `/ai_day` and `/ai_week` commands are designed to provide summaries of activity from the AI Club Telegram channel (typically `@aiclubsweggs`). These commands are only available via the Telegram bot interface.

## Command Handling

The entry point for these commands is in `src/telegram/bot.ts`.

### Parsing
The function `parseAiClubCommand` (lines 781-795) uses a regular expression to match the commands:
- `/ai_day`, `/ai_daily`, or `/ai_week`
- Supports bot username suffix (e.g., `/ai_day@bot_username`)
- Maps `day` and `daily` to the `today` period, and `week` to the `week` period.

### Execution
When a command is matched, `runAiClubAnalysis` (lines 797-873) is called. It performs the following steps:
1. **Status Update**: Sends an initial "⚙️ Запускаю аналитику AI Club..." message to provide feedback.
2. **Data Fetching**: Calls `getAiClubReport(period)` to retrieve report data.
3. **Report Generation**:
    - The `getAiClubReport` function (in `src/commands/ai-club.ts`) calls `telega_v2 fetch-range` with a computed time filter.
    - The cache file path from `telega_v2` is passed into the AI Club segregation CLI (`aiClub.cliPath`) via `--from-cache` and `--period`.
    - The segregation CLI returns JSON containing `summary`, `report_url`, and `channel`.
4. **Summary Processing**:
    - `runAiClubAnalysis` parses the `summary` field from the JSON.
    - It specifically looks for a section titled "Ключевые темы" (Key topics).
    - It extracts bullet points (starting with `*`, `•`, or `-`) under this section.
5. **Telegram Delivery**:
    - Constructs a message containing the period label (Daily/Weekly), the channel name, the extracted key topics, and a link to the full report.
    - If `report_url` is missing, publishes the summary via `publish_me` and uses the resulting telegra.ph link.
    - Updates the initial status message with this final content.

## Configuration

The behavior can be configured via the main configuration file (loaded in `src/config/config.ts`):
- `aiClub.cliPath`: Path to the `ai_club` executable (defaults to `ai_club`).
- `aiClub.telegaV2Path`: Path to the `telega_v2` executable (defaults to `telega_v2`).
- `aiClub.telegaV2Profile`: telega_v2 session profile (defaults to `default`).
- `aiClub.channel`: AI Club Telegram channel handle (defaults to `@aiclubsweggs`).
- `aiClub.timeoutMs`: Execution timeout for the pipeline (defaults to 300,000ms / 5 minutes).

## External Dependency: `ai_club` CLI

The core logic for generating the reports resides in an external `ai_club` segregation CLI tool. `clawdis` triggers `telega_v2 fetch-range` first, then runs the segregation CLI against the cached messages. The CLI is expected to return a JSON object with the following structure:
```json
{
  "status": "success",
  "period": "today|week",
  "channel": "@channel_name",
  "report_url": "https://...",
  "summary": "Full markdown summary content..."
}
```

## Related Files
- `src/telegram/bot.ts`: Command parsing and Telegram interaction logic.
- `src/commands/ai-club.ts`: Logic for executing the `ai_club` CLI and parsing its JSON output.
- `src/telegram/bot.ai-club.test.ts`: Tests for these commands.
