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
