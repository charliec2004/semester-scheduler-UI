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
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Build the app
Write-Host "🔨 Building application..." -ForegroundColor Yellow
npm run build

# Package for Windows
Write-Host "📦 Packaging for Windows..." -ForegroundColor Yellow
npm run package

# Find the installer
$Installer = Get-ChildItem -Path "release" -Filter "Scheduler Setup*.exe" | Select-Object -First 1

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
