# Card 01: Configuration Schema for Web Search

**Story Points:** 1 | **Priority:** P0 (Blocker) | **Owner:** AI Agent

## 📋 Description

Add web search configuration to the Clawdis configuration schema in `src/config/config.ts`. This enables feature toggling and parameter customization.

## ✅ Acceptance Criteria

- [ ] Zod schema added for `webSearch` configuration
- [ ] All fields have appropriate defaults
- [ ] Environment variable overrides supported
- [ ] TypeScript types compile without errors
- [ ] Configuration loads successfully on bot startup

## 🔧 Implementation

### File: `src/config/config.ts`

**Location:** Find the `deepResearch` schema in the file (around line 200-250 based on pattern)

**Add after deepResearch schema:**

```typescript
webSearch: z.object({
  enabled: z.boolean().default(true),
  cliPath: z.string().default("/home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh"),
  timeoutMs: z.number().int().positive().default(30000),
  requireConfirmation: z.boolean().default(false),
  customPatterns: z.array(z.string()).optional(),
}).default({}),
```

### Environment Variable Support

**Add comments documenting env vars:**

```typescript
/**
 * Environment variable overrides:
 * - WEB_SEARCH_ENABLED=false to disable
 * - WEB_SEARCH_CLI_PATH=/custom/path to override CLI path
 * - WEB_SEARCH_TIMEOUT_MS=45000 to override timeout
 */
```

## 🧪 Testing

### Manual Test
1. Start bot with default config
2. Verify no errors on startup
3. Check logs for config loading

### Code Check
```bash
# Run type check
pnpm build

# Should compile without errors
```

## 🔗 Context

- **Requirements:** FR-008 (Configuration Support)
- **Gap Reference:** Gap-005 (Configuration Schema)
- **Next Card:** 02-detection (depends on this)

## 📝 Notes

- Pattern follows `deepResearch` config exactly
- Keep defaults conservative and safe
- Custom patterns allow user extensions without code changes