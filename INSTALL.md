# Installation Guide

This guide explains how to build and install the Scheduler app on macOS, Windows, and Linux.

## Key Feature: Self-Contained App

**The Scheduler app bundles its own Python environment** - users don't need to install Python or any dependencies. The app works out of the box on any supported system.

## Prerequisites (For Building Only)

End users don't need anything installed. For developers building the app:

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)
- Internet connection (to download standalone Python during build)

## Quick Install (Automated)

These scripts will build a fully self-contained app with bundled Python.

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

### Step 1: Install Node.js Dependencies

```bash
cd electron-app
npm install
```

### Step 2: Bundle Python Environment

This downloads a standalone Python and installs all required packages:

```bash
# macOS / Linux
npm run bundle-python

# Windows (PowerShell)
npm run bundle-python:win
```

### Step 3: Build and Package

```bash
# Build TypeScript and bundle
npm run build

# Package for your platform
npm run package:mac    # macOS
npm run package:win    # Windows
npm run package:linux  # Linux
```

Or use the combined command:

```bash
npm run dist:mac    # Bundle Python + Build + Package for macOS
npm run dist:win    # Bundle Python + Build + Package for Windows
npm run dist:linux  # Bundle Python + Build + Package for Linux
```

---

## Platform-Specific Details

### macOS

**Output files:**
- `release/mac-arm64/Scheduler.app` (Apple Silicon)
- `release/mac-x64/Scheduler.app` (Intel)
- `release/Scheduler-{version}-arm64.dmg`
- `release/Scheduler-{version}-x64.dmg`

**App Size:** ~430MB (includes bundled Python + dependencies)

**Install to Applications:**
```bash
cp -R release/mac-arm64/Scheduler.app /Applications/
# or for Intel Macs:
cp -R release/mac-x64/Scheduler.app /Applications/
```

**Note:** The app is not code-signed. On first launch, you may need to:
1. Right-click the app → Open
2. Click "Open" in the security dialog

Or run: `xattr -cr /Applications/Scheduler.app`

### Windows

**Output files:**
- `release/Scheduler Setup {version}.exe` (installer)
- `release/Scheduler {version}.exe` (portable)
- `release/win-unpacked/` (portable folder)

**App Size:** ~400MB (includes bundled Python + dependencies)

**Install:**
- Run the `.exe` installer, or
- Use the portable `.exe` directly, or
- Copy `win-unpacked/` folder to your preferred location

### Linux

**Output files:**
- `release/Scheduler-{version}.AppImage`
- `release/scheduler_{version}_amd64.deb` (Debian/Ubuntu)
- `release/linux-unpacked/` (portable version)

**App Size:** ~400MB (includes bundled Python + dependencies)

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

## NPM Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Build TypeScript and renderer |
| `npm run bundle-python` | Download and bundle standalone Python (macOS/Linux) |
| `npm run bundle-python:win` | Download and bundle standalone Python (Windows) |
| `npm run package:mac` | Build + package for macOS |
| `npm run package:win` | Build + package for Windows |
| `npm run package:linux` | Build + package for Linux |
| `npm run dist:mac` | Full build: bundle Python + build + package for macOS |
| `npm run dist:win` | Full build: bundle Python + build + package for Windows |
| `npm run dist:linux` | Full build: bundle Python + build + package for Linux |

---

## Cross-Platform Building

The Python bundle is platform-specific. To build for a different platform:

1. **Build on target platform** (recommended)
2. Or use CI/CD (GitHub Actions) for automated cross-platform builds

The Python bundle uses [python-build-standalone](https://github.com/indygreg/python-build-standalone) which provides fully portable Python builds for all major platforms.

---

## Troubleshooting

### "App is damaged" on macOS
Run: `xattr -cr /Applications/Scheduler.app`

### Solver fails to start
The bundled Python should work automatically. Check the app's developer console (View → Toggle Developer Tools) for error messages.

### Permission denied on Linux
Make the AppImage executable: `chmod +x Scheduler-*.AppImage`

### Build fails with "python-bundle not found"
Run the bundle script first:
```bash
npm run bundle-python  # macOS/Linux
npm run bundle-python:win  # Windows
```

### Large app size
The app is ~400-430MB because it includes a complete Python environment with scientific computing packages (ortools, pandas, numpy). This is expected and ensures the app works without any system dependencies.
