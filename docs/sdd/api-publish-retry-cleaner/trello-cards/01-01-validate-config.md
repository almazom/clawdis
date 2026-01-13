# 🎯 Card 01: Validate Project Configuration

**Priority:** 🔴 Critical  | **Type:** Setup  | **Est. Time:** 15 minutes

**Card Goal:** Verify the development environment is ready and all tools are accessible.

---

## 📋 Checklist

### Environment Setup
- [ ] Verify Python 3 is available
- [ ] Verify `publish_to_web` tool exists
- [ ] Verify virtual environment can be activated
- [ ] Verify all required env vars are set

### File Access
- [ ] Confirm `/home/almaz/TOOLS/publish_to_web/` directory exists
- [ ] Confirm `md_2_web.sh` is executable
- [ ] Confirm `src/publish_to_web/cli.py` exists and is readable
- [ ] Confirm preprocessing script exists

### Test Prerequisites
- [ ] Confirm can create test files in `/tmp`
- [ ] Confirm can run CLI tool

---

## 🎯 Tasks

### 1. Verify Python Environment

```bash
cd /home/almaz/TOOLS/publish_to_web

# Check Python version
python3 --version  # Should be 3.8+

# Check virtualenv
if [[ -d .venv ]]; then
    source .venv/bin/activate
    echo "Virtualenv activated"
else
    echo "Virtualenv not found - will use system Python"
fi
```

**Expected Output:** Python 3.x version displayed

### 2. Verify Tool Files

```bash
# Check directory structure
ls -la /home/almaz/TOOLS/publish_to_web/

# Verify key files
[[ -f md_2_web.sh ]] && echo "✓ CLI wrapper exists"
[[ -f src/publish_to_web/cli.py ]] && echo "✓ CLI module exists"
[[ -f src/publish_to_web/telegraph_publisher.py ]] && echo "✓ Telegraph module exists"
[[ -f src/publish_to_web/publisher.py ]] && echo "✓ Simplenote module exists"
```

**Expected Output:** All files marked with ✓

### 3. Check Environment Variables

```bash
# Check required env vars
if [[ -n "${SIMPLENOTE_EMAIL:-}" ]]; then
    echo "✓ SIMPLENOTE_EMAIL is set"
else
    echo "⚠ SIMPLENOTE_EMAIL not set (will be needed for testing)"
fi

if [[ -n "${TELEGRAPH_ACCESS_TOKEN:-}" ]]; then
    echo "✓ TELEGRAPH_ACCESS_TOKEN is set"
else
    echo "⚠ TELEGRAPH_ACCESS_TOKEN not set (will be needed for testing)"
fi
```

**Expected Output:** Check which variables are set

### 4. Test Basic CLI Execution

```bash
# Try running help (should work even without auth)
./md_2_web.sh --help

# Try help-index (JSON output)
./md_2_web.sh --help-index | python3 -m json.tool | head -20
```

**Expected Output:** Help text and JSON structure displayed

---

## 🎯 Success Criteria

- [ ] All required files are accessible
- [ ] Python environment is working
- [ ] CLI tool can be invoked
- [ ] Directory structure is understood
- [ ] Ready to proceed to Card 02

---

## 📚 Documentation to Review

- `/home/almaz/TOOLS/publish_to_web/md_2_web.sh` (CLI wrapper)
- `/home/almaz/TOOLS/publish_to_web/src/publish_to_web/cli.py` (main logic)
- SDD docs: `docs/sdd/api-publish-retry-cleaner/requirements.md`

---

## 🚨 Troubleshooting

**Problem:** "Command not found" for `./md_2_web.sh`

**Solution:**
```bash
cd /home/almaz/TOOLS/publish_to_web
chmod +x md_2_web.sh
./md_2_web.sh --help
```

---

**Problem:** Python imports fail

**Solution:**
```bash
export PYTHONPATH="/home/almaz/TOOLS/publish_to_web/src:$PYTHONPATH"
```

---

**Next Card:** 📖 Card 02 - Understand CLI Structure