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
