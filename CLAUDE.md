[[appended]]

---

## Restart AI Tool (restart-ai)

**Tool:** `/home/almaz/.local/bin/restart-ai`

### Usage

```bash
# Check health only
restart-ai --check-only

# Full update + restart
restart-ai

# Verbose output
restart-ai --verbose

# JSON output for AI parsing
restart-ai --check-only --json

# Dry-run (show what would happen)
restart-ai --dry-run

# Force restart even if healthy
restart-ai --force
```

### Confidence Scoring (0-100%)

| Check | Points | Description |
|-------|--------|-------------|
| Process | 25 | `pgrep -f "clawdis"` finds running process |
| Port | 25 | Port 18789 is listening |
| Health | 30 | `health-check.sh` reports healthy |
| Git | 10 | Git working tree has changes |
| Build | 10 | `dist/index.js` exists |

**Confidence Levels:**
- 95-100%: ✅ READY
- 80-94%: ⚠️ OK
- Below 80%: ❌ NEEDS ATTENTION

### Before Telegram Operations

Always run before sending to Telegram:

```bash
restart-ai --check-only
```

If confidence < 95%, run full restart:

```bash
restart-ai
```

### Files

| File | Purpose |
|------|---------|
| `/home/almaz/.local/bin/restart-ai` | Main tool |
| `/home/almaz/zoo_flow/clawdis/scripts/health-check.sh` | Health check script |
| `/home/almaz/zoo_flow/clawdis/scripts/restart-cli.sh` | Gateway restart script |

---

## Web Search Integration (SSOT)

**Single Source of Truth:** `skills/web-search-with-gemini/`

### Usage

```bash
# Direct script usage
./scripts/web_search_with_gemini.sh "your query"

# With model selection
./scripts/web_search_with_gemini.sh --model gemini-3-flash-preview "query"

# Simple gemini CLI (underlying tool)
NODE_NO_WARNINGS=1 gemini "your query" -m gemini-3-flash-preview
```

### When to Use Web Search

**DO use when:**
- Current information needed (weather, news, prices)
- User explicitly requests: "погугли", "search", "google"
- Time-sensitive data (exchange rates, events)

**DON'T use when:**
- Historical facts (already in training data)
- Simple calculations
- Creative tasks

### Architecture

```
User Query
  |
  v
Pi Agent (src/agents/pi-tools.ts)
  |
  v
executeWebSearch() [src/web-search/executor.ts]
  |
  v
scripts/web_search_with_gemini.sh [SSOT]
  |
  v
gemini CLI -> Google Gemini API
```

### Files

| File | Purpose |
|------|---------|
| `skills/web-search-with-gemini/SKILL.md` | Skill metadata |
| `scripts/web_search_with_gemini.sh` | Main script |
| `src/web-search/executor.ts` | TypeScript integration |
| `src/web-search/messages.ts` | Russian messages |
| `prompts/web-search-tail.yaml` | Prompt instructions |
