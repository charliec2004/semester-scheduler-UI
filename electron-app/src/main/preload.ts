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
} from './ipc-types';

// Type-safe API exposed to renderer
const electronAPI = {
  // ---------------------------------------------------------------------------
  // File Operations
  // ---------------------------------------------------------------------------
  files: {
    openCsv: (kind: 'staff' | 'dept') => 
      ipcRenderer.invoke('files:openCsv', kind) as Promise<{ path?: string; content?: string; canceled: boolean }>,
    
    saveCsv: (opts: { kind: string; path?: string; content: string }) =>
      ipcRenderer.invoke('files:saveCsv', opts) as Promise<{ path?: string; canceled: boolean }>,
    
    downloadSample: (kind: 'staff' | 'dept') =>
      ipcRenderer.invoke('files:downloadSample', kind) as Promise<{ path?: string; canceled: boolean }>,
    
    readFile: (path: string) =>
      ipcRenderer.invoke('files:readFile', path) as Promise<{ content: string | null; error: string | null }>,
    
    saveOutput: (opts: { defaultName: string; content: string; format: string }) =>
      ipcRenderer.invoke('files:saveOutput', opts) as Promise<{ path?: string; canceled: boolean }>,
    
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
  // Presets
  // ---------------------------------------------------------------------------
  presets: {
    list: () => ipcRenderer.invoke('presets:list') as Promise<FlagPreset[]>,
    save: (preset: FlagPreset) => ipcRenderer.invoke('presets:save', preset) as Promise<{ success: boolean }>,
    delete: (presetId: string) => ipcRenderer.invoke('presets:delete', presetId) as Promise<{ success: boolean }>,
  },

  // ---------------------------------------------------------------------------
  // Solver
  // ---------------------------------------------------------------------------
  solver: {
    run: (config: SolverRunConfig) =>
      ipcRenderer.invoke('solver:run', config) as Promise<{ runId: string | null; error: string | null }>,
    
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
    getPaths: () => ipcRenderer.invoke('app:getPaths') as Promise<{ userData: string; temp: string; logs: string }>,
  },
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI;
