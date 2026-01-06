#!/bin/bash

################################################################################
# Prerequisites Validation for SDD Bug Fix Flow
#
# Purpose: Verify all required tools and files exist before starting flow
# Fails fast with clear error messages if anything is missing
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Error tracking
ERRORS=0
WARNINGS=0

echo -e "${BLUE}🔍 Checking SDD Bug Fix Prerequisites...${NC}\n"

# Section 1: Required Tools
echo -e "${BLUE}📦 Section 1: Required Tools${NC}"

# Check jq
if command -v jq >/dev/null 2>&1; then
    echo -e "${GREEN}✅ jq${NC} - $(jq --version)"
else
    echo -e "${RED}❌ jq not found${NC}"
    echo -e "   Install: sudo apt-get install jq  # Ubuntu/Debian"
    echo -e "   Install: brew install jq          # macOS"
    ERRORS=$((ERRORS + 1))
fi

# Check git
if command -v git >/dev/null 2>&1; then
    echo -e "${GREEN}✅ git${NC} - $(git --version 2>&1 | head -n1)"
else
    echo -e "${RED}❌ git not found${NC}"
    echo -e "   Install: sudo apt-get install git  # Ubuntu/Debian"
    echo -e "   Install: xcode-select --install     # macOS"
    ERRORS=$((ERRORS + 1))
fi

# Check gh (GitHub CLI)
if command -v gh >/dev/null 2>&1; then
    echo -e "${GREEN}✅ gh${NC} - $(gh --version 2>&1 | head -n1)"
    
    # Check if authenticated
    if gh auth status >/dev/null 2>&1; then
        echo -e "${GREEN}✅ gh authenticated${NC}"
    else
        echo -e "${YELLOW}⚠️  gh not authenticated${NC}"
        echo -e "   Run: gh auth login"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ gh CLI not found${NC}"
    echo -e "   Install: sudo apt-get install gh  # Ubuntu/Debian"
    echo -e "   Install: brew install gh          # macOS"
    echo -e "   Install: https://cli.github.com/"
    ERRORS=$((ERRORS + 1))
fi

# Check node/pnpm (optional but recommended)
if command -v pnpm >/dev/null 2>&1; then
    echo -e "${GREEN}✅ pnpm${NC} - $(pnpm --version)"
elif command -v npm >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  npm found (pnpm recommended)${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${YELLOW}⚠️  No Node.js package manager found${NC}"
    echo -e "   Install pnpm: npm install -g pnpm"
    WARNINGS=$((WARNINGS + 1))
fi

# Section 2: Required Templates
echo -e "\n${BLUE}📋 Section 2: Required Templates${NC}"

# Check bug report template
if [ -f "TEMPLATES/bug-report.template.md" ]; then
    echo -e "${GREEN}✅ TEMPLATES/bug-report.template.md${NC}"
else
    echo -e "${RED}❌ TEMPLATES/bug-report.template.md not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check reproduction case template
if [ -f "TEMPLATES/reproduction-case.template.md" ]; then
    echo -e "${GREEN}✅ TEMPLATES/reproduction-case.template.md${NC}"
else
    echo -e "${RED}❌ TEMPLATES/reproduction-case.template.md not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check root cause template
if [ -f "TEMPLATES/root-cause-analysis.template.md" ]; then
    echo -e "${GREEN}✅ TEMPLATES/root-cause-analysis.template.md${NC}"
else
    echo -e "${RED}❌ TEMPLATES/root-cause-analysis.template.md not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check fix strategy template
if [ -f "TEMPLATES/fix-strategy.template.md" ]; then
    echo -e "${GREEN}✅ TEMPLATES/fix-strategy.template.md${NC}"
else
    echo -e "${RED}❌ TEMPLATES/fix-strategy.template.md not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check card templates
if [ -f "TRELLO_TEMPLATES/00_EXECUTE_HERE.template.md" ]; then
    echo -e "${GREEN}✅ TRELLO_TEMPLATES/00_EXECUTE_HERE.template.md${NC}"
else
    echo -e "${RED}❌ TRELLO_TEMPLATES/00_EXECUTE_HERE.template.md not found${NC}"
    echo -e "   Note: This should be renamed from KICKOFF.template.md"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "TRELLO_TEMPLATES/card-01-regression-test.template.md" ]; then
    echo -e "${GREEN}✅ TRELLO_TEMPLATES/card-01-regression-test.template.md${NC}"
