#!/bin/bash
# Install Scheduler app on Linux
# Usage: ./scripts/install-linux.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ELECTRON_APP="$PROJECT_ROOT/electron-app"

echo "🚀 Building Scheduler for Linux..."

# Navigate to electron-app
cd "$ELECTRON_APP"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the app
echo "🔨 Building application..."
npm run build

# Package for Linux
echo "📦 Packaging for Linux..."
npm run package

# Find the AppImage
APPIMAGE=$(find release -maxdepth 1 -name "Scheduler-*.AppImage" -type f | head -1)
DEB=$(find release -maxdepth 1 -name "scheduler_*.deb" -type f | head -1)

echo ""
echo "✅ Build complete!" 
echo ""
echo "📂 Output files:"

if [ -n "$APPIMAGE" ]; then
    echo "   AppImage: $APPIMAGE"
    chmod +x "$APPIMAGE"
fi

if [ -n "$DEB" ]; then
    echo "   .deb:     $DEB"
fi

echo "   Portable: $ELECTRON_APP/release/linux-unpacked/"
echo ""

# Installation options
echo "📦 Installation options:"
echo ""

if [ -n "$APPIMAGE" ]; then
    echo "1. Run AppImage directly:"
    echo "   $APPIMAGE"
    echo ""
    echo "2. Install AppImage to ~/Applications:"
    echo "   mkdir -p ~/Applications"
    echo "   cp $APPIMAGE ~/Applications/"
    echo ""
fi

if [ -n "$DEB" ]; then
    echo "3. Install .deb package (Debian/Ubuntu):"
    echo "   sudo dpkg -i $DEB"
    echo ""
fi

# Ask to install
read -p "Would you like to install the AppImage to ~/Applications? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    mkdir -p ~/Applications
    cp "$APPIMAGE" ~/Applications/
    echo "✅ Installed to ~/Applications/"
    echo "🎉 You can run it with: ~/Applications/$(basename "$APPIMAGE")"
fi

echo ""
echo "🎉 Done!"
