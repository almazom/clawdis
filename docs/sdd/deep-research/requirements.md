# Deep Research - Functional Requirements

> Status: IN PROGRESS | Last updated: 2026-01-02

## 1. Keyword Detection

### 1.1 Trigger Recognition
- System MUST detect deep research intent from user input
- Supported input modalities: voice, text (any modality)
- Detection based on hardcoded keyword combinations

### 1.2 Keyword Variations
System MUST recognize these patterns (примеры):
- `сделать депресерч` / `сделай депресерч`
- `do deep research` / `run deep research`
- `сделай дип рисерч`
- Mixed: `сделать deep research`
- Typo: `сделай дипресерч`

> **GAP-001**: Need complete list of 10-15 keyword combinations - see `keyword-detection.md`

### 1.3 Detection Scope
- [x] **CONFIRMED**: Detection runs on EVERY message from allowed users
- [x] **CONFIRMED**: Case-insensitive matching (consistent with Telegram bot mention handling)
- [x] **CONFIRMED**: Exact substring match (pattern anywhere in message, like `routing.allowFrom` patterns)

---

## 2. Detection Acknowledgment

### 2.1 System Response
When deep research intent detected:
- System MUST send Telegram message: confirmation of detection
- Message purpose: visible acknowledgment that pipeline activated
- [x] **CONFIRMED**: Message text: "🔍 Вижу запрос на deep research...\nТема: {extracted_topic}"

### 2.2 Channel
- [x] **CONFIRMED**: Telegram only (v1)
- Follows existing pattern: each integration (`web`, `telegram`, `discord`) configured separately
- Future: can extend to other providers following `telegram.allowFrom` pattern

---

## 3. Prompt Formulation & Gap Analysis

### 3.1 Required Fields
- [x] **CONFIRMED**: Only TOPIC extraction required
- Other fields (scope, language, format) use sensible defaults

### 3.2 Auto-fill Strategy
- System extracts topic from user's original message
- No mandatory Q&A if topic is clear
- Optional: ask for clarification only if topic is ambiguous
- [x] **CONFIRMED**: Max 1 round of Q&A, then proceed with extracted topic (no blocking)
- [x] **CONFIRMED**: For voice transcripts, run LLM normalization to strip fillers/trigger phrases and optionally suggest short gap questions

---

## 4. Confirmation & Execution

### 4.1 Completion Message
When topic extracted:
- System message: "All requirements filled" (all gaps is filled)
- Display the final prompt/instruction that will be used

### 4.2 Inline Button
- Button text: "Сделать депресерч" / "Do deep research"
- Button appears below the confirmation message
- Clicking triggers deep research execution

### 4.3 Execution Backend (CONFIRMED)
**CLI Wrapper**: `$HOME/TOOLS/gemini_deep_research/gdr.sh`

**Command**:
```bash
./gdr.sh --mode stream --prompt "{extracted_topic}" --publish
```

**Available Options**:
- `--mode stream` - streaming mode (recommended)
- `--prompt "..."` - the research query
- `--publish` - publish report.md to web, store URL in result.json
- `--output-language ru|en|auto` - force output language
- `--thinking-summaries` - enable thought summaries during streaming

**Output Structure** (runs/<run_id>/):
```
├── report.txt, md/report.md     # Full report
├── summary.txt, md/summary.md   # Short summary
├── md/agent_summary.json        # Structured summary with bullets
├── events.jsonl, thoughts.jsonl # Logs
├── state.json, result.json      # State & public URL (if --publish)
```

- [x] **CONFIRMED**: No button expiration (Telegram inline buttons persist)

### 4.4 Result Delivery to User (CONFIRMED)

When deep research completes, send Telegram message with:

1. **summary_bullets** - bullet list from `agent_summary.json`
2. **short_answer_summary_2_initial_request** - concise answer to original query
3. **opinion** - AI's assessment/opinion
4. **publish.url** - link to full report on web

**Sample Telegram Message Format**:
```
✅ Deep Research завершен

📝 Краткий ответ:
{short_answer_summary_2_initial_request}

📋 Основные пункты:
• {summary_bullets[0]}
• {summary_bullets[1]}
• ...

💭 Мнение:
{opinion}

🔗 Полный отчет: {publish.url}
```

**JSON Fields to Extract** (from result.json):
```
agent_summary.summary_bullets[]
agent_summary.short_answer_summary_2_initial_request
agent_summary.opinion
publish.url
```

### 4.5 Dry-Run Mode (Debug)
- `.env` flag: `DEEP_RESEARCH_DRY_RUN=true|false`
- When enabled: uses fixture data, skips API calls (no billing)

**Dry-run command** (when `DEEP_RESEARCH_DRY_RUN=true`):
```bash
./gdr.sh --dry-run --dry-run-fixture examples/sample_run --prompt "{topic}" --publish
```

**Production command** (when `DEEP_RESEARCH_DRY_RUN=false`):
```bash
./gdr.sh --mode stream --prompt "{topic}" --publish
```

---

## 5. Non-Functional Requirements

### 5.1 Performance
- [x] **CONFIRMED**: Detection SLA <100ms (simple substring match, no ML)

### 5.2 Logging
- [x] **CONFIRMED**: Follow existing logging pattern (`src/config/config.ts` logging section)
- Log level: `info` for detection events, `debug` for keyword matching details
- Log to same file as gateway: `~/.clawdis/logs/`

### 5.3 Error Handling (following `sendMessageTelegram` patterns)
- [x] **CONFIRMED**: Retry with exponential backoff (like Telegram 429 handling)
- On failure: send error message + "🔄 Повторить" inline button
- Error message includes run_id for debugging
- Example: "❌ Deep research failed: {error}\n\n[🔄 Повторить]"

### 5.4 Long-Running Execution (10-15 min)
- [x] **CONFIRMED**: Start + End notifications only (no periodic updates)
- Start: "🔍 Deep research запущен...\nОжидаемое время: 10-15 минут"
- On completion: full result delivery (summary + link)

---

## 6. Configuration

Following existing `clawdis.json` patterns (see `src/config/config.ts`):

### 6.1 Config File Section (`~/.clawdis/clawdis.json`)
```json5
{
  deepResearch: {
    enabled: true,           // Enable/disable feature
    dryRun: false,           // Use fixtures instead of API
    cliPath: "$HOME/TOOLS/gemini_deep_research/gdr.sh",
    outputLanguage: "auto",  // "ru", "en", or "auto"
    keywords: [              // Override default keyword list
      "депресерч", "deep research", "сделай депресерч"
    ]
  }
}
```

### 6.2 Environment Variable Overrides
Following pattern: env vars override config file values.

| Env Variable | Config Path | Default |
|--------------|-------------|---------|
| `DEEP_RESEARCH_ENABLED` | `deepResearch.enabled` | `true` |
| `DEEP_RESEARCH_DRY_RUN` | `deepResearch.dryRun` | `true` (**during dev**) |
| `DEEP_RESEARCH_CLI_PATH` | `deepResearch.cliPath` | `$HOME/TOOLS/gemini_deep_research/gdr.sh` |
| `DEEP_RESEARCH_OUTPUT_LANGUAGE` | `deepResearch.outputLanguage` | `auto` |

### 6.3 Development Mode
**IMPORTANT**: During implementation phase, `dryRun: true` is the default to avoid API costs.

Set `DEEP_RESEARCH_DRY_RUN=false` or `deepResearch.dryRun: false` for production.

---

## References

- Related to: Gemini Deep Research API integration
- CLI: `$HOME/TOOLS/gemini_deep_research/gdr.sh`
- Branch: `deep-reseatch-gemini-with-publish`
