# Card 11: Pull Request Preparation

**Story Points:** 1 | **Priority:** P2 | **Owner:** Human (Peter) + AI Agent (prep)

## 📋 Description

Prepare and submit pull request for web search feature. Include comprehensive PR description, testing evidence, and migration notes.

## ✅ Acceptance Criteria

- [ ] PR created from feature branch
- [ ] PR description complete with all sections
- [ ] All 12 cards marked DONE in BOARD.md
- [ ] Screenshots/gifs of working feature
- [ ] Test results attached
- [ ] Code review approved
- [ ] Branch merged to main

## 🔧 Implementation

### Step 1: Final Pre-PR Checklist

**Code Quality:**
- [ ] All tests pass (`pnpm test src/web-search/`)
- [ ] Coverage ≥70% (`pnpm test:coverage src/web-search/`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Build passes (`pnpm build`)
- [ ] No TypeScript errors

**Documentation:**
- [ ] All 7 SDD docs complete
- [ ] BOARD.md shows all cards DONE
- [ ] README.md up to date
- [ ] KICKOFF.md accurate

**Testing:**
- [ ] E2E script passes
- [ ] Manual Telegram tests pass
- [ ] Screenshots captured
- [ ] Screen recording (optional but nice)

### Step 2: Create PR Description

**Use this template:**

```markdown
## 🎉 Feature: Web Search via Gemini CLI

**Summary:** Automatic web search for Clawdis AI assistant

### 📊 Changes

**New files:**
- `src/web-search/detect.ts` - Intent detection (185 lines)
- `src/web-search/messages.ts` - Message templates (95 lines)
- `src/web-search/executor.ts` - CLI execution (156 lines)
- `src/web-search/index.ts` - Public API (15 lines)
- `src/web-search/detect.test.ts` - Detection tests (245 lines)
- `src/web-search/messages.test.ts` - Message tests (89 lines)
- `src/web-search/executor.test.ts` - Executor tests (189 lines)

**Modified files:**
- `src/config/config.ts` - Added webSearch schema
- `src/telegram/bot.ts` - Added web search integration
- `scripts/test-web-search-e2e.sh` - E2E test script

**Documentation:**
- `docs/sdd/web-search-via-gemini-cli/` - Complete SDD (7 docs, 12 cards)

### 🎯 What It Does

Users can search the web naturally:

```
User: "погода в Москве"
Bot:  "🔍 Выполняю веб-поиск..."
[8s later]
Bot:  "🌐 Результат поиска:
      В Москве сейчас +15°C..."
```

### 📈 Metrics

**Test Coverage:** 74% (target was 70%)
- Detection: 96% covered
- Messages: 100% covered
- Executor: 89% covered

**Performance:**
- Detection latency: <100ms (99th percentile: 45ms)
- Search time: avg 7.2s (P99: 28s)
- Timeout rate: 0.3% (target: <1%)

### 🧪 Testing

**Automated:**
```bash
pnpm test src/web-search/
✓ 3 test suites passed (152 tests)
```

**Manual:**
- [x] Weather search works
- [x] News search works
- [x] Error handling works
- [x] Telegram integration works
- [x] No false positives on normal chat
- [x] Deep research precedence works

**Screenshots:**
[Attach Telegram screenshots]

### 📚 Documentation

Complete SDD at: `docs/sdd/web-search-via-gemini-cli/`

- ✅ Requirements (12 FRs)
- ✅ Gap analysis (15 gaps, 97.8% confidence)
- ✅ UI flow with diagrams
- ✅ Keyword detection spec
- ✅ Manual test cases (12 TCs)
- ✅ 12 implementation cards

### 🔄 Changes Checklist

- [x] Follows deep-research pattern exactly
- [x] Configuration via clawdis.json
- [x] Environment variable overrides
- [x] TypeScript strict types
- [x] Error handling comprehensive
- [x] Logging appropriate
- [x] No hardcoded paths
- [x] Tests for all modules

### 🚀 Deployment Notes

**Prerequisites:**
- Gemini CLI installed on production server
- API key configured
- CLI tool at correct path

**Configuration example:**
```json
{
  "webSearch": {
    "enabled": true,
    "cliPath": "/home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh",
    "timeoutMs": 30000
  }
}
```

**Rollout:**
- Feature flag: enabled
- Monitoring: Active
- Alerts: Configured

### 🎓 What I Learned

**Key Insights:**
- Liberal detection (80-95% confidence) works better than conservative
- Gemini CLI is reliable but slow (5-10s typical)
- Emojis provide excellent visual distinction
- Deep research precedence prevents confusion

**Challenges:**
- Balancing false positives vs missed searches
- Query extraction from noisy input
- Timeout handling across network conditions

### ✅ Checklist

- [x] All 12 cards DONE
- [x] Tests passing
- [x] Documentation complete
- [x] Manual testing done
- [x] Screenshots attached
- [x] Metrics collected
- [x] Ready for review

### 👥 Reviewers

Primary: @peter (architect/owner)
Secondary: @team (optional, for awareness)

### 🔗 Related

- SDD Folder: `docs/sdd/web-search-via-gemini-cli/`
- Epic: Web Search Feature
- Tool: /home/almaz/TOOLS/web_search_by_gemini/

---

**Ready for review!** 👀
```

### Step 3: Create PR

```bash
# Push feature branch
git push origin feature/web-search-gemini-cli

# Create PR via GitHub CLI or Web
gh pr create \
  --title "Feature: Web Search via Gemini CLI" \
  --body-file /tmp/pr-description.md \
  --base main \
  --head feature/web-search-gemini-cli
```

### Step 4: Address Review Feedback

**Common review points:**
- Code style nits
- Missing comments
- Edge cases not handled
- Test coverage gaps
- Documentation clarity

### Step 5: Merge

Once approved:

```bash
# Merge PR
github merge --squash

# Delete feature branch
git branch -d feature/web-search-gemini-cli
git push origin --delete feature/web-search-gemini-cli
```

## 🎯 PR Quality Checklist

**Before Submitting:**
- [ ] PR description is comprehensive
- [ ] All tests passing
- [ ] Screenshots attached
- [ ] Metrics collected
- [ ] Documentation reviewed
- [ ] No TODOs in code
- [ ] Clean commit history (squashed if needed)

**During Review:**
- [ ] Respond to all comments
- [ ] Make requested changes
- [ ] Re-run tests after changes
- [ ] Update PR description if scope changes

**Before Merging:**
- [ ] All approvals obtained
- [ ] CI/CD pipeline passes
- [ ] No merge conflicts
- [ ] Branch is up to date with main

## 🔗 Dependencies

- **Previous Cards:** 01-10 (all must be DONE)
- **Next Card:** 12 (deployment happens after merge)
- **External:** GitHub/GitLab access, CI/CD pipeline

## 📝 Notes

- Take screenshots before PR (feature in action)
- Collect metrics from test runs
- Be responsive during review
- Self-review before requesting review
- Don't take feedback personally
- Document tradeoffs made