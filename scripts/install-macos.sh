#!/bin/bash
# Install Scheduler app on macOS
# Usage: ./scripts/install-macos.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ELECTRON_APP="$PROJECT_ROOT/electron-app"

echo "🚀 Building Scheduler for macOS..."

# Navigate to electron-app
cd "$ELECTRON_APP"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Bundle standalone Python with all dependencies
echo "🐍 Bundling Python environment..."
if [ ! -d "python-bundle/python" ]; then
    chmod +x scripts/bundle-python.sh
    npm run bundle-python
else
    echo "   Python bundle already exists, skipping..."
fi

# Build the app
echo "🔨 Building application..."
npm run build

# Package for macOS
echo "📦 Packaging for macOS..."
npm run package:mac

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    APP_PATH="$ELECTRON_APP/release/mac-arm64/Scheduler.app"
    DMG_PATH=$(find "$ELECTRON_APP/release" -maxdepth 1 -name "*-arm64.dmg" -type f | head -1)
    echo "✅ Detected Apple Silicon (arm64)"
else
    APP_PATH="$ELECTRON_APP/release/mac-x64/Scheduler.app"
    DMG_PATH=$(find "$ELECTRON_APP/release" -maxdepth 1 -name "*-x64.dmg" -type f | head -1)
    echo "✅ Detected Intel (x64)"
fi

# Check if build succeeded
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Build failed: $APP_PATH not found"
    exit 1
fi

echo ""
echo "✅ Build complete!"
echo ""
echo "📂 Output files:"
echo "   App:  $APP_PATH"
if [ -n "$DMG_PATH" ]; then
    echo "   DMG:  $DMG_PATH"
fi
echo ""
echo "📦 This is a self-contained app - no Python installation required!"
echo ""

# Ask to install
read -p "Would you like to install to /Applications? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Remove old installation
    if [ -d "/Applications/Scheduler.app" ]; then
        echo "🗑️  Removing old installation..."
        rm -rf "/Applications/Scheduler.app"
    fi

    # Copy to Applications
    echo "📂 Installing to /Applications..."
    cp -R "$APP_PATH" /Applications/

    # Clear quarantine attribute
    xattr -cr /Applications/Scheduler.app 2>/dev/null || true

    echo ""
    echo "✅ Scheduler has been installed to /Applications/Scheduler.app"
    echo "🎉 You can now open it from Finder or Spotlight!"
fi
