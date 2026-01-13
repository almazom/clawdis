# Card 03: Implement telega_v2 fetch + segregation pipeline

| Field | Value |
|-------|-------|
| **ID** | AICLUB-03 |
| **Story Points** | 4 |
| **Depends On** | AICLUB-02 |
| **Sprint** | 2 - Pipeline |

## User Story

> As a maintainer, I want the AI Club pipeline to fetch messages via telega_v2 and generate a segregation report so that the Telegram commands return a valid report instead of the error message.

## Context

Read before starting:
- [requirements.md](../requirements.md) - R4-R10, R16-R18
- `src/config/config.ts` - AI Club config schema
- `src/commands/ai-club.ts` - CLI integration and parsing
- `docs/e2e-telega-v2/TELEGA-V2-USAGE.md` - telega_v2 CLI patterns

## Must Have

- telega_v2 fetch-range command uses configured profile + channel
- Fetch range covers full period (today/week)
- Segregation CLI returns JSON summary + report URL
- Errors fall back to standard failure handling

## Instructions

### Step 1: Extend AI Club config

Edit `src/config/config.ts` and extend defaults + schema:

```typescript
const AI_CLUB_DEFAULTS = {
  cliPath: "ai_club",
  telegaV2Path: "telega_v2",
  telegaV2Profile: "default",
  channel: "@aiclubsweggs",
  timeoutMs: 300000,
} as const;

const aiClubSchema = z
  .object({
    cliPath: z.string().default(AI_CLUB_DEFAULTS.cliPath),
    telegaV2Path: z.string().default(AI_CLUB_DEFAULTS.telegaV2Path),
    telegaV2Profile: z.string().default(AI_CLUB_DEFAULTS.telegaV2Profile),
    channel: z.string().default(AI_CLUB_DEFAULTS.channel),
    timeoutMs: z.number().int().positive().default(AI_CLUB_DEFAULTS.timeoutMs),
  })
  .optional();
```

Add env overrides:

```typescript
const telegaV2Profile = process.env.TELEGA_V2_PROFILE;
const channelEnv = process.env.AI_CLUB_CHANNEL;

if (telegaV2Profile?.trim()) aiClub.telegaV2Profile = telegaV2Profile.trim();
if (channelEnv?.trim()) aiClub.channel = channelEnv.trim();
```

### Step 2: Add telega_v2 fetch-range in `getAiClubReport`

Edit `src/commands/ai-club.ts` to compute time range and fetch messages:

```typescript
const telegaPath = cfg.aiClub?.telegaV2Path?.trim() || "telega_v2";
const profile = cfg.aiClub?.telegaV2Profile?.trim() || "default";
const channel = cfg.aiClub?.channel?.trim() || "@aiclubsweggs";

const { fromIso, toIso } = buildRange(period); // implement helper
const fetchArgs = ["fetch-range", "--profile", profile, channel, fromIso, toIso];
const fetchResult = await runExec(telegaPath, fetchArgs, { timeoutMs });

const cachePath = parseCachePath(fetchResult.stdout);
```

### Step 3: Run segregation CLI on cached messages

```typescript
const reportArgs = ["--from-cache", cachePath, "--period", period];
const { stdout } = await runExec(cmdPath, reportArgs, { timeoutMs });
// parse JSON -> { status, summary, report_url, channel }
```

### Step 4: Add verbose logging

```typescript
logVerbose(`[ai-club] telega_v2: ${telegaPath} ${fetchArgs.join(" ")}`);
logVerbose(`[ai-club] cache: ${cachePath}`);
logVerbose(`[ai-club] report url: ${report.report_url}`);
```

## Acceptance Criteria

- [ ] `aiClub` schema includes `telegaV2Profile` and `channel`
- [ ] Env overrides work: `TELEGA_V2_PROFILE`, `AI_CLUB_CHANNEL`
- [ ] telega_v2 `fetch-range` is invoked with configured profile + channel
- [ ] Segregation CLI runs on cached messages and JSON parsing succeeds
- [ ] On failure, `getAiClubReport` returns `null`

## Files Modified

- `src/config/config.ts`
- `src/commands/ai-club.ts`

## Next Card

→ [04-delivery-tests-docs.md](./04-delivery-tests-docs.md)
