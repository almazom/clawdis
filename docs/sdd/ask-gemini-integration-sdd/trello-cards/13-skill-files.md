# Card 13: SKILL.md Files

| Field | Value |
|-------|-------|
| **ID** | AGI-13 |
| **Story Points** | 2 |
| **Depends On** | 02, 03, 04, 05, 06 |
| **Sprint** | Phase 4 |

## User Story

> As a Pi agent, I want to discover available tools through SKILL.md files.

## Context

Read before starting:
- Existing SKILL.md files in `skills/` directory
- Pattern from `skills/gemini/SKILL.md`

## Instructions

### Step 1: Create ask-gemini SKILL.md

```bash
# Create: skills/ask-gemini/SKILL.md
---
name: ask-gemini
description: Send AI queries to Gemini with dynamic mindset selection
metadata: {"clawdis":{"emoji":"💬","requires":{"bins":["ask"]},"install":[{"id":"manual","kind":"manual","instructions":"Tool at /home/almaz/TOOLS/ask_cli_agents/ask_gemini"}]}}
---

# ask-gemini

Send AI queries to Gemini with dynamic mindset selection.

## Features

- Basic AI queries with any mindset
- Supports all mindset personas: review, codereview, arch, qa, debug, research, critical, project, ux, docs, ocr, url, epub

## Usage

```bash
ask gemini -c "Your question"
ask gemini -c "Analyze this" --mindset research
```

## Examples

```bash
# Basic query
ask gemini -c "Explain Docker"

# With mindset
ask gemini -c "Review this code" --mindset codereview
ask gemini -c "Design architecture" --mindset arch
```

## Mindsets

Available personas: review, codereview, arch, qa, debug, research, critical, project, ux, docs, ocr, url, epub
```

### Step 2: Create ask-gemini-web SKILL.md

```bash
# Create: skills/ask-gemini-web/SKILL.md
---
name: ask-gemini-web
description: Perform web searches using Gemini for current information
metadata: {"clawdis":{"emoji":"🌐","requires":{"bins":["ask"]}}}
---

# ask-gemini-web

Perform web searches using Gemini with automatic web fetch.

## Features

- Web search integration
- Current information retrieval
- Multiple source analysis

## Usage

```bash
ask gemini -c "Latest AI news" --web
```
```

### Step 3: Create ask-gemini-deep-dive SKILL.md

```bash
# Create: skills/ask-gemini-deep-dive/SKILL.md
---
name: ask-gemini-deep-dive
description: Deep research with web search and research mindset
metadata: {"clawdis":{"emoji":"🔬","requires":{"bins":["ask"]}}}
---

# ask-gemini-deep-dive

Deep research tool combining web search with research mindset.

## Features

- Automatic research mindset
- URL collection support
- Parallel source analysis

## Usage

```bash
ask gemini -c "Research topic" --web --mindset research
ask gemini -c "Compare approaches" --url-collection my_collection
```
```

### Step 4: Create ask-gemini-pdf SKILL.md

```bash
# Create: skills/ask-gemini-pdf/SKILL.md
---
name: ask-gemini-pdf
description: Analyze PDF documents with OCR and page selection
metadata: {"clawdis":{"emoji":"📄","requires":{"bins":["ask"]}}}
---

# ask-gemini-pdf

Analyze PDF documents with page selection and OCR support.

## Features

- PDF file analysis
- Page selection: 1-5, 1,3,5, 1-10,15-20
- OCR for scanned documents

## Usage

```bash
ask gemini -f document.pdf -c "Summarize" --pages 1-5
ask gemini -f scan.pdf -c "Extract text" --ocr
```
```

### Step 5: Create ask-gemini-collection SKILL.md

```bash
# Create: skills/ask-gemini-collection/SKILL.md
---
name: ask-gemini-collection
description: Parallel analysis of URL collections
metadata: {"clawdis":{"emoji":"📁","requires":{"bins":["ask"]}}}
---

# ask-gemini-collection

Parallel analysis of multiple URLs from a collection.

## Features

- URL collection management
- Parallel source analysis
- Collection reports

## Usage

```bash
ask gemini --url-collection tech_news -c "Compare news"
```

## Slash Commands

- `/collection list` - List all collections
- `/collection show <name>` - Show collection
- `/collection report <name>` - Generate report
```

## Acceptance Criteria

- [ ] `skills/ask-gemini/SKILL.md` created
- [ ] `skills/ask-gemini-web/SKILL.md` created
- [ ] `skills/ask-gemini-deep-dive/SKILL.md` created
- [ ] `skills/ask-gemini-pdf/SKILL.md` created
- [ ] `skills/ask-gemini-collection/SKILL.md` created
- [ ] All files follow SKILL.md format
- [ ] Metadata correctly specified

## Next Steps

After completing this card:
1. Check git status
2. Update state.json: set card 13 to "completed"
3. Read next card: [14-e2e-testing](./14-e2e-testing.md)
4. Continue execution
