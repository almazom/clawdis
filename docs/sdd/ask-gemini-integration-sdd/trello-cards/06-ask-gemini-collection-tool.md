# Card 06: Ask Gemini Collection Tool

| Field | Value |
|-------|-------|
| **ID** | AGI-06 |
| **Story Points** | 3 |
| **Depends On** | 02 |
| **Sprint** | Phase 2 |

## User Story

> As an AI agent, I want to analyze URL collections in parallel for comprehensive research.

## Context

Read before starting:
- [requirements.md](../requirements.md) - Section 5.5
- URL collections module: `/home/almaz/TOOLS/ask_cli_agents/src/ask_cli_agents/url_collections.py`
- Collection fetch pattern

## Instructions

### Step 1: Read URL Collections Module

```bash
# Read existing URL collections module
cat /home/almaz/TOOLS/ask_cli_agents/src/ask_cli_agents/url_collections.py | head -100
```

### Step 2: Create Collection Tool Function

```bash
# Edit pi-tools.ts
```

```typescript
function createAskGeminiCollectionTool(): AnyAgentTool {
  return {
    name: "ask_gemini_collection",
    description: "Parallel analysis of multiple URLs from a collection",
    parameters: Type.Object({
      collection: Type.String({
        description: "URL collection name (without .yaml)",
      }),
      prompt: Type.String({
        description: "Analysis prompt for all sources",
      }),
      mindset: Type.Optional(Type.String({
        description: "Persona/mindset for analysis",
      })),
      timeout: Type.Optional(Type.Number({
        description: "Timeout per URL in seconds (default: 60)",
        default: 60,
      })),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { collection, prompt, mindset, timeout } = args as {
        collection: string;
        prompt: string;
        mindset?: string;
        timeout?: number;
      };

      // Build command using fetch_from_collection pattern
      const cmd = ["ask", "gemini", "--url-collection", collection, "-c", prompt];
      if (mindset) cmd.push("--mindset", mindset);
      if (timeout) cmd.push("--timeout", String(timeout));

      const result = await execCommand(cmd);
      return { content: [{ type: "text", text: result }] };
    },
  };
}
```

### Step 3: Register Tool

```typescript
createAskGeminiCollectionTool(),
```

## Acceptance Criteria

- [ ] `createAskGeminiCollectionTool()` function created
- [ ] Tool registered in `createClawdisCodingTools()`
- [ ] Uses `--url-collection` flag
- [ ] Supports timeout configuration
- [ ] Type checking passes

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 06 to "completed"
3. Read next card: [07-telegram-collection-keyboard](./07-telegram-collection-keyboard.md)
4. Continue execution
