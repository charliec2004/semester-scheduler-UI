/**
 * After Pack Hook for Electron Builder
 * Handles post-packaging tasks like setting up Python environment instructions
 */

const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const { appOutDir, packager } = context;
  const platform = packager.platform.name;
  
  console.log(`After pack: ${platform} at ${appOutDir}`);
  
  // Create a README for Python setup in the resources
  const resourcesDir = platform === 'darwin' 
    ? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
    : path.join(appOutDir, 'resources');
  
  const pythonDir = path.join(resourcesDir, 'python');
  
  if (fs.existsSync(pythonDir)) {
    const readmePath = path.join(pythonDir, 'PYTHON_SETUP.md');
    const readmeContent = `# Python Environment Setup

This application requires Python 3.12+ with the following packages:
- ortools
- pandas
- openpyxl
- xlsxwriter

## Automatic Setup (Recommended)

On first run, the application will attempt to use your system Python.

## Manual Setup

1. Install Python 3.12 or later from https://python.org
2. Create a virtual environment in this directory:
   \`\`\`
   python3 -m venv venv
   \`\`\`
3. Install dependencies:
   \`\`\`
   ./venv/bin/pip install -r requirements.txt
   \`\`\`

## Troubleshooting

If the solver fails to run, ensure Python is in your PATH and the virtual
environment is properly set up with all dependencies.
`;
    
    fs.writeFileSync(readmePath, readmeContent);
    console.log('Created Python setup README');
  }
};
