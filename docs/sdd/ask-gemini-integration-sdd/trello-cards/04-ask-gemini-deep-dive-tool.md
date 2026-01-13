# Card 04: Ask Gemini Deep Dive Tool

| Field | Value |
|-------|-------|
| **ID** | AGI-04 |
| **Story Points** | 3 |
| **Depends On** | 02 |
| **Sprint** | Phase 2 |

## User Story

> As an AI agent, I want to conduct deep research using web search and research mindset automatically.

## Context

Read before starting:
- [requirements.md](../requirements.md) - Section 5.3
- Research mindset in Ask Gemini CLI
- URL collections integration

## Instructions

### Step 1: Understand Deep Dive Requirements

Deep dive = web search + research mindset + optional URL collection

### Step 2: Create Deep Dive Tool Function

```bash
# Edit pi-tools.ts
```

```typescript
function createAskGeminiDeepDiveTool(): AnyAgentTool {
  return {
    name: "ask_gemini_deep_dive",
    description: "Deep research: web search + research mindset for comprehensive analysis",
    parameters: Type.Object({
      query: Type.String({
        description: "Research question or topic for deep analysis",
      }),
      collection: Type.Optional(Type.String({
        description: "URL collection name for parallel source analysis",
      })),
      sources: Type.Optional(Type.Array(Type.String({
        description: "Individual URLs to analyze",
      }))),
      mindset: Type.Optional(Type.String({
        description: "Override mindset (default: research)",
        default: "research",
      })),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { query, collection, sources, mindset } = args as {
        query: string;
        collection?: string;
        sources?: string[];
        mindset?: string;
      };

      // Build command
      const cmd = ["ask", "gemini", "-c", query, "--web", "--mindset", mindset || "research"];

      if (collection) {
        cmd.push("--url-collection", collection);
      }

      if (sources && sources.length > 0) {
        for (const url of sources) {
          cmd.push("--url", url);
        }
      }

      const result = await execCommand(cmd);
      return { content: [{ type: "text", text: result }] };
    },
  };
}
```

### Step 3: Register Tool

```typescript
createAskGeminiDeepDiveTool(),
```

## Acceptance Criteria

- [ ] `createAskGeminiDeepDiveTool()` function created
- [ ] Tool registered in `createClawdisCodingTools()`
- [ ] Automatically uses research mindset
- [ ] Supports URL collection parameter
- [ ] Supports individual URL sources
- [ ] Type checking passes

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 04 to "completed"
3. Read next card: [05-ask-gemini-pdf-tool](./05-ask-gemini-pdf-tool.md)
4. Continue execution
