# Gaps & Decisions: Multi-Agent Web Search

**Feature:** Multi-Agent Parallel Web Search for Telegram Bot
**Date:** 2026-01-06

---

## Decisions Made

### D1: First Success Pattern ✓
**Question:** How to handle multiple agents responding?
**Decision:** Use "first success wins" pattern
- First successful response published immediately
- Continue waiting for remaining agents in background
- Aggregate all results for HTML report

### D2: Agent Timeout ✓
**Question:** How long to wait per agent?
**Decision:** 180 seconds (3 minutes) per agent
- Matches existing `WEB_SEARCH_TIMEOUT_MS` configuration
- Individual agent timeouts prevent blocking

### D3: Error Handling ✓
**Question:** What if 1-2 agents fail?
**Decision:** Graceful degradation
- Continue with successful agents
- Log failures with context
- HTML report shows failed agents with error details

### D4: Logging Format ✓
**Question:** What logging format to use?
**Decision:** Structured prefix format
```
[WEB] <emoji> <message>
```
- Consistent with existing `[web-search]` pattern
- Easy to grep and filter

### D5: HTML Report Sending ✓
**Question:** How to send HTML to user?
**Decision:** Use `publish_me` tool
- `/publish_me html_report=<HTML content>`
- Already exists in system

---

## Open Questions (Requiring User Input)

### G1: Response Length Limit
**Question:** Should we truncate responses before publishing first success?
- Current: 500 characters in `formatTelegramWithAgent`
- Options: 500 chars, 1000 chars, full response, user-configurable

**Current Decision:** 500 characters with "..." truncation
*Pending confirmation*

### G2: Agent Quality Ordering
**Question:** If first success is slow (30s) but quality agent (Kimi) would respond with better quality in 40s - should we wait?
- Option A: Always first success (speed priority)
- Option B: Wait up to X seconds for quality agent
- Option C: User configurable

**Current Decision:** Option A - First success always wins
*Pending confirmation*

### G3: Retry Failed Agents
**Question:** Should we retry failed agents once?
- Option A: No retries (fail fast)
- Option B: Retry once after delay
- Option C: Retry with different agent

**Current Decision:** Option A - No retries in MVP
*Pending confirmation*

---

## Confirmed Requirements

From user conversation (2026-01-06):

1. ✓ Spawn 5 agents in parallel
2. ✓ First success publishes immediately
3. ✓ Continue waiting for remaining agents
4. ✓ Generate HTML report (Russian)
5. ✓ Send via publish_me
6. ✓ Good logging
7. ✓ Good error handling
8. ✓ All models from .env (no hardcoded)
9. ✓ API keys from .env

---

## Technical Decisions

### T1: Agent Launch Method
**Decision:** Use `execAsync` from `node:child_process`
- Direct CLI execution (not Task subagents)
- Better timeout control
- Simpler error handling

### T2: Status Updates
**Decision:** Use `onStatus` callback pattern
- Pass status callback to `executeMultiAgentWebSearch`
- Callback receives status messages for logging

### T3: Result Aggregation
**Decision:** All results in `MultiAgentResult`
```typescript
interface MultiAgentResult {
  query: string;
  winner?: AgentResult;
  agents: AgentResult[];
  htmlReport: string;
  // ...
}
```

---

## Assumptions Made

1. HTML report generation is sync (fast enough)
2. publish_me tool accepts HTML content
3. Telegram can render basic HTML
4. User has all 5 API keys configured
5. Network latency acceptable for parallel execution

---

## Out of Scope (MVP)

1. Agent quality scoring algorithm
2. Smart routing based on query type
3. Caching of results
4. User preferences for agent selection
5. A/B testing of agents
