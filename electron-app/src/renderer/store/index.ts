/**
 * Global state management using Zustand
 * Manages app settings, CSV data, solver state, and UI state
 */

import { create } from 'zustand';
import type {
  AppSettings,
  StaffMember,
  Department,
  FlagPreset,
  TrainingPair,
  TimesetRequest,
  SolverProgress,
  ValidationError,
} from '../../main/ipc-types';

// ---------------------------------------------------------------------------
// Settings Store
// ---------------------------------------------------------------------------

interface SettingsState {
  settings: AppSettings | null;
  loading: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: true,

  loadSettings: async () => {
    set({ loading: true });
    const settings = await window.electronAPI.settings.load();
    set({ settings, loading: false });
  },

  saveSettings: async (settings) => {
    await window.electronAPI.settings.save(settings);
    set({ settings });
  },

  resetSettings: async () => {
    const settings = await window.electronAPI.settings.reset();
    set({ settings });
  },
}));

// ---------------------------------------------------------------------------
// Staff Data Store
// ---------------------------------------------------------------------------

interface StaffState {
  staff: StaffMember[];
  staffPath: string | null;
  errors: ValidationError[];
  warnings: ValidationError[];
  dirty: boolean;
  setStaff: (staff: StaffMember[], path?: string) => void;
  updateStaffMember: (index: number, member: Partial<StaffMember>) => void;
  addStaffMember: (member: StaffMember) => void;
  removeStaffMember: (index: number) => void;
  setErrors: (errors: ValidationError[], warnings: ValidationError[]) => void;
  setDirty: (dirty: boolean) => void;
  clearStaff: () => void;
}

export const useStaffStore = create<StaffState>((set, get) => ({
  staff: [],
  staffPath: null,
  errors: [],
  warnings: [],
  dirty: false,

  setStaff: (staff, path) => set({ staff, staffPath: path ?? null, dirty: false }),
  
  updateStaffMember: (index, member) => {
    const staff = [...get().staff];
    staff[index] = { ...staff[index], ...member };
    set({ staff, dirty: true });
  },

  addStaffMember: (member) => {
    set({ staff: [...get().staff, member], dirty: true });
  },

  removeStaffMember: (index) => {
    const staff = get().staff.filter((_, i) => i !== index);
    set({ staff, dirty: true });
  },

  setErrors: (errors, warnings) => set({ errors, warnings }),
  setDirty: (dirty) => set({ dirty }),
  clearStaff: () => set({ staff: [], staffPath: null, errors: [], warnings: [], dirty: false }),
}));

// ---------------------------------------------------------------------------
// Department Data Store
// ---------------------------------------------------------------------------

interface DepartmentState {
  departments: Department[];
  deptPath: string | null;
  errors: ValidationError[];
  warnings: ValidationError[];
  dirty: boolean;
  setDepartments: (departments: Department[], path?: string) => void;
  updateDepartment: (index: number, dept: Partial<Department>) => void;
  addDepartment: (dept: Department) => void;
  removeDepartment: (index: number) => void;
  setErrors: (errors: ValidationError[], warnings: ValidationError[]) => void;
  setDirty: (dirty: boolean) => void;
  clearDepartments: () => void;
}

export const useDepartmentStore = create<DepartmentState>((set, get) => ({
  departments: [],
  deptPath: null,
  errors: [],
  warnings: [],
  dirty: false,

  setDepartments: (departments, path) => set({ departments, deptPath: path ?? null, dirty: false }),
  
  updateDepartment: (index, dept) => {
    const departments = [...get().departments];
    departments[index] = { ...departments[index], ...dept };
    set({ departments, dirty: true });
  },

  addDepartment: (dept) => {
    set({ departments: [...get().departments, dept], dirty: true });
  },

  removeDepartment: (index) => {
    const departments = get().departments.filter((_, i) => i !== index);
    set({ departments, dirty: true });
  },

  setErrors: (errors, warnings) => set({ errors, warnings }),
  setDirty: (dirty) => set({ dirty }),
  clearDepartments: () => set({ departments: [], deptPath: null, errors: [], warnings: [], dirty: false }),
}));

// ---------------------------------------------------------------------------
// Flags/Solve Configuration Store
// ---------------------------------------------------------------------------

interface FlagsState {
  favoredEmployees: string[];
  trainingPairs: TrainingPair[];
  favoredDepartments: Record<string, number>;
  favoredFrontDeskDepts: Record<string, number>;
  timesets: TimesetRequest[];
  maxSolveSeconds: number;
  presets: FlagPreset[];
  
  setFavoredEmployees: (employees: string[]) => void;
  addFavoredEmployee: (employee: string) => void;
  removeFavoredEmployee: (employee: string) => void;
  
  setTrainingPairs: (pairs: TrainingPair[]) => void;
  addTrainingPair: (pair: TrainingPair) => void;
  removeTrainingPair: (index: number) => void;
  
