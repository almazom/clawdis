# Card 05: Ask Gemini PDF Tool

| Field | Value |
|-------|-------|
| **ID** | AGI-05 |
| **Story Points** | 3 |
| **Depends On** | 02 |
| **Sprint** | Phase 2 |

## User Story

> As an AI agent, I want to analyze PDF documents with OCR and page selection.

## Context

Read before starting:
- [requirements.md](../requirements.md) - Section 5.4
- PDF handling in Ask Gemini CLI
- OCR mode flag

## Instructions

### Step 1: Create PDF Tool Function

```bash
# Edit pi-tools.ts
```

```typescript
function createAskGeminiPdfTool(): AnyAgentTool {
  return {
    name: "ask_gemini_pdf",
    description: "Analyze PDF documents with page selection and OCR support",
    parameters: Type.Object({
      file: Type.String({
        description: "Path to PDF file",
      }),
      pages: Type.Optional(Type.String({
        description: "Page selection: 1-5, 1,3,5, or 1-10,15-20",
      })),
      ocr: Type.Optional(Type.Boolean({
        description: "Enable OCR for scanned documents (default: false)",
        default: false,
      })),
      prompt: Type.String({
        description: "Analysis instruction for the document",
      }),
      mindset: Type.Optional(Type.String({
        description: "Persona/mindset for analysis",
      })),
    }),
    execute: async (_toolCallId: string, args: unknown) => {
      const { file, pages, ocr, prompt, mindset } = args as {
        file: string;
        pages?: string;
        ocr?: boolean;
        prompt: string;
        mindset?: string;
      };

      // Build command
      const cmd = ["ask", "gemini", "-f", file, "-c", prompt];
      if (pages) cmd.push("--pages", pages);
      if (ocr) cmd.push("--ocr");
      if (mindset) cmd.push("--mindset", mindset);

      const result = await execCommand(cmd);
      return { content: [{ type: "text", text: result }] };
    },
  };
}
```

### Step 2: Register Tool

```typescript
createAskGeminiPdfTool(),
```

## Acceptance Criteria

- [ ] `createAskGeminiPdfTool()` function created
- [ ] Tool registered in `createClawdisCodingTools()`
- [ ] Supports: file, pages (optional), ocr (optional), prompt, mindset (optional)
- [ ] Uses `--file`, `--pages`, `--ocr` flags
- [ ] Type checking passes

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 05 to "completed"
3. Read next card: [06-ask-gemini-collection-tool](./06-ask-gemini-collection-tool.md)
4. Continue execution
