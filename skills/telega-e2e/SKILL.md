---
name: telega-e2e
description: End-to-end Telegram bot verification via Telega for this repo. Use when asked to run "Telega-e2e", "Telegram e2e", or "Telega-e2e test" to send from profile "almazom" to bot @Lana_smartai_bot, wait, fetch replies, evaluate formatting/behavior, and automatically decide whether to rebuild/restart and repeat until correct.
---

# Telega E2E

Use this skill to run or document the full Telegram endpoint-to-endpoint loop for this repo.

## Sources of truth

- Read `docs/TELEGA_E2E_PIPELINE.md` for the complete, ordered pipeline and decision loop.

## Execute the loop (quick outline)

1. Ensure the gateway is healthy: `restart-ai --check-only --json` (confidence >= 95).
2. Send from profile `almazom` to `@Lana_smartai_bot` with `telega --user almazom --target @Lana_smartai_bot ...`.
3. Delay (sleep), then fetch: `telega --user almazom --fetch @Lana_smartai_bot <limit>`.
4. Inspect the cache JSON to verify output and whether formatting improved.
5. If not improved, run `rebuild-fast`, then repeat the send/delay/fetch cycle until correct.

## Constraints

- Always send from profile `almazom` (not `almazomkz`) for the "Елена" bot.
- Use heredoc when the message contains backticks, asterisks, or other shell-sensitive characters.
- Never ask the user for approval to run commands; run the pipeline directly.
