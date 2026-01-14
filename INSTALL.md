# Installation Guide

This guide explains how to build and install the Scheduler app on macOS, Windows, and Linux.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Python](https://www.python.org/) 3.10 or higher
- npm (comes with Node.js)

## Quick Install (Automated)

### macOS (Intel & Apple Silicon)

```bash
./scripts/install-macos.sh
```

### Windows

```powershell
.\scripts\install-windows.ps1
```

### Linux

```bash
./scripts/install-linux.sh
```

---

## Manual Installation

### Step 1: Install Dependencies

```bash
cd electron-app
npm install
```

### Step 2: Build the App

```bash
npm run build
```

### Step 3: Package for Your Platform

```bash
npm run package
```

This creates platform-specific builds in the `electron-app/release/` directory.

---

## Platform-Specific Details

### macOS

**Output files:**
- `release/mac-arm64/Scheduler.app` (Apple Silicon)
- `release/mac-x64/Scheduler.app` (Intel)
- `release/Scheduler-{version}-arm64.dmg`
- `release/Scheduler-{version}-x64.dmg`

**Install to Applications:**
```bash
cp -R release/mac-arm64/Scheduler.app /Applications/
# or for Intel Macs:
cp -R release/mac-x64/Scheduler.app /Applications/
```

**Note:** The app is not code-signed. On first launch, you may need to:
1. Right-click the app → Open
2. Click "Open" in the security dialog

### Windows

**Output files:**
- `release/Scheduler Setup {version}.exe` (installer)
- `release/win-unpacked/` (portable version)

**Install:**
- Run the `.exe` installer, or
- Copy `win-unpacked/` folder to your preferred location

### Linux

**Output files:**
- `release/Scheduler-{version}.AppImage`
- `release/scheduler_{version}_amd64.deb` (Debian/Ubuntu)
- `release/linux-unpacked/` (portable version)

**Install AppImage:**
```bash
chmod +x release/Scheduler-*.AppImage
./release/Scheduler-*.AppImage
```

**Install .deb (Debian/Ubuntu):**
```bash
sudo dpkg -i release/scheduler_*_amd64.deb
```

---

## Cross-Platform Building

To build for a different platform, you need to build on that platform. Alternatively, use CI/CD services like GitHub Actions for cross-platform builds.

## Troubleshooting

### "App is damaged" on macOS
Run: `xattr -cr /Applications/Scheduler.app`

### Python not found
Ensure Python 3.10+ is installed and in your PATH.

### Permission denied on Linux
Make the AppImage executable: `chmod +x Scheduler-*.AppImage`
