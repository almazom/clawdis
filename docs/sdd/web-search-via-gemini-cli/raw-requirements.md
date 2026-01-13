# Feature: Web Search via Gemini CLI

## Raw Requirements

**Source:** User request via CLI with sample command

**Feature Description:**
Integrate web search capability into the Clawdis AI assistant via Gemini CLI. When users ask questions that require fresh information or explicitly request a web search, the system should automatically detect this need, execute the search using the existing Gemini-based tool, and present the results in a visually distinct format.

**Key Capabilities:**
1. **Keyword Detection**: Automatically detect when a web search is needed based on:
   - Explicit requests: "погуглить", "web search", "google", "search the web"
   - Contextual clues: questions about current events, weather, news, recent information
   - User intent: any query that implies need for up-to-date external information

2. **Search Execution**: Use the existing bash tool at `/home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh`
   - Pass the user's query as the `--request` parameter
   - Capture JSON output with `response`, `session_id`, and `stats`

3. **UI/UX Requirements**:
   - Display system message when web search is triggered: "🔍 Выполняю веб-поиск..."
   - Show search results with visual distinction (emoji prefix, special formatting)
   - Clearly indicate that the result is from a web search
   - Return results in Russian (as per Gemini tool configuration)

4. **Agent Integration**:
   - AI agent should automatically recognize when web search is appropriate
   - No manual trigger required when keywords are detected
   - Seamless integration with existing message flow

**Sample Command:**
```bash
./web-search-by-Gemini.sh --request "погода в Москве"
```

**Expected Output Format:**
```json
{
  "session_id": "uuid-string",
  "response": "Natural language answer in Russian",
  "stats": { "models": { "gemini-model": { "api": {...}, "tokens": {...} } } }
}
```

**Success Criteria:**
- System automatically detects web search needs with 95%+ accuracy
- Search results are displayed within 5-10 seconds
- Users can clearly identify which responses came from web search
- Agent uses web search appropriately without over-triggering
- Integration works across all platforms (Telegram, Discord, etc.)