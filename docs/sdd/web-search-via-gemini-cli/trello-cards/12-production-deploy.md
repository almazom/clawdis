# Card 12: Production Deployment

**Story Points:** 1 | **Priority:** P2 | **Owner:** Human (Peter)

## 📋 Description

Deploy the web search feature to production environment, enable monitoring, and verify real-world performance.

## ✅ Acceptance Criteria

- [ ] Feature merged to main branch
- [ ] Deployed to production server
- [ ] Configuration updated (enabled=true)
- [ ] Monitoring dashboard shows search metrics
- [ ] Alerting configured for high error rate
- [ ] Documentation updated (changelog, wiki)
- [ ] Post-deployment verification complete

## 🔧 Implementation Steps

### Step 1: Pre-Deployment Checklist

- [ ] All 11 previous cards marked DONE
- [ ] E2E tests passing
- [ ] Manual Telegram testing successful
- [ ] Code review comments addressed
- [ ] PR approved

### Step 2: Merge to Main

```bash
git checkout main
git pull origin main
git merge --no-ff feature/web-search-gemini-cli

# Run final verification
pnpm install
pnpm build
pnpm test src/web-search/

# Push to main
git push origin main
```

### Step 3: Deploy to Production

```bash
# SSH to production server
ssh production-server

# Pull latest code
cd /opt/clawdis
git pull origin main

# Install dependencies
pnpm install --prod

# Build
cd /opt/clawdis && pnpm build

# Restart services
sudo systemctl restart clawdis-gateway
sudo systemctl restart clawdis-telegram
```

### Step 4: Configuration

**On production server, edit clawdis.json:**

Add webSearch config with enabled true.

**Verify CLI tool:**
```bash
ls -la /home/almaz/TOOLS/web_search_by_gemini/web-search-by-Gemini.sh
which gemini
gemini --version
```

### Step 5: Monitoring & Alerting

**Set up metrics:**
- Track web search requests
- Track success rate
- Track error rate
- Track timeout rate
- Track P99 latency

**Dashboard queries:**
- Success rate percentage
- Error rate (should be <2%)
- Average response time (should be <10s)
- Timeout rate (should be <1%)

**Alerts:**
- Error rate >5%
- Timeout rate >1%
- P99 latency >30s

### Step 6: Post-Deployment Verification

**Manual Test:**
1. Send "погода в Москве" → Should get 🌐 weather result
2. Send "погугли новости" → Should get 🌐 news result
3. Send "привет" → Should get normal chat (no search)

**Check logs:**
```bash
# Watch for errors
tail -f logs/clawdis.log | grep ERROR

# Watch for timeouts
tail -f logs/clawdis.log | grep timeout
```

### Step 7: Documentation

**Update:**
- [ ] CHANGELOG.md (add feature entry)
- [ ] README.md (add feature description)
- [ ] Team wiki (announce new feature)

**Announce to users:**

New Web Search Feature Available!

You can now ask for current information:
- "погода в Москве"
- "последние новости"
- "курс доллара"
- Or just "погугли [topic]"

Results marked with 🌐 emoji!

## 🎯 Verification Checklist

- [ ] Feature flag enabled in production
- [ ] CLI tool accessible from production server
- [ ] API key configured
- [ ] No errors in first hour of deployment
- [ ] Success rate >95% in first day
- [ ] Monitoring dashboard active
- [ ] Alerts configured and tested
- [ ] Team notified of deployment
- [ ] Users informed of new feature
- [ ] Documentation updated

## 🔗 Dependencies

- **Previous Cards:** 01-11 (all must be DONE)
- **External:**
  - Production server access
  - Monitoring system
  - Alerting system

## 📝 Notes

- Deploy during low-traffic window
- Have rollback plan ready
- Monitor closely for first 24 hours
- Collect user feedback
- Tune detection threshold based on usage