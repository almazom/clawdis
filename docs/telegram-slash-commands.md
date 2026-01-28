# Telegram Slash Commands

This document lists the Telegram bot slash commands handled in the codebase
and how to test them one by one with long delays.

## Preconditions

- Gateway running and healthy.
- `telegram.allowFrom` includes your Telegram user ID.
- `restart-ai --check-only` returns confidence >= 95.

## Commands (as implemented)

- `/ping`  
  Health check. Expected: "Pong".

- `/ai_day`  
  AI Club daily report.

- `/ai_week`  
  AI Club weekly report.

- `/ai_report`  
  AI report (today).

- `/web <query>`  
  Web search. Example: `/web ai news today`.

- `/multy <topic>`  
  Multisampling pipeline. Alias: `/muly`.  
  Expected: status message + inline "Cancel" button.  
  Requires `multy` CLI in PATH.

- `/deep <topic>`  
  Deep research. Returns an inline button to execute.  
  You must click the button (`"Sdelat depreserch"`).

- `/v [text]`  
  Voice/TTS reply. If no text, uses last assistant message.  
  If text starts with a URL, fetches a summary and voices that instead.  
  Requires `MINIMAX_API_KEY`.

## Not Implemented

- `/ai_news` is not implemented in code.

## Manual Test Order (long delays)

1) `/ping`
2) `/ai_day`
3) `/ai_week`
4) `/ai_report`
5) `/web ai news today`
6) `/multy ai weekly highlights`
7) `/deep impact of AI on software engineering productivity`
8) Click the deep research button.
9) `/v test voice output`
10) Send an audio file and check transcription/reply.

Recommended waits (default long delays used by the loop script):
- `/ai_day`: 180s
- `/ai_week`: 240s
- `/ai_report`: 180s
- `/web`: 180s
- `/multy`: 600s
- `/deep`: 1800s
- `/v`: 120s
- audio: 180s

## One-By-One Test Loop

Run a single linear pass with long delays:

```bash
restart-ai --check-only
TELEGA_E2E_MAX_CYCLES=1 \
TELEGA_E2E_SEQUENCE=ping,ai_day,ai_week,ai_report,web,multy,deep,voice,audio \
bash scripts/telega-e2e-loop.sh
```

Optional deep research auto-click:

```bash
TELEGA_E2E_DEEP_CLICK=1 \
bash scripts/telega-e2e-loop.sh
```

Logs:
- `~/.clawdis/telega-e2e-loop.log`
- `/tmp/clawdis/clawdis-YYYY-MM-DD.log`
