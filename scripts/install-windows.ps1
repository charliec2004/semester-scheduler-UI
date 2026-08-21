# Install Scheduler app on Windows
# Usage: .\scripts\install-windows.ps1

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ElectronApp = Join-Path $ProjectRoot "electron-app"

Write-Host "🚀 Building Scheduler for Windows..." -ForegroundColor Cyan

# Navigate to electron-app
Set-Location $ElectronApp

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
}

# Bundle standalone Python with all dependencies
Write-Host "🐍 Bundling Python environment..." -ForegroundColor Yellow
$PythonBundle = Join-Path $ElectronApp "python-bundle\python"
if (-not (Test-Path $PythonBundle)) {
    npm run bundle-python:win
} else {
    Write-Host "   Python bundle already exists, skipping..." -ForegroundColor Gray
}

# Build the app
Write-Host "🔨 Building application..." -ForegroundColor Yellow
npm run build

# Package for Windows
Write-Host "📦 Packaging for Windows..." -ForegroundColor Yellow
npm run package:win

# Resolve both electron-builder's local name (Scheduler.Setup.X.Y.Z.exe) and
# the normalized release name (Scheduler-Setup-X.Y.Z.exe).
$WindowsExecutables = Get-ChildItem -Path "release" -Filter "Scheduler*.exe"
$Installer = $WindowsExecutables | Where-Object { $_.Name -match '^Scheduler(?:\.|-)Setup(?:\.|-).+\.exe$' } | Select-Object -First 1
$Portable = $WindowsExecutables | Where-Object { $_.Name -notmatch '(?:\.|-)Setup(?:\.|-)' } | Select-Object -First 1

if ($null -eq $Installer) {
    Write-Host "❌ Build failed: Installer not found in release/" -ForegroundColor Red
    exit 1
}

$InstallerPath = $Installer.FullName

Write-Host ""
Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📂 Output files:" -ForegroundColor Cyan
Write-Host "   Installer: $InstallerPath"
Write-Host "   Portable:  $ElectronApp\release\win-unpacked\"
if ($null -ne $Portable) {
    Write-Host "   Portable EXE: $($Portable.FullName)"
}
Write-Host ""
Write-Host "📦 This is a self-contained app - no Python installation required!" -ForegroundColor Green
Write-Host ""

# Ask to run installer
$response = Read-Host "Would you like to run the installer now? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "🚀 Launching installer..." -ForegroundColor Cyan
    Start-Process -FilePath $InstallerPath
} else {
    Write-Host "ℹ️  Run the installer manually: $InstallerPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green
