# Card 02: Ask Gemini Basic Tool

| Field | Value |
|-------|-------|
| **ID** | AGI-02 |
| **Story Points** | 2 |
| **Depends On** | 01 |
| **Sprint** | Phase 2 |

## User Story

> As an AI agent, I want to send basic queries to Gemini with dynamic mindset selection.

## Context

Read before starting:
- [requirements.md](../requirements.md) - Section 5.1
- Existing tools in `src/agents/pi-tools.ts`
- Ask Gemini CLI at `/home/almaz/TOOLS/ask_cli_agents/`

## Instructions

### Step 1: Read Existing Tool Pattern

```bash
# Read pi-tools.ts to understand patterns
cat /home/almaz/zoo_flow/clawdis/src/agents/pi-tools.ts | head -100
```

### Step 2: Create Basic Tool Function

```bash
# Edit pi-tools.ts - add after existing tools
```

```typescript
function createAskGeminiTool(): AnyAgentTool {
  return {
    name: "ask_gemini_basic",
    description: "Send AI query to Gemini with dynamic mindset selection. Supports: review, codereview, arch, qa, debug, research, critical, project, ux, docs, ocr, url, epub",
    parameters: Type.Object({
      prompt: Type.String({
        description: "The query/prompt to send to AI",
      }),
      mindset: Type.Optional(Type.String({
        description: "Persona/mindset: review, codereview, arch, qa, debug, research, critical, project, ux, docs, ocr, url, epub",
      })),
      model: Type.Optional(Type.String({
        description: "Model to use (default: gemini-2.0-flash)",
      })),
      timeout: Type.Optional(Type.Number({
        description: "Timeout in seconds (default: 60)",
      })),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { prompt, mindset, model, timeout } = args as {
        prompt: string;
        mindset?: string;
        model?: string;
        timeout?: number;
      };

      // Build command
      const cmd = ["ask", "gemini", "-c", prompt];
      if (mindset) cmd.push("--mindset", mindset);
      if (model) cmd.push("--model", model);
      if (timeout) cmd.push("--timeout", String(timeout));

      // Execute and return result
      const result = await execCommand(cmd);
      return { content: [{ type: "text", text: result }] };
    },
  };
}
```

### Step 3: Register Tool

Add to `createClawdisCodingTools()` function:
```typescript
export function createClawdisCodingTools(): AnyAgentTool[] {
  const tools: AnyAgentTool[] = [
    // ... existing tools
    createAskGeminiTool(),  // ← Add here
    // ...
  ];
  return tools;
}
```

## Acceptance Criteria

- [ ] `createAskGeminiTool()` function created in pi-tools.ts
- [ ] Tool registered in `createClawdisCodingTools()`
- [ ] Tool schema supports: prompt, mindset (optional), model (optional), timeout (optional)
- [ ] Type checking passes: `pnpm type-check`
- [ ] No lint errors: `pnpm lint`

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 02 to "completed"
3. Read next card: [03-ask-gemini-web-tool](./03-ask-gemini-web-tool.md)
4. Continue execution