else
    echo -e "${RED}❌ TRELLO_TEMPLATES/card-01-regression-test.template.md not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Section 3: Required Scripts
echo -e "\n${BLUE}⚙️  Section 3: Required Scripts${NC}"

# Check generate script
if [ -f "generate-bug-fix.sh" ]; then
    if [ -x "generate-bug-fix.sh" ]; then
        echo -e "${GREEN}✅ generate-bug-fix.sh (executable)${NC}"
    else
        echo -e "${YELLOW}⚠️  generate-bug-fix.sh exists but not executable${NC}"
        echo -e "   Fix: chmod +x generate-bug-fix.sh"
        chmod +x generate-bug-fix.sh
        echo -e "${GREEN}✅ Fixed: Made executable${NC}"
    fi
else
    echo -e "${RED}❌ generate-bug-fix.sh not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check smart commit script
if [ -f "smart_commit.sh" ]; then
    if [ -x "smart_commit.sh" ]; then
        echo -e "${GREEN}✅ smart_commit.sh (executable)${NC}"
    else
        echo -e "${YELLOW}⚠️  smart_commit.sh exists but not executable${NC}"
        chmod +x smart_commit.sh
        echo -e "${GREEN}✅ Fixed: Made executable${NC}"
    fi
else
    echo -e "${RED}❌ smart_commit.sh not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check auto-commit daemon
if [ -f "auto-commit-daemon.sh" ]; then
    if [ -x "auto-commit-daemon.sh" ]; then
        echo -e "${GREEN}✅ auto-commit-daemon.sh (executable)${NC}"
    else
        echo -e "${YELLOW}⚠️  auto-commit-daemon.sh exists but not executable${NC}"
        chmod +x auto-commit-daemon.sh
        echo -e "${GREEN}✅ Fixed: Made executable${NC}"
    fi
else
    echo -e "${RED}❌ auto-commit-daemon.sh not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check validate script (if exists)
if [ -f "validate-sdd.sh" ]; then
    if [ -x "validate-sdd.sh" ]; then
        echo -e "${GREEN}✅ validate-sdd.sh (executable)${NC}"
    else
        echo -e "${YELLOW}⚠️  validate-sdd.sh exists but not executable${NC}"
        chmod +x validate-sdd.sh
        echo -e "${GREEN}✅ Fixed: Made executable${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  validate-sdd.sh not found (optional)${NC}"
fi

# Section 4: Git Repository Check
echo -e "\n${BLUE}📦 Section 4: Git Repository${NC}"

if git rev-parse --git-dir >/dev/null 2>&1; then
    echo -e "${GREEN}✅ In git repository${NC}"
    echo -e "   Branch: $(git rev-parse --abbrev-ref HEAD)"
    
    # Check for uncommitted changes
    if git diff --quiet; then
        echo -e "${GREEN}✅ Working tree clean${NC}"
    else
        echo -e "${YELLOW}⚠️  Uncommitted changes in working tree${NC}"
        echo -e "   Review: git status"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ Not in a git repository${NC}"
    echo -e "   Fix: cd /path/to/your/git/repo"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo -e "\n${BLUE}📊 Summary${NC}"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All prerequisites met! Ready to start.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  All critical prerequisites met, but $WARNINGS warnings found.${NC}"
    echo -e "   You can proceed, but consider fixing warnings."
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS errors and $WARNINGS warnings.${NC}"
    echo -e "\n${RED}Cannot start flow until errors are fixed.${NC}"
    exit 1
fi
