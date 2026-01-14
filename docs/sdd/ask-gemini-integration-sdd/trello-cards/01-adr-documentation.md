# Card 01: ADR Documentation

| Field | Value |
|-------|-------|
| **ID** | AGI-01 |
| **Story Points** | 2 |
| **Depends On** | - |
| **Sprint** | Phase 1 |

## User Story

> As an architect, I want to document the integration approach so that future developers understand decisions.

## Context

Read before starting:
- [requirements.md](../requirements.md) - Feature requirements
- [ui-flow.md](../ui-flow.md) - UI context
- Plan file: `/home/almaz/.claude/plans/agile-launching-mango.md`

## Instructions

### Step 1: Create ADR File

```bash
# Create ADR file
cat > /home/almaz/zoo_flow/clawdis/docs/ADR/041-ask-gemini-integration.md << 'EOF'
# ADR-041: Ask Gemini CLI Integration

## Context

Need to integrate Ask Gemini CLI tool into Clawdis system for AI agent usage.

## Decision

We decided to use a HYBRID approach:
1. **SKILL.md files** for tool discovery by Pi agent
2. **Code in pi-tools.ts** for full parameter control

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| SKILL.md only | Fast | Limited parameter control |
| Code only | Full control | More code to write |
| **Hybrid (chosen)** | Best of both | Requires both implementations |

### Why Hybrid?

- SKILL.md provides discovery and documentation
- Code provides strict schema for AI agent tool selection
- Allows graceful fallback if CLI unavailable

## Consequences

- Positive: Clear separation of concerns
- Positive: AI agent can discover and use tools
- Negative: Two places to maintain
- Negative: More initial work

## Implementation

See SDD package: `docs/sdd/ask-gemini-integration-sdd/`
EOF
```

### Step 2: Verify File Created

```bash
# Verify ADR file exists
ls -la /home/almaz/zoo_flow/clawdis/docs/ADR/041-ask-gemini-integration.md
```

## Acceptance Criteria

- [ ] ADR file created at `docs/ADR/041-ask-gemini-integration.md`
- [ ] ADR includes context, decision, alternatives, and consequences
- [ ] ADR references SDD package location
- [ ] File is valid markdown

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 01 to "completed"
3. Read next card: [02-ask-gemini-basic-tool](./02-ask-gemini-basic-tool.md)
4. Continue execution
