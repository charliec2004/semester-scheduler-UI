# App Icons

This directory contains application icons for different platforms.

## Required Files

- `icon.icns` - macOS application icon (1024x1024, with multiple sizes embedded)
- `icon.ico` - Windows application icon (256x256, with multiple sizes embedded)
- `icon.png` - Linux/fallback icon (512x512 or 1024x1024)

## Generating Icons from SVG

Use a tool like `electron-icon-builder` or online converters:

```bash
# Install the tool
npm install -g electron-icon-builder

# Generate icons from SVG
electron-icon-builder --input=icon.svg --output=./
```

Or use online tools:
- https://cloudconvert.com/svg-to-icns
- https://icoconvert.com/

## Current Source

The `icon.svg` file is the source design - a calendar with schedule checkmarks
on an emerald green gradient background.
