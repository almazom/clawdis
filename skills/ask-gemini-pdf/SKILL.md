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
