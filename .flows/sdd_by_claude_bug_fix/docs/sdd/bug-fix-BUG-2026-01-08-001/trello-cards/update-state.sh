#!/bin/bash

################################################################################
# Safe State Update for SDD Bug Fix Flow
#
# Purpose: Safely update state.json with backup and validation
# Replaces brittle jq one-liners with error handling
#
# Usage: update-state.sh <card-id> <status> [options]
# Example: update-state.sh 02 completed
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Defaults
STATE_FILE="state.json"
VERBOSE=false

# Usage
usage() {
    cat << 'EOF'
Safe State Update for SDD Bug Fix Flow

Safely updates state.json with backup and validation to prevent corruption.

USAGE:
    ./update-state.sh <card-id> <status> [options]

ARGUMENTS:
    <card-id>    Card number (01, 02, 03, etc.)
    <status>     Status to set (pending, in_progress, completed)

OPTIONS:
    --state-file <path>  Custom state.json path (default: ./state.json)
    --verbose            Show detailed output
    --help, -h           Show this help

EXAMPLES:
    # Mark card 01 as completed
    ./update-state.sh 01 completed

    # Mark card 02 as in_progress
    ./update-state.sh 02 in_progress

    # Use custom state file
    ./update-state.sh 03 completed --state-file /path/to/state.json

SAFETY FEATURES:
    ✓ Creates backup before updating
    ✓ Validates JSON after update
    ✓ Restores backup on failure
    ✓ Checks file exists before updating
    ✓ Prevents corrupted state files
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --state-file)
            STATE_FILE="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            # Positional arguments
            if [ -z "$CARD_ID" ]; then
                CARD_ID="$1"
            elif [ -z "$STATUS" ]; then
                STATUS="$1"
            else
                echo -e "${RED}Error: Unknown argument: $1${NC}"
                usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [ -z "$CARD_ID" ]; then
    echo -e "${RED}Error: Card ID not specified${NC}"
    usage
    exit 1
fi

if [ -z "$STATUS" ]; then
    echo -e "${RED}Error: Status not specified${NC}"
    usage
    exit 1
fi

# Validate status
VALID_STATUSES="pending in_progress completed"
if ! echo "$VALID_STATUSES" | grep -wq "$STATUS"; then
    echo -e "${RED}Error: Invalid status '$STATUS'${NC}"
    echo -e "Valid statuses: $VALID_STATUSES"
    exit 1
fi

# Check if state file exists
if [ ! -f "$STATE_FILE" ]; then
    echo -e "${RED}Error: State file not found: $STATE_FILE${NC}"
    echo -e "Are you in the correct directory (trello-cards)?"
    exit 1
fi

# Function to log verbose messages
log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${YELLOW}→ $1${NC}"
    fi
}

# Function to log success
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to log error
log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Create backup
log_verbose "Creating backup of $STATE_FILE"
if cp "$STATE_FILE" "${STATE_FILE}.backup"; then
    log_verbose "Backup created: ${STATE_FILE}.backup"
else
    log_error "Failed to create backup"
    exit 1
fi

# Update state.json
log_verbose "Updating $STATE_FILE: card $CARD_ID = $STATUS"

# Build jq command based on status
if [ "$STATUS" = "completed" ]; then
    # For completed, add completed_at timestamp and advance current_card
    UPDATE_CMD=".cards[\"$CARD_ID\"].status = \"$STATUS\" | .cards[\"$CARD_ID\"].completed_at = \"$(date -Iseconds)\""
    
    # Advance current_card if this is the current one
    CURRENT_CARD=$(jq -r '.current_card' "$STATE_FILE" 2>/dev/null || echo "01")
    if [ "$CURRENT_CARD" = "$CARD_ID" ]; then
        NEXT_CARD_NUM=$((10#$CARD_ID + 1))
        # Format as zero-padded 2-digit number
        if [ $NEXT_CARD_NUM -lt 10 ]; then
            NEXT_CARD_ID="0$NEXT_CARD_NUM"
        else
            NEXT_CARD_ID="$NEXT_CARD_NUM"
        fi
        UPDATE_CMD="$UPDATE_CMD | .current_card = \"$NEXT_CARD_ID\""
    fi
else
    # For other statuses, just update the status
    UPDATE_CMD=".cards[\"$CARD_ID\"].status = \"$STATUS\""
fi

# Apply update to temp file
if jq "$UPDATE_CMD" "$STATE_FILE" > "${STATE_FILE}.tmp" 2>/dev/null; then
    log_verbose "Update applied successfully"
else
    log_error "Failed to apply update"
    log_verbose "Command: jq '$UPDATE_CMD' $STATE_FILE"
    
    # Restore backup
    log_verbose "Restoring backup..."
    cp "${STATE_FILE}.backup" "$STATE_FILE"
    exit 1
fi

# Validate JSON
log_verbose "Validating JSON..."
if jq empty "${STATE_FILE}.tmp" 2>/dev/null; then
    log_verbose "JSON validation passed"
else
    log_error "JSON validation failed - state file would be corrupted"
    
    # Restore backup
    log_verbose "Restoring backup..."
    cp "${STATE_FILE}.backup" "$STATE_FILE"
    rm -f "${STATE_FILE}.tmp"
    exit 1
fi

# All good, replace original
if mv "${STATE_FILE}.tmp" "$STATE_FILE"; then
    log_success "Updated $STATE_FILE: card $CARD_ID = $STATUS"
else
    log_error "Failed to replace $STATE_FILE"
    cp "${STATE_FILE}.backup" "$STATE_FILE"
    exit 1
fi

# Show current state summary
if [ "$VERBOSE" = true ]; then
    echo ""
    log_verbose "Current State Summary:"
    jq -r '.cards | to_entries | sort_by(.key) | .[] | "  Card \(.key): \(.value.status)"' "$STATE_FILE"
fi

# Clean up backup (optional, keep for debug)
# rm -f "${STATE_FILE}.backup"

exit 0
