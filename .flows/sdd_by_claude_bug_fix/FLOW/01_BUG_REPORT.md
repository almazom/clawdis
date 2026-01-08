# Phase 1: Bug Report Collection

Goal: Collect structured, actionable bug information with all mandatory fields.

## Step 1: Get Bug Report

Ask for the bug report if not already provided. Encourage detailed, specific input.

Prompt source:
- `prompts/bug-report.yaml` -> `bug_report_prompt`

**Prompt:**
```
Please provide a bug report with the following information:
1. Summary (one line)
2. Expected behavior (what SHOULD happen)
3. Actual behavior (what DOES happen)
4. Steps to reproduce (numbered)
5. Error output (exact logs/messages)
6. Environment (OS, version, config)
7. Severity (P0-Critical, P1-High, P2-Medium, P3-Low)
```

If a user cannot provide a field, record "TBD" and add it to Open Questions with a gap ID. Do not proceed to Phase 2 until all TBD items are resolved.

## Step 1a: Interview Preferences (for gap followups)

Before gap followups, ask the user for interview preferences:
- One question at a time vs batch
- Auto-accept mode: none / up2u (this question) / up2u all (remaining)

Use Russian by default; do not ask for language preference.
Do not mention "format" in the preferences text; the answer format is fixed (1-6 options).

## Gap-Filling Interview (for TBD fields)

When any required field is "TBD", run a short gap interview:

Prompt source:
- `prompts/gap-interview.yaml` -> `gap_interview_prompt`

**Rules:**
- Ask one gap at a time unless the user requests batch mode.
- Each question includes: context, goal, why, progress.
- Provide **3 short options** + **option 4 for custom input** + **option 5 up2u** + **option 6 up2u all**.
- Mark the suggested option at the start of the option text.
- User replies with `1`, `2`, `3`, `4 <custom text>`, `5` (up2u), or `6` (up2u all).
- Mark the gap as closed once answered.
- No tables in interview output; use numbered lines only.

## Critical vs Optional Fields

Critical (must be provided or confirmed):
- Summary
- Expected
- Actual
- Steps to reproduce
- Error output

Optional (can be auto-filled with confirmation when confidence is high):
- Environment (default: current dev environment + repo versions)
- Severity (default: P2-Medium)
- Additional context (default: none)

## Step 2: Validate Mandatory Fields

All fields below MUST be present:

| Field | Description | Example |
|-------|-------------|---------|
| Summary | One-line description | "Login fails with null pointer" |
| Expected | What should happen | "User should see dashboard" |
| Actual | What happens | "Error: Cannot read property 'id' of null" |
| Steps | Numbered reproduction | "1. Open app, 2. Click login..." |
| Error Output | Exact logs/traces | Stack trace, console output |
| Environment | System details | "Node 18, Ubuntu 22.04" |
| Severity | Priority level | P1-High |

## Performance Bug Addendum (if applicable)

If the bug is about speed/latency, capture these baseline details:

- Current time/latency and how measured
- Target time/latency
- Exact command used
- Caching/build flags (BuildKit, --no-cache)
- Files changed before the slow run

## Step 3: Assess Severity

| Severity | Description | Response Time |
|----------|-------------|---------------|
| P0-Critical | System down, data loss | Immediate |
| P1-High | Major feature broken | Same day |
| P2-Medium | Feature degraded | This sprint |
| P3-Low | Minor issue | Backlog |

## Step 4: Generate Bug ID

Format: `BUG-YYYY-MM-DD-NNN`

Example: `BUG-2026-01-06-001`

## Open Questions

Track missing information with gap IDs until resolved.

Example:
- BUG-GAP-001: What exact command reproduces the issue?
- BUG-GAP-002: What is the current average build time?

## Validation Checklist

- [ ] Summary is specific (not "it doesn't work")
- [ ] Expected vs Actual clearly different
- [ ] Steps are numbered and specific
- [ ] Error output is exact (copy-paste, not paraphrase)
- [ ] Environment is complete
- [ ] Severity is justified

## Common Problems

### Problem: Vague Summary
❌ "App crashes"
✅ "App crashes when clicking save button on edit profile page"

### Problem: Missing Steps
❌ "Just use the app and it breaks"
✅ "1. Login as admin, 2. Go to Settings, 3. Click 'Export', 4. Error appears"

### Problem: Paraphrased Error
❌ "Some kind of null error"
✅ "TypeError: Cannot read property 'name' of undefined at UserService.ts:42"

## Output

Create `bug-report.md` with all validated information using template:
- `TEMPLATES/bug-report.template.md`

## Completion Gate

Only proceed to Phase 2 when:
- [ ] All mandatory fields are filled
- [ ] Steps are specific and numbered
- [ ] Error output is exact
- [ ] Bug ID is generated
