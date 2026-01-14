# Bundle Python environment for Windows packaging
# Creates a standalone Python environment with all dependencies

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$PythonDir = Join-Path $ProjectRoot "python-bundle"
$Requirements = Join-Path (Split-Path -Parent $ProjectRoot) "requirements.txt"

Write-Host "=== Bundling Python environment ===" -ForegroundColor Cyan

# Clean existing bundle
if (Test-Path $PythonDir) {
    Remove-Item -Recurse -Force $PythonDir
}
New-Item -ItemType Directory -Path $PythonDir | Out-Null

Write-Host "Creating virtual environment..."
python -m venv "$PythonDir\venv"

Write-Host "Installing dependencies..."
& "$PythonDir\venv\Scripts\pip.exe" install --upgrade pip
& "$PythonDir\venv\Scripts\pip.exe" install -r $Requirements

# Create launcher batch file
@"
@echo off
set SCRIPT_DIR=%~dp0
"%SCRIPT_DIR%venv\Scripts\python.exe" %*
"@ | Out-File -FilePath "$PythonDir\run-solver.bat" -Encoding ASCII

Write-Host "=== Python bundle created at $PythonDir ===" -ForegroundColor Green
Write-Host "Test with: $PythonDir\run-solver.bat --version"
