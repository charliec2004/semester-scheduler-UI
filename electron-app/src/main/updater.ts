/**
 * Auto-Update Module
 * 
 * Hybrid approach:
 * - Windows/Linux: Full auto-update via electron-updater
 * - macOS: Download DMG, mount, show instructions, quit (due to code signing requirements)
 */

import { app, BrowserWindow, dialog, shell } from 'electron';
import { autoUpdater, UpdateInfo } from 'electron-updater';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

// GitHub repository info
const GITHUB_OWNER = 'charliec2004';
const GITHUB_REPO = 'semester-scheduler-UI';

export type UpdateStatus = 
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string; releaseNotes?: string }
  | { state: 'not-available' }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string };

let currentStatus: UpdateStatus = { state: 'idle' };
let mainWindow: BrowserWindow | null = null;

/**
 * Initialize the updater with the main window reference
 */
export function initUpdater(window: BrowserWindow): void {
  mainWindow = window;
  
  if (process.platform !== 'darwin') {
    // Configure electron-updater for Windows/Linux
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    autoUpdater.on('checking-for-update', () => {
      setStatus({ state: 'checking' });
    });
    
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      setStatus({ 
        state: 'available', 
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
      });
    });
    
    autoUpdater.on('update-not-available', () => {
      setStatus({ state: 'not-available' });
    });
    
    autoUpdater.on('download-progress', (progress) => {
      setStatus({ state: 'downloading', percent: progress.percent });
    });
    
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      setStatus({ state: 'downloaded', version: info.version });
    });
    
    autoUpdater.on('error', (err) => {
      setStatus({ state: 'error', message: err.message });
    });
  }
}

/**
 * Update status and notify renderer
 */
function setStatus(status: UpdateStatus): void {
  currentStatus = status;
  mainWindow?.webContents.send('updater:status', status);
}

/**
 * Get current update status
 */
export function getUpdateStatus(): UpdateStatus {
  return currentStatus;
}

/**
 * Check for updates (platform-specific)
 */
export async function checkForUpdates(): Promise<UpdateStatus> {
  if (process.platform === 'darwin') {
    return checkForUpdatesMacOS();
  } else {
    return checkForUpdatesElectronUpdater();
  }
}

/**
 * Windows/Linux: Use electron-updater
 */
async function checkForUpdatesElectronUpdater(): Promise<UpdateStatus> {
  try {
    setStatus({ state: 'checking' });
    await autoUpdater.checkForUpdates();
    return currentStatus;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    setStatus({ state: 'error', message });
    return currentStatus;
  }
}

/**
 * macOS: Check GitHub API directly
 */
async function checkForUpdatesMacOS(): Promise<UpdateStatus> {
  setStatus({ state: 'checking' });
  
  try {
    const release = await fetchLatestRelease();
    const currentVersion = app.getVersion();
    const latestVersion = release.tag_name.replace(/^v/, '');
    
    if (isNewerVersion(latestVersion, currentVersion)) {
      setStatus({ 
        state: 'available', 
        version: latestVersion,
        releaseNotes: release.body || undefined
      });
    } else {
      setStatus({ state: 'not-available' });
    }
    
    return currentStatus;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to check for updates';
    setStatus({ state: 'error', message });
    return currentStatus;
  }
}

/**
 * Download and install update (platform-specific)
 */
export async function downloadAndInstallUpdate(): Promise<void> {
  if (process.platform === 'darwin') {
    await downloadAndInstallMacOS();
  } else {
    await downloadAndInstallElectronUpdater();
  }
}

/**
 * Windows/Linux: Download via electron-updater
 */
async function downloadAndInstallElectronUpdater(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Download failed';
    setStatus({ state: 'error', message });
  }
}

/**
 * macOS: Download DMG, mount it, show instructions, quit
 */
