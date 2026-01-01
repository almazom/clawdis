# Image Input Modality Plan

## Progress
- Total tasks: 8
- Completed: 8
- Remaining: 0
- Progress: 100%
- Last updated: 2026-01-01

## Scope
- Integrate image input using `/home/almaz/TOOLS/get_via_gemini_vision/gemini_vision.sh`
- Keep prompts/config external (YAML/JSON)
- Minimal changes to existing agent pipeline

## Tasks
- [x] 1) Confirm `gemini_vision.sh` contract (help-index, defaults, prompt keys)
- [x] 2) Define config surface in Clawdis for vision integration (paths, prompt key, timeout, model)
- [x] 3) Implement wrapper to call `gemini_vision.sh` and capture output
- [x] 4) Parse wrapper output (strip fences, JSON parse, extract response/data)
- [x] 5) Wire image recognition into inbound flow (when `MediaPath` is image)
- [x] 6) Add optional session memory for last image analysis (reply follow-ups)
- [x] 7) Add tests for parser + wrapper (mock CLI output)
- [x] 8) Add docs for configuration + usage

## Notes
- Update the Progress section when checking tasks off.
- Keep all prompt templates in external config files (no hardcoded prompts).
