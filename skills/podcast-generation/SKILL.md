---
name: podcast-generation
description: 🔴 CUSTOM SKILL - Generate podcast episodes from topics using AI-powered script generation and Gemini TTS. Creates conversational audio content in Russian.
metadata: {
  "clawdis": {
    "emoji": "🎙️",
    "requires": {
      "bins": ["tts_cli.sh"],
      "config": ["ttsCli"]
    },
    "install": [
      {
        "id": "tts-cli",
        "kind": "manual",
        "instructions": "Install TTS CLI from /home/almaz/TOOLS/gemini_tts_cli_sandbox/ - requires Python 3.11+ and Gemini API key"
      }
    ]
  }
}
---

# Podcast Generation [CUSTOM SKILL]

**Generate AI-powered podcast episodes with human-like conversation.**

## Features

- **AI Script Generation**: Creates natural, conversational dialogue between two speakers
- **Multi-speaker TTS**: Uses Gemini's advanced TTS with emotion markers ([laughing], [sigh], [uhm])
- **Customizable Speakers**: Default speakers Alex (Zephyr voice) and Sarah (Puck voice)
- **Russian Language**: All content generated in Russian
- **MP3 Output**: High-quality audio files ready for distribution

## Usage

### Via Telegram Bot
```bash
/podcast "Artificial Intelligence in Healthcare"
/podcast "Quantum Computing" --speaker1 Alex --speaker2 Sarah
```

### Via Agent Tool
```javascript
generate_podcast({
  topic: "History of the Roman Empire",
  speaker1: "Marcus",
  speaker2: "Livia"
})
```

### Via TTS CLI Directly
```bash
# Generate full podcast
/home/almaz/TOOLS/gemini_tts_cli_sandbox/tts_cli.sh podcast "Your Topic"

# Generate script only
/home/almaz/TOOLS/gemini_tts_cli_sandbox/tts_cli.sh generate-script "Your Topic"

# Preview script without saving
/home/almaz/TOOLS/gemini_tts_cli_sandbox/tts_cli.sh preview-script "Your Topic"
```

## Configuration

### TTS CLI Setup
1. Ensure TTS CLI is installed at `/home/almaz/TOOLS/gemini_tts_cli_sandbox/`
2. Configure Gemini API key in the TTS CLI `.env` file:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

### Environment Variables
```env
# Optional: Override default TTS CLI path
CLAWDIS_TTS_CLI_PATH=/custom/path/to/tts_cli.sh

# Optional: Set default speakers
CLAWDIS_TTS_SPEAKER1=Alex
CLAWDIS_TTS_SPEAKER2=Sarah
```

### Config File
```json
{
  "ttsCli": {
    "enabled": true,
    "cliPath": "/home/almaz/TOOLS/gemini_tts_cli_sandbox/tts_cli.sh",
    "timeoutMs": 300000,
    "defaultSpeaker1": "Alex",
    "defaultSpeaker2": "Sarah",
    "outputDir": "./output"
  }
}
```

## Technical Details

- **Max Topic Length**: 500 characters
- **Min Topic Length**: 5 characters
- **Typical Duration**: 3-5 minutes per episode
- **Audio Format**: MP3 (44.1kHz, stereo)
- **Voices**: 30+ Gemini TTS voices available
- **Languages**: Supports 24 languages (primarily Russian)

## Examples

**Good Topics:**
- "The Future of AI in Medicine"
- "History of Chess Grandmasters"
- "Climate Change Solutions for Cities"
- "Introduction to Quantum Computing"

**Poor Topics:**
- "AI" (too short)
- "My thoughts about everything in the universe and beyond" (too vague)
- "12345" (not a real topic)

## Troubleshooting

**Error: "TTS CLI not found"**
- Ensure TTS CLI is installed at the configured path
- Check file permissions (should be executable)

**Error: "Topic too short"**
- Provide more detail in your topic (minimum 5 characters)
- Example: Instead of "AI", use "Artificial Intelligence in Healthcare"

**Error: "Timeout after 300 seconds"**
- Podcast generation is taking too long
- Try a simpler topic or check Gemini API status

**Error: "API key not configured"**
- Set `GEMINI_API_KEY` in TTS CLI `.env` file
- Verify the key is valid and has TTS permissions
