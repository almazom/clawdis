# UI Flow: Multi-Agent Web Search

## Telegram User Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ USER INTERFACE                                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User sends:                                                          │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ /web Python 3.12 features                                    │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Bot immediately acknowledges:                                        │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ 🤔 Думаю...                                                  │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  First success (15-30s later):                                        │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ 🌐 Kimi CLI ⭐⭐⭐⭐                                          │     │
│  │                                                              │     │
│  │ [First 500 chars of response...]                            │     │
│  │                                                              │     │
│  │ ────────────────────────                                    │     │
│  │ _Время ответа: 15346мс | Первый ответ: Kimi CLI_           │     │
│  │                                                              │     │
│  │ [View Full Report →]                                        │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Later (after all complete):                                          │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ 📊 Результаты от всех 5 AI агентов                          │     │
│  │                                                              │     │
│  │ [HTML Report with AI Analysis]                              │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Internal Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ INTERNAL PROCESSING                                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ [Start]                                                               │
│    │                                                                  │
│    ▼                                                                  │
│ ┌────────────────────────────────────────┐                            │
│ │ 1. Spawn 5 agents in parallel           │                            │
│ │    Promise.all([agentPromises])         │                            │
│ └────────────────────────────────────────┘                            │
│    │                                                                  │
│    ├────────────────────────────────────────────────┐                  │
│    │                                                │                  │
│    ▼                                                ▼                  │
│ ┌────────────────────┐                     ┌─────────────────┐        │
│ │ 2. First Success   │                     │ Background:     │        │
│ │                    │                     │ Wait for all    │        │
│ │ - Publish to user  │                     │ - Track results │        │
│ │ - Set winner       │                     │ - Track errors  │        │
│ └────────────────────┘                     └─────────────────┘        │
│    │                                                │                  │
│    │                                                │                  │
│    ▼                                                ▼                  │
│    │                                    ┌─────────────────────┐       │
│    │                                    │ 3. AI Analysis      │       │
│    │                                    │    - Kimi analyzes  │       │
│    │                                    │    - All responses  │       │
│    │                                    │    - Generates      │       │
│    │                                    │      summary        │       │
│    │                                    └─────────────────────┘       │
│    │                                                │                  │
│    └────────────────────────────────────────────────┘                  │
│                                                                  │      │
│                                                                  ▼      │
│                                                          ┌─────────────┐│
│                                                          │ 4. Generate ││
│                                                          │ HTML Report ││
│                                                          └─────────────┘│
│                                                                  │      │
│                                                                  ▼      │
│                                                          ┌─────────────┐│
│                                                          │ 5. publish  ││
│                                                          │ _me         ││
│                                                          └─────────────┘│
│                                                                  │      │
│                                                                  ▼      │
│                                                              [End]       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Logging Points

```
[WEB] 🥊 Starting AI Fight: "query"
[WEB] ⚡ Gemini CLI launched
[WEB] 🔍 Kimi CLI launched
[WEB] 🐉 Qwen CLI launched
[WEB] 🧠 MiniMax Claude launched
[WEB] 🪄 GLM Claude launched
[WEB] ✅ [AGENT] first success (XXXms)
[WEB] 📤 Published to user: [AGENT] response
[WEB] ⏳ Waiting for remaining X agents...
[WEB] ✅ [AGENT] success (XXXms)
[WEB] ❌ [AGENT] failed: [error]
[WEB] 📊 All X agents completed
[WEB] 🤖 Generating AI analysis...
[WEB] 📄 HTML report ready
[WEB] 📨 Sending to publish_me...
```

## Error States

```
[WEB] ❌ [AGENT] timeout (>180s)
[WEB] ❌ [AGENT] failed: [error details]
[WEB] ⚠️ X/Y agents failed - continuing with available results
```
