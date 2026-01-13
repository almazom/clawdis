# 🚀 AI Agent Kickoff: Web Search via Gemini CLI

**Welcome!** You have been assigned to implement the **Web Search via Gemini CLI** feature.

---

## 📖 Your Mission

Implement web search capability into Clawdis AI assistant via Gemini CLI. This feature automatically detects when users need fresh information, searches the web, and returns results with visual distinction.

**Estimated Effort:** 24 Story Points (~2-3 days)  
**Priority:** High  
**Confidence:** 97% (well-defined patterns)  

---

## ⚡ Quick Start (5 minutes)

### Step 1: Setup
```bash
cd /home/almaz/zoo_flow/clawdis

# Switch to feature branch
git checkout -b feature/web-search-gemini-cli

# Verify dependencies
pnpm install

# Verify tool is available
/home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh --request "test"
```

### Step 2: Read Documentation (15 minutes)

1. **Read SDD Overview:** `docs/sdd/web-search-via-gemini-cli/README.md` (will be created as card 10)
2. **Review Requirements:** `docs/sdd/web-search-via-gemini-cli/requirements.md`
3. **Check Gap Analysis:** `docs/sdd/web-search-via-gemini-cli/gaps.md`
4. **Study UI Flow:** `docs/sdd/web-search-via-gemini-cli/ui-flow.md`

### Step 3: Execute Cards in Order

**Linear Execution (01 → 12):**

```bash
# Card 01: Configuration
cat docs/sdd/web-search-via-gemini-cli/trello-cards/01-config-schema.md
# → Follow instructions, implement, test
# → Mark as DONE in BOARD.md

# Card 02: Detection
cat docs/sdd/web-search-via-gemini-cli/trello-cards/02-detection.md
# → Follow instructions, implement, test
# → Mark as DONE in BOARD.md

# Continue through all cards...
```

---

## 🎯 Execution Protocol

### Phase 1: Implementation (Cards 01-05) - Day 1

```bash
# Time estimate: 8 hours

for CARD in 01 02 03 04 05; do
  echo "=== Starting Card $CARD ==="
  
  # Read card
  cat "docs/sdd/web-search-via-gemini-cli/trello-cards/${CARD}-*.md"
  
  # Implement (follow card instructions)
  # ... write code ...
  
  # Run tests for this card
  pnpm test src/web-search/ --reporter=verbose
  
  # Check coverage
  pnpm test:coverage src/web-search/ --reporter=text
  
  # Update BOARD.md status
  # Move from "TODO" to "DONE"
  
  echo "=== Card $CARD DONE ==="
done
```

### Phase 2: Testing (Cards 06-08) - Day 2 Morning

```bash
# Time estimate: 4 hours

# Run full test suite
pnpm test src/web-search/

# Check coverage (must be ≥70%)
pnpm test:coverage src/web-search/

# If coverage low, add more tests
# ... add missing test cases ...

# Run E2E test script (Card 08)
./scripts/test-web-search-e2e.sh
```

### Phase 3: Documentation (Cards 09-10) - Day 2 Afternoon

```bash
# Time estimate: 2 hours

# Review SDD docs for completeness
cat docs/sdd/web-search-via-gemini-cli/requirements.md
cat docs/sdd/web-search-via-gemini-cli/ui-flow.md
cat docs/sdd/web-search-via-gemini-cli/gaps.md

# Create README (Card 10)
# ... follow card instructions ...

# Verify all cards have context links
```

### Phase 4: Code Review & Polish (Cards 11-12) - Day 3

```bash
# Hand off to human for:
- PR creation and review
- Manual Telegram testing  
- Production deployment
```

---

## 📚 Reference Materials

### 🏗️ Architecture Standards
- **Deep Research Pattern:** `src/deep-research/` (copy this structure)
- **Config Pattern:** `src/config/config.ts` (see deepResearch schema)
- **Telegram Pattern:** `src/telegram/bot.ts` (see deep research integration)

