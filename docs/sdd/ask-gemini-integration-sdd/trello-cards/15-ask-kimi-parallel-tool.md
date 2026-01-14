# Card 15: Ask Kimi Parallel Tool

| Field | Value |
|-------|-------|
| **ID** | AGI-15 |
| **Story Points** | 3 |
| **Depends On** | 02 |
| **Sprint** | Phase 5 |

## User Story

> As an AI agent, I want to use Kimi CLI with the same pattern as Gemini, supporting Russian triggers like "спроси кими" and slash command /kimi.

## Context

Read before starting:
- [requirements.md](../requirements.md) - Section 6
- Existing `createAskGeminiTool()` pattern in pi-tools.ts

## Instructions

### Step 1: Add KIMI_CLI constant

```bash
# Edit src/agents/pi-tools.ts
```

Add near ASK_GEMINI_CLI:
```typescript
const KIMI_CLI = "/home/almaz/TOOLS/ask_cli_agents/ask_kimi";
```

### Step 2: Create createAskKimiTool()

```typescript
function createAskKimiTool(): AnyAgentTool {
  return {
    label: "Ask Kimi",
    name: "ask_kimi",
    description:
      "Спроси кими, ask_kimi, /kimi - AI queries with Kimi and dynamic mindsets",
    parameters: Type.Object({
      prompt: Type.String({
        description: "Запрос для Kimi AI",
      }),
      mindset: Type.Optional(
        Type.String({
          description: "Persona/mindset: codereview, arch, debug, research, critical",
        }),
      ),
      thinking: Type.Optional(
        Type.Boolean({
          description: "Enable thinking mode (default: true)",
          default: true,
        }),
      ),
      timeout: Type.Optional(
        Type.Number({
          description: "Timeout in seconds (default: 60)",
        }),
      ),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { prompt, mindset, thinking, timeout } = args as {
        prompt: string;
        mindset?: string;
        thinking?: boolean;
        timeout?: number;
      };

      try {
        const args: string[] = ["-c", prompt];
        if (mindset) args.push("--mindset", mindset);
        if (thinking === false) args.push("--no-thinking");
        if (timeout) args.push("--timeout", String(timeout));

        const result = await runExec(KIMI_CLI, args, {
          timeoutMs: (timeout ?? 60) * 1000,
        });
        return {
          content: [{ type: "text", text: result.stdout || result.stderr }],
          details: {},
        };
      } catch (error) {
        return {
          content: [
            { type: "text", text: `Error: ${String(error)}` },
          ],
          details: {},
        };
      }
    },
  };
}
```

### Step 3: Register Tool

Add to `createClawdisCodingTools()`:
```typescript
createAskKimiTool(),  // After createAskGeminiTool()
```

## Acceptance Criteria

- [ ] `createAskKimiTool()` function created
- [ ] Tool registered in `createClawdisCodingTools()`
- [ ] Supports: prompt, mindset, thinking, timeout
- [ ] Uses `KIMI_CLI` path
- [ ] Type checking passes
- [ ] AI agent can understand: "спроси кими", "ask_kimi", /kimi

## AI Agent Triggers

This tool enables AI agent to recognize:
- **Russian**: "спроси кими", "спроси кими про...", "кими"
- **English**: "ask_kimi", "ask kimi", "/kimi"
- **Keywords**: thinking mode, codereview, arch, debug

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 15 to "completed"
3. Update progress.md
4. Create PR for extension
