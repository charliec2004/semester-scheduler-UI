#!/bin/bash
# Bundle Python environment for packaging
# Creates a standalone Python environment with all dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PYTHON_DIR="$PROJECT_ROOT/python-bundle"
REQUIREMENTS="$PROJECT_ROOT/../requirements.txt"

echo "=== Bundling Python environment ==="

# Clean existing bundle
rm -rf "$PYTHON_DIR"
mkdir -p "$PYTHON_DIR"

# Detect platform
PLATFORM=$(uname -s)
ARCH=$(uname -m)

echo "Platform: $PLATFORM ($ARCH)"

if [ "$PLATFORM" = "Darwin" ]; then
    # macOS - use python3 from system or homebrew
    PYTHON_BIN=$(which python3)
    
    echo "Creating virtual environment..."
    python3 -m venv "$PYTHON_DIR/venv"
    
    echo "Installing dependencies..."
    "$PYTHON_DIR/venv/bin/pip" install --upgrade pip
    "$PYTHON_DIR/venv/bin/pip" install -r "$REQUIREMENTS"
    
    # Create launcher script
    cat > "$PYTHON_DIR/run-solver.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/venv/bin/python" "$@"
EOF
    chmod +x "$PYTHON_DIR/run-solver.sh"
    
elif [ "$PLATFORM" = "Linux" ]; then
    # Linux - similar to macOS
    python3 -m venv "$PYTHON_DIR/venv"
    "$PYTHON_DIR/venv/bin/pip" install --upgrade pip
    "$PYTHON_DIR/venv/bin/pip" install -r "$REQUIREMENTS"
    
    cat > "$PYTHON_DIR/run-solver.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/venv/bin/python" "$@"
EOF
    chmod +x "$PYTHON_DIR/run-solver.sh"
    
else
    echo "Windows detected - use bundle-python.ps1 instead"
    exit 1
fi

echo "=== Python bundle created at $PYTHON_DIR ==="
echo "Test with: $PYTHON_DIR/run-solver.sh --version"
