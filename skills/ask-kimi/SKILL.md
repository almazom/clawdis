---
name: ask-kimi
description: Unified AI CLI with mindset/persona system for specialized tasks
metadata: {"clawdis":{"emoji":"🧠","requires":{"bins":["ask"]},"install":[{"id":"pip","kind":"pip","instructions":"pip install -e /home/almaz/TOOLS/ask_cli_agents"}]}}
---

# ask-kimi

Unified AI CLI with **mindset/persona system** for specialized tasks.

## Usage

```bash
ask kimi -c "Your question" --mindset [shortcut]
ask gemini -c "Your question" --mindset [shortcut]
```

## Mindset Selection Guide

### 🔍 Code Review
| Shortcut | Persona | When to Use |
|----------|---------|-------------|
| `review`, `codereview` | Dr. Victoria Blackwood | General code review, best practices |
| `qa` | QA Guardian | Test coverage, edge cases |
| `bdd` | BDD Guardian | Behavior-driven development |

### 🐛 Debugging
| Shortcut | Persona | When to Use |
|----------|---------|-------------|
| `debug`, `debugg` | Debugging Expert | Bug analysis, root cause |

### 🏗️ Architecture
| Shortcut | Persona | When to Use |
|----------|---------|-------------|
| `arch`, `archi`, `architecture` | Architecture Guardian | System design, patterns |

### 📚 Documentation
| Shortcut | Persona | When to Use |
|----------|---------|-------------|
| `docs` | Documentation Specialist | Docs, README, comments |
| `ux` | UX Expert | UI/UX recommendations |

### 🔬 Research
| Shortcut | Persona | When to Use |
|----------|---------|-------------|
| `research` | Deep Research Expert | Web search, analysis |
| `critical`, `critic`, `anton` | Critical Guardian | Pros/cons, trade-offs |

### 📦 Project
| Shortcut | Persona | When to Use |
|----------|---------|-------------|
| `project`, `project-gathering`, `peter` | Project Gathering Expert | Requirements, specs |

### 📄 File Processing
| Shortcut | Persona | When to Use |
|----------|---------|-------------|
| `ocr`, `ocr_gemini` | OCR Guardian | Scanned documents |
| `epub`, `ebook` | EPUB Agent | E-book analysis |
| `url`, `fetch` | URL Fetcher | Web page extraction |

## Examples

```bash
# Code review with Victoria
ask kimi -c "review this PR" --mindset codereview

# Architecture review
ask kimi -c "design a microservice" --mindset arch

# Debug a bug
ask kimi -c "why is this failing?" -f bug.py --mindset debug

# Research with web search
ask kimi -c "latest AI trends" --mindset research --web

# OCR document
ask kimi -c "extract text" -f scan.pdf --ocr

# Critical analysis
ask kimi -c "pros and cons of React vs Vue" --mindset critical
```

## Options

| Option | Description |
|--------|-------------|
| `-c, --prompt` | Query to send to AI |
| `-f, --file` | Attach file (txt, pdf, images, audio) |
| `--mindset` | Persona shortcut or path to .md |
| `--web` | Enable web search |
| `--thinking` | Enable reasoning mode |
| `--timeout` | Timeout in seconds |
| `--export PATH` | Export response to file |
| `--t2me` | Send to Telegram |

## Mindsets File Location

All mindsets stored in `/home/almaz/_agents/`:
- `victoria-code-review-guardian.md`
- `architecture-guardian.md`
- `debugging-expert.md`
- `deep-research-expert.md`
- `Anton_critical_guardian.md`
- `qa-guardian.md`
- And more...
