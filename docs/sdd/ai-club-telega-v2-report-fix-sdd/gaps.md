# AI Club Telega v2 Report Fix - Open Gaps & Questions

> Status: ALL GAPS FILLED | Last updated: 2026-01-06

## Summary

Total gaps: 6
Filled: 6
Remaining: 0

## Interview Results

### GAP-001: Slash command set

**Question:** Should the daily command switch to `/ai_day` and drop `/ai_day`, or keep legacy aliases?

**Decision:** Support `/ai_day` and keep `/ai_day` + `/ai_dayy` as legacy aliases.

**Source:** up2u all

**Confidence:** 90% (Kimi: 0%, Claude: 0%)

**Short Reason:** Avoids breaking existing users while honoring the new command name.

**AI Recommendations:**
- Kimi: "N/A" (0%)
- Claude: "N/A" (0%)

**User Approval:** Yes (2026-01-06 12:00)

**Implementation Notes:** Update `parseAiClubCommand` regex and adjust tests/docs.

---

### GAP-002: telega_v2 profile + channel config

**Question:** How are telega_v2 profile and AI Club channel configured?

**Decision:** Add `aiClub.telegaV2Profile` and `aiClub.channel` with env overrides `TELEGA_V2_PROFILE` and `AI_CLUB_CHANNEL`.

**Source:** up2u all

**Confidence:** 88% (Kimi: 0%, Claude: 0%)

**Short Reason:** telega_v2 requires a profile; channel needs to be configurable.

**AI Recommendations:**
- Kimi: "N/A" (0%)
- Claude: "N/A" (0%)

**User Approval:** Yes (2026-01-06 12:00)

**Implementation Notes:** Extend `AiClubConfig` schema and env overrides in `src/config/config.ts`.

---

### GAP-003: Fetch time range semantics

**Question:** What exact time range should `today` and `week` cover?

**Decision:** `today` = local day 00:00 → now; `week` = last 7 full days → now (local timezone).

**Source:** up2u all

**Confidence:** 85% (Kimi: 0%, Claude: 0%)

**Short Reason:** Matches common expectations and avoids timezone ambiguity.

**AI Recommendations:**
- Kimi: "N/A" (0%)
- Claude: "N/A" (0%)

**User Approval:** Yes (2026-01-06 12:00)

**Implementation Notes:** Compute time range in `getAiClubReport` and log boundaries.

---

### GAP-004: Segregation/report generation interface

**Question:** How does the segregation step receive messages and produce a report URL?

**Decision:** Use `aiClub.cliPath` to run the segregation/report generator on the telega_v2 cache file and expect JSON with `summary` + optional `report_url`.

**Source:** up2u all

**Confidence:** 82% (Kimi: 0%, Claude: 0%)

**Short Reason:** Keeps existing external CLI contract while shifting message fetch to telega_v2.

**AI Recommendations:**
- Kimi: "N/A" (0%)
- Claude: "N/A" (0%)

**User Approval:** Yes (2026-01-06 12:00)

**Implementation Notes:** If `report_url` missing, publish via `publish_me` and use that URL.

---

### GAP-005: Failure messaging

**Question:** What user-visible error should be shown on failure?

**Decision:** Keep the existing error message: `✂︎ Не удалось получить отчёт от AI Club. Проверьте логи.`

**Source:** up2u all

**Confidence:** 92% (Kimi: 0%, Claude: 0%)

**Short Reason:** Matches current UX and avoids regression.

**AI Recommendations:**
- Kimi: "N/A" (0%)
- Claude: "N/A" (0%)

**User Approval:** Yes (2026-01-06 12:00)

**Implementation Notes:** Use the same editMessage flow on any error path.

---

### GAP-006: Logging detail

**Question:** What logging level and details are required for diagnosis?

**Decision:** Use existing `pipelineLog` for step timing + `logVerbose` for stdout/stderr and JSON parsing errors.

**Source:** up2u all

**Confidence:** 87% (Kimi: 0%, Claude: 0%)

**Short Reason:** Aligns with existing AI Club logging patterns.

**AI Recommendations:**
- Kimi: "N/A" (0%)
- Claude: "N/A" (0%)

**User Approval:** Yes (2026-01-06 12:00)

**Implementation Notes:** Log command, cache file path, and report URL.

---

## Decisions Based on Project Analysis

Analyzed existing patterns from:
- `src/telegram/bot.ts`
- `src/commands/ai-club.ts`
- `src/config/config.ts`
- `docs/telegram-ai-club.md`

Key pattern alignments:
1. **Pipeline logging:** reuse `pipelineLog` for step timing and `logVerbose` for CLI details.
2. **Telegram formatting:** use MarkdownV2 formatting via existing helpers.

## Auto-Filled Assumptions

- AS-001: Keep legacy `/ai_day` and `/ai_dayy` command aliases (confidence: 90%) - Rationale: prevent breaking existing users.
- AS-002: Default channel is `@aiclubsweggs` (confidence: 85%) - Rationale: current hardcoded fallback.
- AS-003: Use local timezone for time range calculation (confidence: 85%) - Rationale: consistent with other pipelines.
- AS-004: `publish_me` returns a telegra.ph link usable in Telegram MarkdownV2 (confidence: 80%) - Rationale: existing publish flow uses the same tool.
