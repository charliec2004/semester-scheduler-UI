# Bundle standalone Python environment for Windows packaging
# Downloads a portable Python build and installs dependencies
# Works on Windows without requiring Python on the target system

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$PythonDir = Join-Path $ProjectRoot "python-bundle"
$Requirements = Join-Path (Split-Path -Parent $ProjectRoot) "requirements.txt"

# Python version to bundle
$PythonVersion = "3.12.3"
$StandaloneVersion = "20240415"

Write-Host "=== Bundling Standalone Python $PythonVersion ===" -ForegroundColor Cyan

# Clean existing bundle
if (Test-Path $PythonDir) {
    Remove-Item -Recurse -Force $PythonDir
}
New-Item -ItemType Directory -Path $PythonDir | Out-Null

# Detect architecture
$Arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
Write-Host "Architecture: $Arch"

# Determine download URL for python-build-standalone
# https://github.com/indygreg/python-build-standalone/releases
if ($Arch -eq "Arm64") {
    # ARM64 Windows - Note: ortools may not support this architecture
    Write-Host "Warning: ARM64 Windows may have limited package support" -ForegroundColor Yellow
    $PythonUrl = "https://github.com/indygreg/python-build-standalone/releases/download/$StandaloneVersion/cpython-$PythonVersion+$StandaloneVersion-aarch64-pc-windows-msvc-install_only.tar.gz"
} else {
    $PythonUrl = "https://github.com/indygreg/python-build-standalone/releases/download/$StandaloneVersion/cpython-$PythonVersion+$StandaloneVersion-x86_64-pc-windows-msvc-install_only.tar.gz"
}

Write-Host "Downloading standalone Python from:"
Write-Host $PythonUrl

# Download
$TempArchive = Join-Path $PythonDir "python.tar.gz"
Invoke-WebRequest -Uri $PythonUrl -OutFile $TempArchive

Write-Host "Extracting Python..."
# Extract tar.gz - requires tar (available in Windows 10+)
tar -xzf $TempArchive -C $PythonDir
Remove-Item $TempArchive

# The archive extracts to a 'python' directory
$PythonBin = Join-Path $PythonDir "python\python.exe"

if (-not (Test-Path $PythonBin)) {
    Write-Host "Error: Python binary not found at $PythonBin" -ForegroundColor Red
    exit 1
}

Write-Host "Python extracted successfully"
& $PythonBin --version

# Upgrade pip and install dependencies
Write-Host "Installing dependencies..."
& $PythonBin -m pip install --upgrade pip
& $PythonBin -m pip install -r $Requirements

# Verify installation
Write-Host "Verifying installation..."
& $PythonBin -c "import ortools; import pandas; import openpyxl; import xlsxwriter; print('All packages installed successfully')"

# Copy the scheduler module and main.py
Write-Host "Copying scheduler module..."
$SchedulerSrc = Join-Path (Split-Path -Parent $ProjectRoot) "scheduler"
$SchedulerDest = Join-Path $PythonDir "python\scheduler"
Copy-Item -Recurse -Force $SchedulerSrc $SchedulerDest

$MainPySrc = Join-Path (Split-Path -Parent $ProjectRoot) "main.py"
$MainPyDest = Join-Path $PythonDir "python\main.py"
Copy-Item -Force $MainPySrc $MainPyDest

# Create a simple test script
$TestScript = @"
@echo off
set SCRIPT_DIR=%~dp0
"%SCRIPT_DIR%python\python.exe" -c "import ortools; import pandas; print('Bundle is working!')"
"@
$TestScript | Out-File -FilePath (Join-Path $PythonDir "test-bundle.bat") -Encoding ASCII

Write-Host ""
Write-Host "=== Python bundle created successfully ===" -ForegroundColor Green
Write-Host "Location: $PythonDir"
Write-Host "Python:   $PythonBin"
Write-Host ""
Write-Host "Test with: $PythonDir\test-bundle.bat"
Write-Host ""
Write-Host "Bundle size:"
$Size = (Get-ChildItem -Recurse $PythonDir | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host ("{0:N2} MB" -f $Size)
