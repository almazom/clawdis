# Card 01: Add deepResearch Config Schema

| Field | Value |
|-------|-------|
| **ID** | DR-01 |
| **Story Points** | 2 |
| **Depends On** | None (first card) |
| **Sprint** | 1 - Foundation |

## User Story

> As a system administrator, I want to configure deep research settings in `clawdis.json` so that I can enable/disable the feature and set dry-run mode.

## Context

Read before starting:
- [requirements.md#6-configuration](../requirements.md) - Config structure
- [Configuration.md](../../../.qoder/repowiki/en/content/Configuration.md) - Existing patterns

The config follows existing patterns in `src/config/config.ts`. We add a new `deepResearch` section.

## Instructions

### Step 1: Read existing config schema
```bash
# Read the config.ts file to understand existing patterns
cat src/config/config.ts | head -400
```

### Step 2: Add Zod schema for deepResearch
Edit `src/config/config.ts` and add after other schema definitions:

```typescript
// Deep Research configuration schema
const deepResearchSchema = z.object({
  enabled: z.boolean().default(true),
  dryRun: z.boolean().default(true), // true during dev!
  cliPath: z.string().default('$HOME/TOOLS/gemini_deep_research/gdr.sh'),
  outputLanguage: z.enum(['ru', 'en', 'auto']).default('auto'),
  keywords: z.array(z.string()).optional(),
}).optional();
```

### Step 3: Add to main config interface
Find `ClawdisConfigSchema` and add:

```typescript
deepResearch: deepResearchSchema,
```

### Step 4: Add env variable overrides
Find environment variable handling section and add:

```typescript
// Deep Research env overrides
if (process.env.DEEP_RESEARCH_ENABLED !== undefined) {
  config.deepResearch = config.deepResearch || {};
  config.deepResearch.enabled = process.env.DEEP_RESEARCH_ENABLED === 'true';
}
if (process.env.DEEP_RESEARCH_DRY_RUN !== undefined) {
  config.deepResearch = config.deepResearch || {};
  config.deepResearch.dryRun = process.env.DEEP_RESEARCH_DRY_RUN === 'true';
}
if (process.env.DEEP_RESEARCH_CLI_PATH) {
  config.deepResearch = config.deepResearch || {};
  config.deepResearch.cliPath = process.env.DEEP_RESEARCH_CLI_PATH;
}
```

### Step 5: Export type
Add to exports:

```typescript
export type DeepResearchConfig = z.infer<typeof deepResearchSchema>;
```

### Step 6: Verify build
```bash
pnpm build
```

## Acceptance Criteria

- [ ] `deepResearchSchema` added to config.ts
- [ ] Schema has: `enabled`, `dryRun`, `cliPath`, `outputLanguage`, `keywords`
- [ ] `dryRun` defaults to `true`
- [ ] Env overrides work: `DEEP_RESEARCH_ENABLED`, `DEEP_RESEARCH_DRY_RUN`, `DEEP_RESEARCH_CLI_PATH`
- [ ] `pnpm build` passes
- [ ] Type `DeepResearchConfig` is exported

## Files Modified

- `src/config/config.ts`

## Next Card

→ [02-keyword-detection.md](./02-keyword-detection.md)
