# Card 03: Ask Gemini Web Tool

| Field | Value |
|-------|-------|
| **ID** | AGI-03 |
| **Story Points** | 2 |
| **Depends On** | 02 |
| **Sprint** | Phase 2 |

## User Story

> As an AI agent, I want to perform web searches using Gemini for current information.

## Context

Read before starting:
- [requirements.md](../requirements.md) - Section 5.2
- Web search integration in Ask Gemini CLI
- Existing `web_search` tool pattern in pi-tools.ts

## Instructions

### Step 1: Read Web Search Pattern

```bash
# Look at existing web_search tool for pattern
grep -A 50 "createWebSearchTool" /home/almaz/zoo_flow/clawdis/src/agents/pi-tools.ts | head -60
```

### Step 2: Create Web Tool Function

```bash
# Edit pi-tools.ts
```

```typescript
function createAskGeminiWebTool(): AnyAgentTool {
  return {
    name: "ask_gemini_web",
    description: "Perform web search using Gemini with automatic web fetch capabilities",
    parameters: Type.Object({
      query: Type.String({
        description: "Search query for current/recent information",
      }),
      mindset: Type.Optional(Type.String({
        description: "Persona/mindset for analysis",
      })),
      enableWeb: Type.Optional(Type.Boolean({
        description: "Enable web search (default: true)",
        default: true,
      })),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { query, mindset, enableWeb } = args as {
        query: string;
        mindset?: string;
        enableWeb?: boolean;
      };

      // Build command with web flags
      const cmd = ["ask", "gemini", "-c", query, "--web"];
      if (mindset) cmd.push("--mindset", mindset);
      if (enableWeb === false) {
        cmd.pop(); // Remove --web
        cmd.push("--no-web");
      }

      const result = await execCommand(cmd);
      return { content: [{ type: "text", text: result }] };
    },
  };
}
```

### Step 3: Register Tool

Add to `createClawdisCodingTools()`:
```typescript
createAskGeminiWebTool(),  // ← Add after createAskGeminiTool
```

## Acceptance Criteria

- [ ] `createAskGeminiWebTool()` function created
- [ ] Tool registered in `createClawdisCodingTools()`
- [ ] Supports: query, mindset (optional), enableWeb (optional)
- [ ] Uses `--web` flag for Ask Gemini CLI
- [ ] Type checking passes

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 03 to "completed"
3. Read next card: [04-ask-gemini-deep-dive-tool](./04-ask-gemini-deep-dive-tool.md)
4. Continue execution