async function downloadAndInstallMacOS(): Promise<void> {
  try {
    const release = await fetchLatestRelease();
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    const dmgAsset = release.assets.find((a: GitHubAsset) => 
      a.name.includes(arch) && a.name.endsWith('.dmg')
    );
    
    if (!dmgAsset) {
      throw new Error(`No DMG found for ${arch} architecture`);
    }
    
    const downloadPath = path.join(app.getPath('downloads'), dmgAsset.name);
    
    // Download the DMG
    setStatus({ state: 'downloading', percent: 0 });
    await downloadFile(dmgAsset.browser_download_url, downloadPath, (percent) => {
      setStatus({ state: 'downloading', percent });
    });
    
    // Mount the DMG
    const mountPoint = await mountDmg(downloadPath);
    
    // Open Finder at the mounted volume
    await shell.openPath(mountPoint);
    
    // Show instructions dialog
    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Downloaded',
      message: 'Update Ready to Install',
      detail: `The new version has been downloaded and mounted.\n\n` +
              `To complete the update:\n` +
              `1. Drag "Scheduler" to the Applications folder\n` +
              `2. Click "Replace" when prompted\n` +
              `3. Open Terminal and run:\n` +
              `   xattr -cr /Applications/Scheduler.app\n` +
              `4. Launch the new version from Applications\n\n` +
              `The app will now quit so you can replace it.`,
      buttons: ['Quit and Install', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
    });
    
    if (result.response === 0) {
      // User chose to proceed - quit the app
      app.quit();
    } else {
      // User cancelled - unmount and clean up
      await unmountDmg(mountPoint);
      setStatus({ state: 'idle' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Download failed';
    setStatus({ state: 'error', message });
    
    dialog.showErrorBox('Update Failed', message);
  }
}

/**
 * Quit and install (Windows/Linux only)
 */
export function quitAndInstall(): void {
  if (process.platform !== 'darwin') {
    autoUpdater.quitAndInstall();
  }
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

interface GitHubRelease {
  tag_name: string;
  body: string | null;
  assets: GitHubAsset[];
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

/**
 * Fetch latest release from GitHub API
 */
function fetchLatestRelease(): Promise<GitHubRelease> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      headers: {
        'User-Agent': `Scheduler/${app.getVersion()}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    };
    
    const req = https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Failed to parse release data'));
          }
        } else if (res.statusCode === 404) {
          reject(new Error('No releases found'));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * Download a file with progress callback
 */
function downloadFile(
  url: string, 
  destPath: string, 
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    const request = (downloadUrl: string) => {
      https.get(downloadUrl, (res) => {
        // Handle redirects
        if (res.statusCode === 302 || res.statusCode === 301) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            request(redirectUrl);
            return;
          }
        }
        
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: ${res.statusCode}`));
          return;
        }
        
        const totalSize = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedSize = 0;
        
        res.on('data', (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            onProgress((downloadedSize / totalSize) * 100);
          }
        });
        
        res.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
        
        file.on('error', (err) => {
          fs.unlink(destPath, () => {}); // Clean up partial file
          reject(err);
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {}); // Clean up partial file
        reject(err);
      });
    };
    
    request(url);
  });
}

/**
 * Mount a DMG file and return the mount point
 */
function mountDmg(dmgPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`hdiutil attach "${dmgPath}" -nobrowse`, (error, stdout) => {
      if (error) {
        reject(new Error(`Failed to mount DMG: ${error.message}`));
        return;
      }
      
      // Parse mount point from hdiutil output
      const lines = stdout.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/\t(\/Volumes\/.+)$/);
      
      if (match) {
        resolve(match[1]);
      } else {
        reject(new Error('Could not find mount point'));
      }
    });
  });
}

/**
 * Unmount a DMG
 */
function unmountDmg(mountPoint: string): Promise<void> {
  return new Promise((resolve) => {
    exec(`hdiutil detach "${mountPoint}" -force`, () => {
      resolve(); // Ignore errors on unmount
    });
  });
}

/**
 * Compare semantic versions
 * Returns true if version1 > version2
 */
function isNewerVersion(version1: string, version2: string): boolean {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1 = v1Parts[i] || 0;
    const v2 = v2Parts[i] || 0;
    
    if (v1 > v2) return true;
    if (v1 < v2) return false;
  }
  
  return false;
}
