/**
 * Electron Main Process
 * Handles window lifecycle, IPC, Python solver spawning, and file system access.
 * All operations run fully locally - no network required.
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import type {
  IpcChannels,
  SolverRunConfig,
  SolverProgress,
  ValidationResult,
  AppSettings,
  FlagPreset,
} from './ipc-types';

// Initialize persistent settings store
const store = new Store<{
  settings: AppSettings;
  presets: FlagPreset[];
  recentFiles: { staff?: string; dept?: string };
}>({
  defaults: {
    settings: {
      solverMaxTime: 180,
      minSlots: 4,
      maxSlots: 8,
      frontDeskCoverageWeight: 10000,
      departmentTargetWeight: 1000,
      targetAdherenceWeight: 100,
      collaborativeHoursWeight: 200,
      shiftLengthWeight: 20,
      departmentHourThreshold: 4,
      targetHardDeltaHours: 5,
      highContrast: false,
      fontSize: 'medium',
    },
    presets: [],
    recentFiles: {},
  },
});

let mainWindow: BrowserWindow | null = null;
let activeSolverProcess: ChildProcess | null = null;
let currentRunId: string | null = null;

// Resolve paths for development vs production
function getResourcePath(relativePath: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, relativePath);
  }
  return path.join(__dirname, '..', '..', '..', relativePath);
}

function getPythonPath(): string {
  if (app.isPackaged) {
    // In production, use bundled Python
    const platform = process.platform;
    if (platform === 'win32') {
      return path.join(process.resourcesPath, 'python', 'python.exe');
    }
    return path.join(process.resourcesPath, 'python', 'bin', 'python3');
  }
  // In development, use system Python or venv
  const venvPython = path.join(__dirname, '..', '..', '..', 'venv', 'bin', 'python3');
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return 'python3';
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Semester Scheduler',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the renderer
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (activeSolverProcess) {
      activeSolverProcess.kill();
      activeSolverProcess = null;
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------

function registerIpcHandlers(): void {
  // File operations
  ipcMain.handle('files:openCsv', async (_event, kind: 'staff' | 'dept') => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: kind === 'staff' ? 'Select Staff CSV' : 'Select Department CSV',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    store.set(`recentFiles.${kind}`, filePath);
    return { path: filePath, content, canceled: false };
  });

  ipcMain.handle('files:saveCsv', async (_event, { kind, path: filePath, content }: { kind: string; path?: string; content: string }) => {
    let savePath = filePath;
    if (!savePath) {
      const result = await dialog.showSaveDialog(mainWindow!, {
        title: `Save ${kind === 'staff' ? 'Staff' : 'Department'} CSV`,
        defaultPath: kind === 'staff' ? 'employees.csv' : 'departments.csv',
        filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      });
      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }
      savePath = result.filePath;
    }
    fs.writeFileSync(savePath, content, 'utf-8');
    store.set(`recentFiles.${kind}`, savePath);
    return { path: savePath, canceled: false };
  });

  ipcMain.handle('files:downloadSample', async (_event, kind: 'staff' | 'dept') => {
    const sampleName = kind === 'staff' ? 'employees.csv.example' : 'cpd-requirements.csv.example';
    const samplePath = getResourcePath(sampleName);
    
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: `Save Sample ${kind === 'staff' ? 'Staff' : 'Department'} CSV`,
      defaultPath: sampleName.replace('.example', ''),
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    fs.copyFileSync(samplePath, result.filePath);
    return { path: result.filePath, canceled: false };
  });

  ipcMain.handle('files:readFile', async (_event, filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { content, error: null };
    } catch (err) {
      return { content: null, error: (err as Error).message };
    }
  });

  ipcMain.handle('files:saveOutput', async (_event, { defaultName, content, format }: { defaultName: string; content: string; format: string }) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Save Output',
      defaultPath: defaultName,
      filters: [{ name: format.toUpperCase(), extensions: [format] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(result.filePath, content);
    return { path: result.filePath, canceled: false };
  });

  ipcMain.handle('files:openInExplorer', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
  });

  // Settings
  ipcMain.handle('settings:load', () => {
    return store.get('settings');
  });

  ipcMain.handle('settings:save', (_event, settings: AppSettings) => {
    store.set('settings', settings);
    return { success: true };
  });

  ipcMain.handle('settings:reset', () => {
    store.reset('settings');
    return store.get('settings');
  });

  // Presets
  ipcMain.handle('presets:list', () => {
    return store.get('presets');
  });

  ipcMain.handle('presets:save', (_event, preset: FlagPreset) => {
    const presets = store.get('presets');
    const existingIndex = presets.findIndex((p: FlagPreset) => p.id === preset.id);
    if (existingIndex >= 0) {
      presets[existingIndex] = preset;
    } else {
      presets.push({ ...preset, id: preset.id || uuidv4() });
    }
    store.set('presets', presets);
    return { success: true };
  });

  ipcMain.handle('presets:delete', (_event, presetId: string) => {
    const presets = store.get('presets').filter((p: FlagPreset) => p.id !== presetId);
    store.set('presets', presets);
    return { success: true };
  });

  // Solver
  ipcMain.handle('solver:run', async (_event, config: SolverRunConfig) => {
    if (activeSolverProcess) {
      return { error: 'A solver is already running', runId: null };
    }

    const runId = uuidv4();
    currentRunId = runId;

    // Build command-line arguments
    const args = buildSolverArgs(config);
    const pythonPath = getPythonPath();
    const mainScript = getResourcePath('main.py');

    // Create temp directory for outputs
    const tempDir = path.join(app.getPath('temp'), 'scheduler', runId);
    fs.mkdirSync(tempDir, { recursive: true });

    const outputPath = path.join(tempDir, 'schedule.xlsx');
    args.push('--output', outputPath);

    console.log('Running solver:', pythonPath, [mainScript, ...args].join(' '));

    activeSolverProcess = spawn(pythonPath, [mainScript, ...args], {
      cwd: path.dirname(mainScript),
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    const startTime = Date.now();

    activeSolverProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      mainWindow?.webContents.send('solver:log', { runId, text, type: 'stdout' });
      
      // Parse progress if available
      const progressMatch = text.match(/Progress:\s*(\d+)%/i);
      if (progressMatch) {
        const percent = parseInt(progressMatch[1], 10);
        const elapsed = (Date.now() - startTime) / 1000;
        mainWindow?.webContents.send('solver:progress', {
          runId,
          percent,
          elapsed,
          message: text.trim(),
        } as SolverProgress);
      }
    });

    activeSolverProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      mainWindow?.webContents.send('solver:log', { runId, text, type: 'stderr' });
    });

    activeSolverProcess.on('close', (code: number | null) => {
      const elapsed = (Date.now() - startTime) / 1000;
      
      if (code === 0) {
        // Success - check for output files
        const outputs: Record<string, string> = {};
        if (fs.existsSync(outputPath)) {
          outputs.xlsx = outputPath;
        }
        const formattedPath = outputPath.replace('.xlsx', '-formatted.xlsx');
        if (fs.existsSync(formattedPath)) {
          outputs.xlsxFormatted = formattedPath;
        }

        mainWindow?.webContents.send('solver:done', {
          runId,
          success: true,
          outputs,
          elapsed,
        });
      } else {
        mainWindow?.webContents.send('solver:done', {
          runId,
          success: false,
          error: `Solver exited with code ${code}`,
          elapsed,
        });
      }

      activeSolverProcess = null;
      currentRunId = null;
    });

    activeSolverProcess.on('error', (err: Error) => {
      mainWindow?.webContents.send('solver:error', {
        runId,
        error: err.message,
      });
      activeSolverProcess = null;
      currentRunId = null;
    });

    return { runId, error: null };
  });

  ipcMain.handle('solver:cancel', () => {
    if (activeSolverProcess) {
      activeSolverProcess.kill('SIGTERM');
      activeSolverProcess = null;
      const runId = currentRunId;
      currentRunId = null;
      return { canceled: true, runId };
    }
    return { canceled: false, runId: null };
  });

  ipcMain.handle('solver:isRunning', () => {
    return { running: activeSolverProcess !== null, runId: currentRunId };
  });

  // App info
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getPaths', () => {
    return {
      userData: app.getPath('userData'),
      temp: app.getPath('temp'),
      logs: app.getPath('logs'),
    };
  });
}

function buildSolverArgs(config: SolverRunConfig): string[] {
  const args: string[] = [config.staffPath, config.deptPath];

  if (config.maxSolveSeconds) {
    args.push('--max-solve-seconds', config.maxSolveSeconds.toString());
  }

  if (config.showProgress) {
    args.push('--progress');
  }

  for (const emp of config.favoredEmployees || []) {
    args.push('--favor', emp);
  }

  for (const training of config.trainingPairs || []) {
    args.push('--training', `${training.department},${training.trainee1},${training.trainee2}`);
  }

  for (const [dept, mult] of Object.entries(config.favoredDepartments || {})) {
    args.push('--favor-dept', mult !== 1.0 ? `${dept}:${mult}` : dept);
  }

  for (const [dept, mult] of Object.entries(config.favoredFrontDeskDepts || {})) {
    args.push('--favor-frontdesk-dept', mult !== 1.0 ? `${dept}:${mult}` : dept);
  }

  for (const ts of config.timesets || []) {
    args.push('--timeset', ts.employee, ts.day, ts.department, ts.startTime, ts.endTime);
  }

  return args;
}
