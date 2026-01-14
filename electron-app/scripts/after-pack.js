/**
 * After Pack Hook for Electron Builder
 * Handles post-packaging tasks
 */

const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const { appOutDir, packager } = context;
  const platform = packager.platform.name;
  
  console.log(`After pack: ${platform} at ${appOutDir}`);
  
  // Get the resources directory
  const resourcesDir = platform === 'darwin' 
    ? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
    : path.join(appOutDir, 'resources');
  
  const pythonDir = path.join(resourcesDir, 'python');
  
  // Verify bundled Python exists
  if (fs.existsSync(pythonDir)) {
    const pythonBin = platform === 'win32'
      ? path.join(pythonDir, 'python.exe')
      : path.join(pythonDir, 'bin', 'python3');
    
    if (fs.existsSync(pythonBin)) {
      console.log(`✓ Bundled Python found at: ${pythonBin}`);
    } else {
      console.warn(`⚠ Warning: Python binary not found at expected location: ${pythonBin}`);
      console.warn('  Make sure to run bundle-python script before packaging.');
    }
    
    // Check for main.py
    const mainPy = path.join(pythonDir, 'main.py');
    if (fs.existsSync(mainPy)) {
      console.log(`✓ main.py found`);
    } else {
      console.warn(`⚠ Warning: main.py not found at: ${mainPy}`);
    }
    
    // Check for scheduler module
    const schedulerDir = path.join(pythonDir, 'scheduler');
    if (fs.existsSync(schedulerDir)) {
      console.log(`✓ scheduler module found`);
    } else {
      console.warn(`⚠ Warning: scheduler module not found at: ${schedulerDir}`);
    }
  } else {
    console.warn(`⚠ Warning: Python directory not found at: ${pythonDir}`);
    console.warn('  The application may not work without bundled Python.');
    console.warn('  Run the bundle-python script before packaging.');
  }
};
