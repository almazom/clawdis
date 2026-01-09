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
    - The `getAiClubReport` function (in `src/commands/ai-club.ts`) executes an external CLI tool.
    - CLI tool (default: `ai_club`) is called with `--today` or `--week` flags.
    - The CLI tool's JSON output is parsed to extract the `summary`, `report_url`, and `channel`.
4. **Summary Processing**:
    - `runAiClubAnalysis` parses the `summary` field from the JSON.
    - It specifically looks for a section titled "Ключевые темы" (Key topics).
    - It extracts bullet points (starting with `*`, `•`, or `-`) under this section.
5. **Telegram Delivery**:
    - Constructs a message containing the period label (Daily/Weekly), the channel name, the extracted key topics, and a link to the full report.
    - Updates the initial status message with this final content.

## Configuration

The behavior can be configured via the main configuration file (loaded in `src/config/config.ts`):
- `aiClub.cliPath`: Path to the `ai_club` executable (defaults to `ai_club`).
- `aiClub.timeoutMs`: Execution timeout for the CLI tool (defaults to 300,000ms / 5 minutes).

## External Dependency: `ai_club` CLI

The core logic for generating the reports resides in an external `ai_club` CLI tool. `clawdis` acts as a wrapper that triggers this tool and formats its output for Telegram. The CLI is expected to return a JSON object with the following structure:
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
