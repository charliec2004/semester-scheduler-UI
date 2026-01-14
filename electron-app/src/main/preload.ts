/**
 * Preload Script
 * Exposes a secure, typed bridge between renderer and main process.
 * contextIsolation: true ensures renderer cannot access Node.js directly.
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  AppSettings,
  FlagPreset,
  SolverRunConfig,
  SolverProgress,
  SolverResult,
  HistoryEntry,
  ConfigSnapshot,
  StaffMember,
  Department,
} from './ipc-types';

// Type-safe API exposed to renderer
const electronAPI = {
  // ---------------------------------------------------------------------------
  // File Operations
  // ---------------------------------------------------------------------------
  files: {
    openCsv: (kind: 'staff' | 'dept') => 
      ipcRenderer.invoke('files:openCsv', kind) as Promise<{ path?: string; content?: string; canceled: boolean }>,
    
    saveCsvToTemp: (opts: { content: string; filename: string }) =>
      ipcRenderer.invoke('files:saveCsvToTemp', opts) as Promise<{ path: string }>,
    
    downloadSample: (kind: 'staff' | 'dept') =>
      ipcRenderer.invoke('files:downloadSample', kind) as Promise<{ path?: string; canceled: boolean }>,
    
    readFile: (path: string) =>
      ipcRenderer.invoke('files:readFile', path) as Promise<{ content: string | null; error: string | null }>,
    
    saveOutputAs: (opts: { sourcePath: string; defaultName: string }) =>
      ipcRenderer.invoke('files:saveOutputAs', opts) as Promise<{ path?: string; canceled: boolean }>,
    
    openInExplorer: (path: string) =>
      ipcRenderer.invoke('files:openInExplorer', path) as Promise<void>,
  },

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------
  settings: {
    load: () => ipcRenderer.invoke('settings:load') as Promise<AppSettings>,
    save: (settings: AppSettings) => ipcRenderer.invoke('settings:save', settings) as Promise<{ success: boolean }>,
    reset: () => ipcRenderer.invoke('settings:reset') as Promise<AppSettings>,
  },

  // ---------------------------------------------------------------------------
  // Persistent Data (Staff & Departments)
  // ---------------------------------------------------------------------------
  data: {
    loadStaff: () => ipcRenderer.invoke('data:loadStaff') as Promise<StaffMember[]>,
    saveStaff: (staff: StaffMember[]) => ipcRenderer.invoke('data:saveStaff', staff) as Promise<{ success: boolean }>,
    loadDepartments: () => ipcRenderer.invoke('data:loadDepartments') as Promise<Department[]>,
    saveDepartments: (departments: Department[]) => ipcRenderer.invoke('data:saveDepartments', departments) as Promise<{ success: boolean }>,
  },

  // ---------------------------------------------------------------------------
  // Presets
  // ---------------------------------------------------------------------------
  presets: {
    list: () => ipcRenderer.invoke('presets:list') as Promise<FlagPreset[]>,
    save: (preset: FlagPreset) => ipcRenderer.invoke('presets:save', preset) as Promise<{ success: boolean }>,
    delete: (presetId: string) => ipcRenderer.invoke('presets:delete', presetId) as Promise<{ success: boolean }>,
  },

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------
  history: {
    list: () => ipcRenderer.invoke('history:list') as Promise<HistoryEntry[]>,
    getConfig: (historyId: string) => 
      ipcRenderer.invoke('history:getConfig', historyId) as Promise<{ config: ConfigSnapshot | null; error: string | null }>,
    delete: (historyId: string) => 
      ipcRenderer.invoke('history:delete', historyId) as Promise<{ success: boolean }>,
    getOutputPath: (opts: { historyId: string; type: 'xlsx' | 'xlsxFormatted' }) =>
      ipcRenderer.invoke('history:getOutputPath', opts) as Promise<{ path: string | null; exists: boolean }>,
  },

  // ---------------------------------------------------------------------------
  // Solver
  // ---------------------------------------------------------------------------
  solver: {
    run: (opts: { config: SolverRunConfig; snapshot: ConfigSnapshot }) =>
      ipcRenderer.invoke('solver:run', opts) as Promise<{ runId: string | null; error: string | null }>,
    
    cancel: () =>
      ipcRenderer.invoke('solver:cancel') as Promise<{ canceled: boolean; runId: string | null }>,
    
    isRunning: () =>
      ipcRenderer.invoke('solver:isRunning') as Promise<{ running: boolean; runId: string | null }>,
    
    // Event listeners
    onProgress: (callback: (progress: SolverProgress) => void) => {
      const handler = (_event: IpcRendererEvent, progress: SolverProgress) => callback(progress);
      ipcRenderer.on('solver:progress', handler);
      return () => ipcRenderer.removeListener('solver:progress', handler);
    },
    
    onLog: (callback: (log: { runId: string; text: string; type: 'stdout' | 'stderr' }) => void) => {
      const handler = (_event: IpcRendererEvent, log: { runId: string; text: string; type: 'stdout' | 'stderr' }) => callback(log);
      ipcRenderer.on('solver:log', handler);
      return () => ipcRenderer.removeListener('solver:log', handler);
    },
    
    onDone: (callback: (result: SolverResult) => void) => {
      const handler = (_event: IpcRendererEvent, result: SolverResult) => callback(result);
      ipcRenderer.on('solver:done', handler);
      return () => ipcRenderer.removeListener('solver:done', handler);
    },
    
    onError: (callback: (error: { runId: string; error: string }) => void) => {
      const handler = (_event: IpcRendererEvent, error: { runId: string; error: string }) => callback(error);
      ipcRenderer.on('solver:error', handler);
      return () => ipcRenderer.removeListener('solver:error', handler);
    },
  },

  // ---------------------------------------------------------------------------
  // App Info
  // ---------------------------------------------------------------------------
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
    getPaths: () => ipcRenderer.invoke('app:getPaths') as Promise<{ userData: string; temp: string; logs: string; history: string }>,
  },
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI;
