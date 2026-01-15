#!/bin/bash
# =============================================================================
# Version Bump Script
# Updates version numbers across all files in the project
# 
# Usage:
#   ./scripts/bump-version.sh <new_version>
#   ./scripts/bump-version.sh 1.0.3
#
# Files updated:
#   - electron-app/package.json
#   - docs/script.js
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory (to find project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide a version number${NC}"
    echo ""
    echo "Usage: $0 <new_version>"
    echo "Example: $0 1.0.3"
    echo ""
    
    # Show current version
    CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$PROJECT_ROOT/electron-app/package.json" | cut -d'"' -f4)
    echo -e "Current version: ${BLUE}$CURRENT_VERSION${NC}"
    exit 1
fi

NEW_VERSION="$1"

# Validate version format (semver: X.Y.Z or X.Y.Z-suffix)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    echo -e "${RED}Error: Invalid version format '$NEW_VERSION'${NC}"
    echo "Version must be in semver format: X.Y.Z or X.Y.Z-suffix"
    echo "Examples: 1.0.3, 2.0.0, 1.0.0-beta.1"
    exit 1
fi

# Get current version
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$PROJECT_ROOT/electron-app/package.json" | cut -d'"' -f4)

echo ""
echo -e "${BLUE}=== Semester Scheduler Version Bump ===${NC}"
echo ""
echo -e "Current version: ${YELLOW}$CURRENT_VERSION${NC}"
echo -e "New version:     ${GREEN}$NEW_VERSION${NC}"
echo ""

# Confirm the update
if [ -t 0 ]; then
    read -p "Proceed with version update? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

echo ""
echo "Updating version in all files..."

# Function to update file and report
update_file() {
    local file="$1"
    local pattern="$2"
    local replacement="$3"
    
    if [ -f "$file" ]; then
        # Use different sed syntax based on OS
        # macOS sed requires -E for extended regex, Linux uses -r
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' -E "$pattern" "$file"
        else
            sed -i -E "$pattern" "$file"
        fi
        echo -e "  ${GREEN}✓${NC} Updated: ${file#$PROJECT_ROOT/}"
    else
        echo -e "  ${YELLOW}⚠${NC} File not found: ${file#$PROJECT_ROOT/}"
    fi
}

# 1. Update electron-app/package.json
update_file "$PROJECT_ROOT/electron-app/package.json" \
    "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" \
    "version field"

# 2. Update docs/script.js (the @version tag in JSDoc comment)
# Pattern uses extended regex: [0-9]+ matches one or more digits
update_file "$PROJECT_ROOT/docs/script.js" \
    "s/@version [0-9]+\.[0-9]+\.[0-9]+[^ ]*/@version $NEW_VERSION/" \
    "@version JSDoc"

# 3. Update electron-builder.yml copyright year (optional)
CURRENT_YEAR=$(date +%Y)
update_file "$PROJECT_ROOT/electron-app/electron-builder.yml" \
    "s/copyright: Copyright © [0-9]*/copyright: Copyright © $CURRENT_YEAR/" \
    "copyright year"

echo ""
echo -e "${GREEN}=== Version Update Complete ===${NC}"
echo ""

# Verify updates
echo "Verifying updates:"
echo ""

# Check electron-app/package.json
PACKAGE_VERSION=$(grep -o '"version": "[^"]*"' "$PROJECT_ROOT/electron-app/package.json" | cut -d'"' -f4)
if [ "$PACKAGE_VERSION" == "$NEW_VERSION" ]; then
    echo -e "  ${GREEN}✓${NC} electron-app/package.json: $PACKAGE_VERSION"
else
    echo -e "  ${RED}✗${NC} electron-app/package.json: $PACKAGE_VERSION (expected $NEW_VERSION)"
fi

# Check docs/script.js
SCRIPT_VERSION=$(grep -o '@version [0-9.]*' "$PROJECT_ROOT/docs/script.js" | cut -d' ' -f2)
if [ "$SCRIPT_VERSION" == "$NEW_VERSION" ]; then
    echo -e "  ${GREEN}✓${NC} docs/script.js: $SCRIPT_VERSION"
else
    echo -e "  ${RED}✗${NC} docs/script.js: $SCRIPT_VERSION (expected $NEW_VERSION)"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Review the changes: git diff"
echo "  2. Commit: git add -A && git commit -m \"Bump version to $NEW_VERSION\""
echo "  3. Tag the release: git tag v$NEW_VERSION"
echo "  4. Push: git push && git push origin v$NEW_VERSION"
echo ""
