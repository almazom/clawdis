#!/bin/bash

################################################################################
# Bug Fix SDD Generator - Main Entry Point
#
# Usage: ./generate-bug-fix.sh --bug-report <file> [--output <dir>] [--dry-run]
################################################################################

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

SCRIPT_DIR="$(dirname "$0")"
BUG_REPORT_FILE=""
CUSTOM_OUTPUT_DIR=""
DRY_RUN=false
VALIDATE=false

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1" >&2; }
log_success() { echo -e "${GREEN}[OK]${NC} $1" >&2; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

usage() {
    cat << 'EOF'
Bug Fix SDD Generator

Generates bug fix documentation and Trello cards from bug reports.

USAGE:
    ./generate-bug-fix.sh --bug-report <file> [OPTIONS]

OPTIONS:
    --bug-report <file>     Path to bug report file (required)
    --output <dir>          Custom output directory (optional)
    --dry-run               Show what would be done without creating files
    --validate              Run quality validation after generation
    --help, -h              Show this help message

EXAMPLES:
    # Basic generation
    ./generate-bug-fix.sh --bug-report bugs/login-crash.md

    # With validation
    ./generate-bug-fix.sh --bug-report bugs/login-crash.md --validate

    # Custom output
    ./generate-bug-fix.sh --bug-report bugs/login-crash.md --output ./my-fix/

    # Dry run
    ./generate-bug-fix.sh --bug-report bugs/login-crash.md --dry-run

OUTPUT:
    docs/sdd/bug-fix-{bug-id}/
    ├── README.md
    ├── bug-report.md
    ├── reproduction-case.md
    ├── root-cause-analysis.md
    ├── fix-strategy.md
    ├── fix-verification.md
    └── trello-cards/
        ├── 00_EXECUTE_HERE.md       # ⭐ ENTRY POINT
        ├── BOARD.md
        ├── state.json
        ├── smart_commit.sh           # Copied locally
        ├── auto-commit-daemon.sh     # Copied locally
        ├── AGENT_PROTOCOL.md
        ├── 01-regression-test.md
        ├── 02-implement-fix.md
        └── 03-verify-fix.md
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --bug-report)
            BUG_REPORT_FILE="$2"
            shift 2
            ;;
        --output)
            CUSTOM_OUTPUT_DIR="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --validate)
            VALIDATE=true
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate inputs
validate_inputs() {
    if [ -z "$BUG_REPORT_FILE" ]; then
        log_error "--bug-report <file> is required"
        usage
        exit 1
    fi

    if [ ! -f "$BUG_REPORT_FILE" ]; then
        log_error "Bug report file not found: $BUG_REPORT_FILE"
        exit 1
    fi

    log_success "Bug report validated: $BUG_REPORT_FILE"
}

# Extract bug ID from report
extract_bug_id() {
    local file="$1"

    # Try to find BUG-YYYY-MM-DD-NNN pattern
    local bug_id=$(grep -oE "BUG-[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{3}" "$file" | head -1)

    if [ -z "$bug_id" ]; then
        # Generate new bug ID
        bug_id="BUG-$(date +%Y-%m-%d)-001"
        log_warning "No bug ID found, generating: $bug_id"
    else
        log_success "Found bug ID: $bug_id"
    fi

    echo "$bug_id"
}

# Extract summary
extract_summary() {
    local file="$1"

    # Try different patterns
    local summary=""

    # Pattern 1: ## Summary section
    summary=$(grep -A 1 "^## Summary" "$file" 2>/dev/null | tail -1 | sed 's/^[[:space:]]*//')

    # Pattern 2: First heading
    if [ -z "$summary" ]; then
        summary=$(grep -E "^#+ " "$file" | head -1 | sed 's/^#* //')
    fi

    # Pattern 3: First non-empty line
    if [ -z "$summary" ]; then
        summary=$(grep -v '^$' "$file" | head -1)
    fi

    echo "$summary"
}

# Generate output directory
generate_output_dir() {
    local bug_id="$1"
    echo "docs/sdd/bug-fix-$bug_id"
}