  setFavoredDepartments: (depts: Record<string, number>) => void;
  setFavoredFrontDeskDepts: (depts: Record<string, number>) => void;
  
  setTimesets: (timesets: TimesetRequest[]) => void;
  addTimeset: (timeset: TimesetRequest) => void;
  removeTimeset: (index: number) => void;
  
  setMaxSolveSeconds: (seconds: number) => void;
  
  loadPresets: () => Promise<void>;
  savePreset: (preset: FlagPreset) => Promise<void>;
  deletePreset: (presetId: string) => Promise<void>;
  applyPreset: (preset: FlagPreset) => void;
  
  reset: () => void;
}

export const useFlagsStore = create<FlagsState>((set, get) => ({
  favoredEmployees: [],
  trainingPairs: [],
  favoredDepartments: {},
  favoredFrontDeskDepts: {},
  timesets: [],
  maxSolveSeconds: 180,
  presets: [],

  setFavoredEmployees: (employees) => set({ favoredEmployees: employees }),
  addFavoredEmployee: (employee) => {
    if (!get().favoredEmployees.includes(employee)) {
      set({ favoredEmployees: [...get().favoredEmployees, employee] });
    }
  },
  removeFavoredEmployee: (employee) => {
    set({ favoredEmployees: get().favoredEmployees.filter(e => e !== employee) });
  },

  setTrainingPairs: (pairs) => set({ trainingPairs: pairs }),
  addTrainingPair: (pair) => set({ trainingPairs: [...get().trainingPairs, pair] }),
  removeTrainingPair: (index) => {
    set({ trainingPairs: get().trainingPairs.filter((_, i) => i !== index) });
  },

  setFavoredDepartments: (depts) => set({ favoredDepartments: depts }),
  setFavoredFrontDeskDepts: (depts) => set({ favoredFrontDeskDepts: depts }),

  setTimesets: (timesets) => set({ timesets }),
  addTimeset: (timeset) => set({ timesets: [...get().timesets, timeset] }),
  removeTimeset: (index) => {
    set({ timesets: get().timesets.filter((_, i) => i !== index) });
  },

  setMaxSolveSeconds: (seconds) => set({ maxSolveSeconds: seconds }),

  loadPresets: async () => {
    const presets = await window.electronAPI.presets.list();
    set({ presets });
  },

  savePreset: async (preset) => {
    await window.electronAPI.presets.save(preset);
    await get().loadPresets();
  },

  deletePreset: async (presetId) => {
    await window.electronAPI.presets.delete(presetId);
    await get().loadPresets();
  },

  applyPreset: (preset) => {
    set({
      favoredEmployees: preset.favoredEmployees,
      trainingPairs: preset.trainingPairs,
      favoredDepartments: preset.favoredDepartments,
      favoredFrontDeskDepts: preset.favoredFrontDeskDepts,
      timesets: preset.timesets,
      maxSolveSeconds: preset.maxSolveSeconds ?? get().maxSolveSeconds,
    });
  },

  reset: () => set({
    favoredEmployees: [],
    trainingPairs: [],
    favoredDepartments: {},
    favoredFrontDeskDepts: {},
    timesets: [],
    maxSolveSeconds: 180,
  }),
}));

// ---------------------------------------------------------------------------
// Solver State Store
// ---------------------------------------------------------------------------

interface SolverState {
  running: boolean;
  runId: string | null;
  progress: SolverProgress | null;
  logs: Array<{ text: string; type: 'stdout' | 'stderr'; timestamp: number }>;
  result: {
    success: boolean;
    outputs?: { xlsx?: string; xlsxFormatted?: string };
    error?: string;
    elapsed: number;
  } | null;
  
  setRunning: (running: boolean, runId?: string) => void;
  setProgress: (progress: SolverProgress) => void;
  addLog: (text: string, type: 'stdout' | 'stderr') => void;
  setResult: (result: SolverState['result']) => void;
  reset: () => void;
}

export const useSolverStore = create<SolverState>((set, get) => ({
  running: false,
  runId: null,
  progress: null,
  logs: [],
  result: null,

  setRunning: (running, runId) => set({ running, runId: runId ?? null }),
  setProgress: (progress) => set({ progress }),
  addLog: (text, type) => {
    set({ logs: [...get().logs, { text, type, timestamp: Date.now() }] });
  },
  setResult: (result) => set({ result, running: false }),
  reset: () => set({ running: false, runId: null, progress: null, logs: [], result: null }),
}));

// ---------------------------------------------------------------------------
// UI State Store
// ---------------------------------------------------------------------------

type TabId = 'import' | 'staff' | 'departments' | 'flags' | 'results' | 'settings';

interface UIState {
  activeTab: TabId;
  showSettings: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  
  setActiveTab: (tab: TabId) => void;
  setShowSettings: (show: boolean) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'import',
  showSettings: false,
  toast: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowSettings: (show) => set({ showSettings: show }),
  showToast: (message, type) => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 4000);
  },
  hideToast: () => set({ toast: null }),
}));