### 🧰 Tools & Scripts
- **Testing:** `pnpm test`, `pnpm test:coverage`
- **Build:** `pnpm build` (must pass)
- **Lint:** `pnpm lint` (must pass)
- **Tool:** `./web-search-by-Gemini.sh --request "query"`

### 📖 Documentation
- **SDD Flow:** `.flows/sdd_flow_by_codex/` (read README + PROMPT_SYSTEMSUMMARY)
- **Skills System:** `.qoder/repowiki/en/content/Skills System.md`
- **Example Tool:** `/home/almaz/TOOLS/web_search_by_gemini/README.md`

---

## 🎓 Patterns to Follow

### ✅ DO
- Follow deep-research structure exactly
- Use TypeScript strict types (no `any`)
- Add emoji visual indicators: 🔍 (ack), 🌐 (result), ❌ (error)
- Write unit tests for all modules
- Keep functions <100 lines
- Use early returns to reduce nesting

### ❌ DON'T
- Don't change existing deep-research code (copy, don't modify)
- Don't skip error handling
- Don't hardcode paths (use config with defaults)
- Don't skip tests (70% coverage minimum)
- Don't create "clever" abstractions (keep it simple)

---

## 🐛 Debugging Guide

### If Detection Fails:
```bash
# Add logging in detect.ts
console.log('Input:', message);
console.log('Normalized:', normalized);
console.log('Deep research detected:', detectDeepResearchIntent(message));
console.log('Web search explicit match:', explicitMatch);
console.log('Web search contextual match:', contextualMatch);
```

### If CLI Fails:
```bash
# Test CLI directly
cd /home/almaz/TOOLS/web_search_by_gemini
./web-search-by-Gemini.sh --request "test"

# Check permissions
ls -la web-search-by-Gemini.sh

# Check tool availability
gemini --version
```

### If Telegram Not Responding:
```bash
# Check bot logs
pnpm dev telegram --verbose

# Check if bot is running
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe
```

---

## ✅ Definition of DONE

**For Each Card:**
- [ ] Code implemented per card instructions
- [ ] Tests written and passing
- [ ] TypeScript compiles without errors (`pnpm build`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Manual verification performed
- [ ] BOARD.md updated (move to DONE)
- [ ] Commit with clear message referencing card number

**For Entire Feature:**
- [ ] All 12 cards marked DONE
- [ ] Overall coverage ≥70%
- [ ] All manual tests from `manual-e2e-test.md` pass
- [ ] PR created and passing CI
- [ ] Human has tested on real Telegram
- [ ] Documentation complete and accurate

---

## 🆘 Getting Help

### When Stuck On:

**Architecture Decision →** Check `gaps.md` (already decided)
**Code Pattern →** Reference `deep-research` implementation
**Telegram API →** Check `src/telegram/bot.ts` existing patterns
**Testing →** Run `pnpm test` and check error messages
**Tool Issues →** Test CLI directly, check logs

### If Still Stuck:

1. Document what you've tried
2. Check similar patterns in codebase  
3. Check `AGENTS.md` for conventions
4. Ask specific question with context

---

## 📈 Progress Tracking

**Update this file as you work:**

```markdown
## Daily Log

**Day 1 (YYYY-MM-DD):**
- ✅ Completed: Cards 01, 02, 03
- 🔄 In Progress: Card 04
- 🚧 Blockers: None
- 💡 Notes: Detection working well

**Day 2 (YYYY-MM-DD):**
- ...
```

---

## 🎉 Success Celebration

When all cards are DONE:

1. **Verify:**
   ```bash
   pnpm test src/web-search/ --coverage
   # Should show ≥70% coverage
   ```

2. **Celebrate:** 🎊🎊🎊

3. **Hand Off:** Update BOARD.md, create PR, notify human

---

## 🚀 Ready?

**Your first task:**

```bash
# Read Card 01
cat docs/sdd/web-search-via-gemini-cli/trello-cards/01-config-schema.md

# Implement it
# ... write code ...

# Test it
pnpm build

# Mark as DONE and move to Card 02
```

**Let's build something awesome!** 💪