# Main function
main() {
    log_info "Starting Bug Fix SDD Generation"
    echo "=================================="
    echo ""

    # Validate inputs
    validate_inputs

    # Extract bug info
    BUG_ID=$(extract_bug_id "$BUG_REPORT_FILE")
    SUMMARY=$(extract_summary "$BUG_REPORT_FILE")

    log_success "Bug ID: $BUG_ID"
    log_info "Summary: $SUMMARY"

    # Determine output directory
    if [ -n "$CUSTOM_OUTPUT_DIR" ]; then
        OUTPUT_DIR="$CUSTOM_OUTPUT_DIR"
        log_info "Using custom output: $OUTPUT_DIR"
    else
        OUTPUT_DIR=$(generate_output_dir "$BUG_ID")
        log_info "Generated output: $OUTPUT_DIR"
    fi

    # Dry run check
    if [ "$DRY_RUN" = true ]; then
        echo ""
        echo -e "${YELLOW}═══════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}  DRY RUN MODE - NO FILES WILL BE CREATED              ║${NC}"
        echo -e "${YELLOW}═══════════════════════════════════════════════════════╝${NC}"
        echo ""
        log_info "Would create:"
        echo "  - $OUTPUT_DIR/README.md"
        echo "  - $OUTPUT_DIR/bug-report.md"
        echo "  - $OUTPUT_DIR/reproduction-case.md"
        echo "  - $OUTPUT_DIR/root-cause-analysis.md"
        echo "  - $OUTPUT_DIR/fix-strategy.md"
        echo "  - $OUTPUT_DIR/fix-verification.md"
        echo "  - $OUTPUT_DIR/trello-cards/00_EXECUTE_HERE.md"
        echo "  - $OUTPUT_DIR/trello-cards/BOARD.md"
        echo "  - $OUTPUT_DIR/trello-cards/state.json"
        echo "  - $OUTPUT_DIR/trello-cards/01-regression-test.md"
        echo "  - $OUTPUT_DIR/trello-cards/02-implement-fix.md"
        echo "  - $OUTPUT_DIR/trello-cards/03-verify-fix.md"
        echo "  - $OUTPUT_DIR/trello-cards/smart_commit.sh"
        echo "  - $OUTPUT_DIR/trello-cards/auto-commit-daemon.sh"
        echo "  - $OUTPUT_DIR/trello-cards/update-state.sh"
        echo "  - $OUTPUT_DIR/trello-cards/AGENT_PROTOCOL.md"
        echo ""
        log_success "Dry run complete"
        exit 0
    fi

    # Create directories
    log_info "Creating directory structure..."
    mkdir -p "$OUTPUT_DIR/trello-cards"
    log_success "Directories created"

    # Copy bug report
    cp "$BUG_REPORT_FILE" "$OUTPUT_DIR/bug-report.md"
    log_success "Bug report copied"

    # Copy and process templates
    log_info "Processing templates..."

    # Function to replace placeholders
    replace_placeholders() {
        local file="$1"
        local date=$(date +%Y-%m-%d)
        local time=$(date +%H:%M:%S)

        sed -i "s/{BUG_ID}/$BUG_ID/g" "$file"
        sed -i "s|{SUMMARY}|$SUMMARY|g" "$file"
        sed -i "s/{DATE}/$date/g" "$file"
        sed -i "s/{TIME}/$time/g" "$file"
        sed -i "s/{STATUS}/PENDING/g" "$file"
        sed -i "s/{SEVERITY}/P2-MEDIUM/g" "$file"
        sed -i "s/{CARD_COUNT}/3/g" "$file"
        sed -i "s/{TOTAL_SP}/6/g" "$file"
    }

    # Copy main templates
    for template in "$SCRIPT_DIR/TEMPLATES/"*.template.md; do
        if [ -f "$template" ]; then
            filename=$(basename "$template" .template.md)
            cp "$template" "$OUTPUT_DIR/$filename.md"
            replace_placeholders "$OUTPUT_DIR/$filename.md"
        fi
    done

    # Copy Trello templates
    for template in "$SCRIPT_DIR/TRELLO_TEMPLATES/"*.template.md; do
        if [ -f "$template" ]; then
            filename=$(basename "$template" .template.md)
            cp "$template" "$OUTPUT_DIR/trello-cards/$filename.md"
            replace_placeholders "$OUTPUT_DIR/trello-cards/$filename.md"
        fi
    done

    # Handle state.json specially
    if [ -f "$SCRIPT_DIR/TRELLO_TEMPLATES/state.json.template" ]; then
        cp "$SCRIPT_DIR/TRELLO_TEMPLATES/state.json.template" "$OUTPUT_DIR/trello-cards/state.json"
        replace_placeholders "$OUTPUT_DIR/trello-cards/state.json"
    fi

    # Rename card templates
    if [ -f "$OUTPUT_DIR/trello-cards/card-01-regression-test.md" ]; then
        mv "$OUTPUT_DIR/trello-cards/card-01-regression-test.md" "$OUTPUT_DIR/trello-cards/01-regression-test.md"
    fi
    if [ -f "$OUTPUT_DIR/trello-cards/card-02-implement-fix.md" ]; then
        mv "$OUTPUT_DIR/trello-cards/card-02-implement-fix.md" "$OUTPUT_DIR/trello-cards/02-implement-fix.md"
    fi
    if [ -f "$OUTPUT_DIR/trello-cards/card-03-verify-fix.md" ]; then
        mv "$OUTPUT_DIR/trello-cards/card-03-verify-fix.md" "$OUTPUT_DIR/trello-cards/03-verify-fix.md"
    fi

    log_success "Templates processed"

    # Copy scripts to package (for local execution)
    log_info "Copying scripts to package..."
    if [ -f "$SCRIPT_DIR/smart_commit.sh" ]; then
        cp "$SCRIPT_DIR/smart_commit.sh" "$OUTPUT_DIR/trello-cards/"
        chmod +x "$OUTPUT_DIR/trello-cards/smart_commit.sh"
        log_success "Copied smart_commit.sh"
    else
        log_warning "smart_commit.sh not found in flow root"
    fi

    if [ -f "$SCRIPT_DIR/auto-commit-daemon.sh" ]; then
        cp "$SCRIPT_DIR/auto-commit-daemon.sh" "$OUTPUT_DIR/trello-cards/"
        chmod +x "$OUTPUT_DIR/trello-cards/auto-commit-daemon.sh"
        log_success "Copied auto-commit-daemon.sh"
    else
        log_warning "auto-commit-daemon.sh not found in flow root"
    fi

    if [ -f "$SCRIPT_DIR/update-state.sh" ]; then
        cp "$SCRIPT_DIR/update-state.sh" "$OUTPUT_DIR/trello-cards/"
        chmod +x "$OUTPUT_DIR/trello-cards/update-state.sh"
        log_success "Copied update-state.sh"
    else
        log_warning "update-state.sh not found in flow root"
    fi

    if [ -f "$SCRIPT_DIR/AGENT_PROTOCOL.md" ]; then
        cp "$SCRIPT_DIR/AGENT_PROTOCOL.md" "$OUTPUT_DIR/trello-cards/"
        log_success "Copied AGENT_PROTOCOL.md"
    else
        log_warning "AGENT_PROTOCOL.md not found in flow root"
    fi

    # Create metadata
    cat > "$OUTPUT_DIR/bug-fix-metadata.json" << EOF
{
  "generated_at": "$(date -Iseconds)",
  "bug_id": "$BUG_ID",
  "summary": "$SUMMARY",
  "bug_report_file": "$(basename "$BUG_REPORT_FILE")",
  "output_directory": "$OUTPUT_DIR",
  "card_count": 3,
  "total_sp": 6,
  "status": "pending",
  "tdd_method": true
}
EOF
    log_success "Metadata created"

    # Validation
    if [ "$VALIDATE" = true ]; then
        log_info "Running validation..."
        if [ -x "$SCRIPT_DIR/validate-bug-fix-sdd.sh" ]; then
            "$SCRIPT_DIR/validate-bug-fix-sdd.sh" "$OUTPUT_DIR"
        else
            log_warning "Validator not found, skipping"
        fi
    fi

    echo ""
    log_success "Bug Fix SDD generated successfully!"
    echo ""
    echo -e "${BLUE}Output:${NC} $OUTPUT_DIR"
    echo ""
    echo -e "${GREEN}🚀 EXECUTION STARTS HERE:${NC}"
    echo "  cd $OUTPUT_DIR/trello-cards"
    echo "  cat 00_EXECUTE_HERE.md"
    echo ""
    echo -e "${BLUE}📋 Package Contents:${NC}"
    echo "  - 00_EXECUTE_HERE.md     # ⭐ AGENT ENTRY POINT"
    echo "  - smart_commit.sh         # Auto-commit tool"
    echo "  - auto-commit-daemon.sh   # Background commits"
    echo "  - 01-regression-test.md   # TDD RED"
    echo "  - 02-implement-fix.md     # TDD GREEN"
    echo "  - 03-verify-fix.md        # TDD VERIFY"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. cd $OUTPUT_DIR/trello-cards"
    echo "  2. Read 00_EXECUTE_HERE.md"
    echo "  3. Start auto-commit daemon"
    echo "  4. Execute cards 01 → 02 → 03"
    echo "  5. Run create-pr.sh to create PR"
}

# Banner
echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║               🐛 BUG FIX SDD GENERATOR 🐛                    ║${NC}"
echo -e "${RED}║          Transform Bug Reports → Verified Fixes             ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Run
main
