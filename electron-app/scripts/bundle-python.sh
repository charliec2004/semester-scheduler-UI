#!/bin/bash
# Bundle standalone Python environment for packaging
# Downloads a portable Python build and installs dependencies
# Works on macOS and Linux without requiring Python on the target system

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PYTHON_DIR="$PROJECT_ROOT/python-bundle"
REQUIREMENTS="$PROJECT_ROOT/../requirements.txt"

# Python version to bundle
PYTHON_VERSION="3.12.3"
STANDALONE_VERSION="20240415"

echo "=== Bundling Standalone Python $PYTHON_VERSION ==="

# Clean existing bundle
rm -rf "$PYTHON_DIR"
mkdir -p "$PYTHON_DIR"

# Detect platform and architecture
PLATFORM=$(uname -s)
ARCH=$(uname -m)

echo "Platform: $PLATFORM ($ARCH)"

# Determine download URL for python-build-standalone
# https://github.com/indygreg/python-build-standalone/releases
if [ "$PLATFORM" = "Darwin" ]; then
    if [ "$ARCH" = "arm64" ]; then
        PYTHON_URL="https://github.com/indygreg/python-build-standalone/releases/download/${STANDALONE_VERSION}/cpython-${PYTHON_VERSION}+${STANDALONE_VERSION}-aarch64-apple-darwin-install_only.tar.gz"
    else
        PYTHON_URL="https://github.com/indygreg/python-build-standalone/releases/download/${STANDALONE_VERSION}/cpython-${PYTHON_VERSION}+${STANDALONE_VERSION}-x86_64-apple-darwin-install_only.tar.gz"
    fi
elif [ "$PLATFORM" = "Linux" ]; then
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        PYTHON_URL="https://github.com/indygreg/python-build-standalone/releases/download/${STANDALONE_VERSION}/cpython-${PYTHON_VERSION}+${STANDALONE_VERSION}-aarch64-unknown-linux-gnu-install_only.tar.gz"
    else
        PYTHON_URL="https://github.com/indygreg/python-build-standalone/releases/download/${STANDALONE_VERSION}/cpython-${PYTHON_VERSION}+${STANDALONE_VERSION}-x86_64-unknown-linux-gnu-install_only.tar.gz"
    fi
else
    echo "Unsupported platform: $PLATFORM"
    echo "For Windows, use bundle-python.ps1"
    exit 1
fi

echo "Downloading standalone Python from:"
echo "$PYTHON_URL"

# Download and extract
TEMP_ARCHIVE="$PYTHON_DIR/python.tar.gz"
curl -L -o "$TEMP_ARCHIVE" "$PYTHON_URL"

echo "Extracting Python..."
tar -xzf "$TEMP_ARCHIVE" -C "$PYTHON_DIR"
rm "$TEMP_ARCHIVE"

# The archive extracts to a 'python' directory
PYTHON_BIN="$PYTHON_DIR/python/bin/python3"

if [ ! -f "$PYTHON_BIN" ]; then
    echo "Error: Python binary not found at $PYTHON_BIN"
    exit 1
fi

echo "Python extracted successfully"
"$PYTHON_BIN" --version

# Upgrade pip and install dependencies
echo "Installing dependencies..."
"$PYTHON_BIN" -m pip install --upgrade pip
"$PYTHON_BIN" -m pip install -r "$REQUIREMENTS"

# Verify installation
echo "Verifying installation..."
"$PYTHON_BIN" -c "import ortools; import pandas; import openpyxl; import xlsxwriter; print('All packages installed successfully')"

# Copy the scheduler module and main.py
echo "Copying scheduler module..."
cp -r "$PROJECT_ROOT/../scheduler" "$PYTHON_DIR/python/"
cp "$PROJECT_ROOT/../main.py" "$PYTHON_DIR/python/"

# Create a simple test script
cat > "$PYTHON_DIR/test-bundle.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/python/bin/python3" -c "import ortools; import pandas; print('Bundle is working!')"
EOF
chmod +x "$PYTHON_DIR/test-bundle.sh"

echo ""
echo "=== Python bundle created successfully ==="
echo "Location: $PYTHON_DIR"
echo "Python:   $PYTHON_BIN"
echo ""
echo "Test with: $PYTHON_DIR/test-bundle.sh"
echo ""
echo "Bundle size:"
du -sh "$PYTHON_DIR"
