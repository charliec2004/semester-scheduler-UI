/**
 * Shared IPC type definitions for main and renderer processes.
 * These types define the contract between Electron main and the React renderer.
 */

import type { DayName, UnavailabilityBlock } from '../shared/constants';
import { DEFAULT_MAX_SLOTS, DEFAULT_MIN_SLOTS } from '../shared/constants';

// ---------------------------------------------------------------------------
// Settings & Configuration
// ---------------------------------------------------------------------------

export interface AppSettings {
  // Solver
  solverMaxTime: number;
  minSlots: number;
  maxSlots: number;
  
  // Objective weights
  frontDeskCoverageWeight: number;
  departmentTargetWeight: number;
  officeCoverageWeight: number;
  singleCoverageWeight: number;
  targetAdherenceWeight: number;
  collaborativeHoursWeight: number;
  departmentSpreadWeight: number;
  departmentDayCoverageWeight: number;
  shiftLengthWeight: number;
  shiftTimePreferenceWeight: number;
  favoredEmployeeDeptWeight: number;
  underclassmenFrontDeskWeight: number;
  departmentTotalWeight: number;
  equalityConstraintWeight: number;
  
  // Scheduling and tuning
  departmentHourThreshold: number;
  targetHardDeltaHours: number;
  weeklyHourCap: number;
  favoredStudentDailyMaxHours: number;
  favoredStudentMinShiftHours: number;
  favoredStudentTargetPriority: number;
  favoredStudentFillBonus: number;
  travelBufferMinutes: number;
  defaultWeeklyMaxHours: number;
  defaultTargetHours: number;
  trainingMinHours: number;
  trainingOverlapTargetPercent: number;
  trainingOverlapWeight: number;
  trainingOverlapBonus: number;
  collaborationMinCareerEducationHours: number;
  collaborationMinMarketingHours: number;
  collaborationMinEmployerEngagementHours: number;
  collaborationMinEventsHours: number;
  collaborationMinDataSystemsHours: number;
  favoredDepartmentTargetMultiplier: number;
  favoredDepartmentFocusedBonus: number;
  favoredDepartmentDualPenalty: number;
  favoredFrontDeskDeptBonus: number;
  timesetBonusWeight: number;
  departmentScarcityWeight: number;
  largeDeviationThresholdHours: number;
  employeeLargeDeviationPenalty: number;
  departmentLargeDeviationPenalty: number;
  year1TargetMultiplier: number;
  year2TargetMultiplier: number;
  year3TargetMultiplier: number;
  year4TargetMultiplier: number;
  
  // UI preferences
  fontSize: 'small' | 'medium' | 'large';
  theme: 'system' | 'dark' | 'light';
  
  // Scheduling rules
  enforceMinDeptBlock: boolean;
  enforceFavoredTwoHourMinimum: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  solverMaxTime: 180,
  minSlots: DEFAULT_MIN_SLOTS,
  maxSlots: DEFAULT_MAX_SLOTS,
  frontDeskCoverageWeight: 10000,
  departmentTargetWeight: 1000,
  officeCoverageWeight: 150,
  singleCoverageWeight: 500,
  targetAdherenceWeight: 100,
  collaborativeHoursWeight: 200,
  departmentSpreadWeight: 60,
  departmentDayCoverageWeight: 30,
  shiftLengthWeight: 20,
  shiftTimePreferenceWeight: 15,
  favoredEmployeeDeptWeight: 50,
  underclassmenFrontDeskWeight: 1,
  departmentTotalWeight: 1 / 3,
  equalityConstraintWeight: 67,
  departmentHourThreshold: 4,
  targetHardDeltaHours: 5,
  weeklyHourCap: 19,
  favoredStudentDailyMaxHours: 8,
  favoredStudentMinShiftHours: 1,
  favoredStudentTargetPriority: 10,
  favoredStudentFillBonus: 67,
  travelBufferMinutes: 10,
  defaultWeeklyMaxHours: 40,
  defaultTargetHours: 11,
  trainingMinHours: 1,
  trainingOverlapTargetPercent: 35,
  trainingOverlapWeight: 5000,
  trainingOverlapBonus: 67,
  collaborationMinCareerEducationHours: 1,
  collaborationMinMarketingHours: 1,
  collaborationMinEmployerEngagementHours: 2,
  collaborationMinEventsHours: 4,
  collaborationMinDataSystemsHours: 0,
  favoredDepartmentTargetMultiplier: 1.5,
  favoredDepartmentFocusedBonus: 10,
  favoredDepartmentDualPenalty: 7,
  favoredFrontDeskDeptBonus: 13,
  timesetBonusWeight: 20000,
  departmentScarcityWeight: 8,
  largeDeviationThresholdHours: 2,
  employeeLargeDeviationPenalty: 5000,
  departmentLargeDeviationPenalty: 4000,
  year1TargetMultiplier: 1,
  year2TargetMultiplier: 1.2,
  year3TargetMultiplier: 1.5,
  year4TargetMultiplier: 2,
  fontSize: 'medium',
  theme: 'dark',
  enforceMinDeptBlock: true,
  enforceFavoredTwoHourMinimum: true,
};

function looksLikeLegacySlotSettings(stored?: Partial<AppSettings> | null): boolean {
  if (stored?.minSlots === undefined || stored?.maxSlots === undefined) {
    return false;
  }
  return (
    Number.isFinite(stored.minSlots) &&
    Number.isFinite(stored.maxSlots) &&
    stored.minSlots > 0 &&
    stored.maxSlots > 0 &&
    stored.minSlots < DEFAULT_MIN_SLOTS &&
    stored.maxSlots <= DEFAULT_MAX_SLOTS
  );
}

export function normalizeAppSettings(stored?: Partial<AppSettings> | null): AppSettings {
  const merged: AppSettings = { ...DEFAULT_SETTINGS, ...stored };
  if (looksLikeLegacySlotSettings(stored)) {
    merged.minSlots = Math.round((stored?.minSlots ?? DEFAULT_MIN_SLOTS) * 3);
    merged.maxSlots = Math.round((stored?.maxSlots ?? DEFAULT_MAX_SLOTS) * 3);
  }
  return merged;
}

// ---------------------------------------------------------------------------
// CSV Data Models
// ---------------------------------------------------------------------------

export interface StaffMember {
  name: string;
  roles: string[];
  targetHours: number;
  maxHours: number;
  year: number;
  /** Periods the student cannot work (classes, etc.), with optional travel buffers at edges. */
  unavailabilityBlocks: Record<DayName, UnavailabilityBlock[]>;
  /** True = can work that slot; derived from unavailabilityBlocks for the solver/CSV. */
  availability: Record<string, boolean>;
}

export interface Department {
  name: string;
  targetHours: number;
  maxHours: number;
}

export interface DepartmentData {
  departments: Department[];
  frontDeskEnabled: boolean;
}

export const DEFAULT_FRONT_DESK_ENABLED = true;

export function normalizeDepartmentData(
  stored?: Partial<DepartmentData> | Department[] | null,
): DepartmentData {
  if (Array.isArray(stored)) {
    return {
      departments: stored,
      frontDeskEnabled: DEFAULT_FRONT_DESK_ENABLED,
    };
  }

  return {
    departments: Array.isArray(stored?.departments) ? stored.departments : [],
    frontDeskEnabled:
      stored?.frontDeskEnabled === undefined
        ? DEFAULT_FRONT_DESK_ENABLED
        : stored.frontDeskEnabled !== false,
  };
}

// ---------------------------------------------------------------------------
// Solver Configuration
// ---------------------------------------------------------------------------

export interface TrainingPair {
  department: string;
  trainee1: string;
  trainee2: string;
}

export interface TimesetRequest {
  employee: string;
  day: string;
  department: string;
  startTime: string;
  endTime: string;
}

export interface FavoredEmployeeDept {
  employee: string;
  department: string;
  multiplier: number; // Strength of preference (0.5 = half, 1.0 = normal, 2.0 = double)
}

export interface ShiftTimePreference {
  employee: string;
  day: string; // Mon, Tue, Wed, Thu, Fri
  preference: 'morning' | 'afternoon'; // morning = 8am-12pm, afternoon = 12pm-5pm
}

export interface EqualityConstraint {
  department: string;
  employee1: string;
  employee2: string;
}

export interface SolverRunConfig {
  staffPath: string;
  deptPath: string;
  frontDeskEnabled?: boolean;
  maxSolveSeconds?: number;
  showProgress?: boolean;
  favoredEmployees?: Record<string, number>; // employee name -> multiplier
  trainingPairs?: TrainingPair[];
  favoredDepartments?: Record<string, number>;
  favoredFrontDeskDepts?: Record<string, number>;
  timesets?: TimesetRequest[];
  favoredEmployeeDepts?: FavoredEmployeeDept[];
  shiftTimePreferences?: ShiftTimePreference[];
  equalityConstraints?: EqualityConstraint[];
  enforceMinDeptBlock?: boolean; // Default true, disable to allow 1-hour dept blocks
  enforceFavoredTwoHourMinimum?: boolean; // Default true, apply 2-hour minimums to favored employees
  // Settings overrides (from Settings panel)
  minSlots?: number;
  maxSlots?: number;
  frontDeskCoverageWeight?: number;
  departmentTargetWeight?: number;
  officeCoverageWeight?: number;
  singleCoverageWeight?: number;
  targetAdherenceWeight?: number;
  collaborativeHoursWeight?: number;
  departmentSpreadWeight?: number;
  departmentDayCoverageWeight?: number;
  shiftLengthWeight?: number;
  shiftTimePreferenceWeight?: number;
  favoredEmployeeDeptWeight?: number;
  underclassmenFrontDeskWeight?: number;
  departmentTotalWeight?: number;
  equalityConstraintWeight?: number;
  departmentHourThreshold?: number;
  targetHardDeltaHours?: number;
  weeklyHourCap?: number;
  favoredStudentDailyMaxHours?: number;
  favoredStudentMinShiftHours?: number;
  favoredStudentTargetPriority?: number;
  favoredStudentFillBonus?: number;
  travelBufferMinutes?: number;
  defaultWeeklyMaxHours?: number;
  defaultTargetHours?: number;
  trainingMinHours?: number;
  trainingOverlapTargetPercent?: number;
  trainingOverlapWeight?: number;
  trainingOverlapBonus?: number;
  collaborationMinCareerEducationHours?: number;
  collaborationMinMarketingHours?: number;
  collaborationMinEmployerEngagementHours?: number;
  collaborationMinEventsHours?: number;
  collaborationMinDataSystemsHours?: number;
  favoredDepartmentTargetMultiplier?: number;
  favoredDepartmentFocusedBonus?: number;
  favoredDepartmentDualPenalty?: number;
  favoredFrontDeskDeptBonus?: number;
  timesetBonusWeight?: number;
  departmentScarcityWeight?: number;
  largeDeviationThresholdHours?: number;
  employeeLargeDeviationPenalty?: number;
  departmentLargeDeviationPenalty?: number;
  year1TargetMultiplier?: number;
  year2TargetMultiplier?: number;
  year3TargetMultiplier?: number;
  year4TargetMultiplier?: number;
}

export interface SolverProgress {
  runId: string;
  percent: number;
  elapsed: number;
  maxTime: number;
  message?: string;
}

export interface SolverResult {
  runId: string;
  success: boolean;
  outputs?: {
    xlsx?: string;
    xlsxFormatted?: string;
  };
  error?: string;
  errorType?: 'error' | 'no_solution' | 'cancelled';
  elapsed: number;
  frontDeskEnabled?: boolean;
}

// ---------------------------------------------------------------------------
// History & Config Snapshots
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  id: string;
  timestamp: string;
  name?: string;
  employeeCount: number;
  departmentCount: number;
  hasXlsx: boolean;
  hasFormattedXlsx: boolean;
  elapsed: number;
}

export interface ConfigSnapshot {
  staff: StaffMember[];
  departments: Department[];
  frontDeskEnabled: boolean;
  favoredEmployees: Record<string, number>; // employee name -> multiplier
  trainingPairs: TrainingPair[];
  favoredDepartments: Record<string, number>;
  favoredFrontDeskDepts: Record<string, number>;
  timesets: TimesetRequest[];
  favoredEmployeeDepts: FavoredEmployeeDept[];
  shiftTimePreferences: ShiftTimePreference[];
  equalityConstraints: EqualityConstraint[];
  maxSolveSeconds: number;
}

export interface ProjectConfigFileV1 {
  app: 'semester-scheduler';
  kind: 'project-config';
  version: 1;
  exportedAt: string;
  config: ConfigSnapshot;
}

export function createDefaultConfigSnapshot(): ConfigSnapshot {
  return {
    staff: [],
    departments: [],
    frontDeskEnabled: DEFAULT_FRONT_DESK_ENABLED,
    favoredEmployees: {},
    trainingPairs: [],
    favoredDepartments: {},
    favoredFrontDeskDepts: {},
    timesets: [],
    favoredEmployeeDepts: [],
    shiftTimePreferences: [],
    equalityConstraints: [],
    maxSolveSeconds: 300,
  };
}

export function normalizeConfigSnapshot(stored?: Partial<ConfigSnapshot> | null): ConfigSnapshot {
  const defaults = createDefaultConfigSnapshot();

  return {
    staff: Array.isArray(stored?.staff) ? stored.staff : defaults.staff,
    departments: Array.isArray(stored?.departments) ? stored.departments : defaults.departments,
    frontDeskEnabled:
      stored?.frontDeskEnabled === undefined
        ? defaults.frontDeskEnabled
        : stored.frontDeskEnabled !== false,
    favoredEmployees:
      stored?.favoredEmployees && typeof stored.favoredEmployees === 'object'
        ? stored.favoredEmployees
        : defaults.favoredEmployees,
    trainingPairs: Array.isArray(stored?.trainingPairs) ? stored.trainingPairs : defaults.trainingPairs,
    favoredDepartments:
      stored?.favoredDepartments && typeof stored.favoredDepartments === 'object'
        ? stored.favoredDepartments
        : defaults.favoredDepartments,
    favoredFrontDeskDepts:
      stored?.favoredFrontDeskDepts && typeof stored.favoredFrontDeskDepts === 'object'
        ? stored.favoredFrontDeskDepts
        : defaults.favoredFrontDeskDepts,
    timesets: Array.isArray(stored?.timesets) ? stored.timesets : defaults.timesets,
    favoredEmployeeDepts: Array.isArray(stored?.favoredEmployeeDepts)
      ? stored.favoredEmployeeDepts
      : defaults.favoredEmployeeDepts,
    shiftTimePreferences: Array.isArray(stored?.shiftTimePreferences)
      ? stored.shiftTimePreferences
      : defaults.shiftTimePreferences,
    equalityConstraints: Array.isArray(stored?.equalityConstraints)
      ? stored.equalityConstraints
      : defaults.equalityConstraints,
    maxSolveSeconds:
      typeof stored?.maxSolveSeconds === 'number' && Number.isFinite(stored.maxSolveSeconds)
        ? stored.maxSolveSeconds
        : defaults.maxSolveSeconds,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationError {
  row?: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  data?: StaffMember[] | Department[];
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface FlagPreset {
  id: string;
  name: string;
  description?: string;
  favoredEmployees: Record<string, number>; // employee name -> multiplier
  trainingPairs: TrainingPair[];
  favoredDepartments: Record<string, number>;
  favoredFrontDeskDepts: Record<string, number>;
  timesets: TimesetRequest[];
  favoredEmployeeDepts: FavoredEmployeeDept[];
  shiftTimePreferences: ShiftTimePreference[];
  equalityConstraints: EqualityConstraint[];
  maxSolveSeconds?: number;
}

// ---------------------------------------------------------------------------
// IPC Channel Definitions
// ---------------------------------------------------------------------------

export interface IpcChannels {
  // Files
  'files:openCsv': (kind: 'staff' | 'dept') => Promise<{ path?: string; content?: string; canceled: boolean }>;
  'files:saveCsvToTemp': (opts: { content: string; filename: string }) => Promise<{ path: string }>;
  'files:saveCsv': (opts: { kind: 'staff' | 'dept'; content: string }) => Promise<{ path?: string; canceled: boolean }>;
  'files:openConfig': () => Promise<{ path?: string; content?: string; canceled: boolean }>;
  'files:saveConfig': (opts: { content: string }) => Promise<{ path?: string; canceled: boolean }>;
  'files:downloadSample': (kind: 'staff' | 'dept') => Promise<{ path?: string; canceled: boolean }>;
  'files:readFile': (path: string) => Promise<{ content: string | null; error: string | null }>;
  'files:saveOutputAs': (opts: { sourcePath: string; defaultName: string }) => Promise<{ path?: string; canceled: boolean }>;
  'files:openInExplorer': (path: string) => Promise<void>;
  
  // Settings
  'settings:load': () => Promise<AppSettings>;
  'settings:save': (settings: AppSettings) => Promise<{ success: boolean }>;
  'settings:reset': () => Promise<AppSettings>;
  
  // Presets
  'presets:list': () => Promise<FlagPreset[]>;
  'presets:save': (preset: FlagPreset) => Promise<{ success: boolean }>;
  'presets:delete': (presetId: string) => Promise<{ success: boolean }>;
  
  // History
  'history:list': () => Promise<HistoryEntry[]>;
  'history:getConfig': (historyId: string) => Promise<{ config: ConfigSnapshot | null; error: string | null }>;
  'history:delete': (historyId: string) => Promise<{ success: boolean }>;
  'history:updateName': (opts: { historyId: string; name: string }) => Promise<{ success: boolean; entry: HistoryEntry | null }>;
  'history:getOutputPath': (opts: { historyId: string; type: 'xlsx' | 'xlsxFormatted' }) => Promise<{ path: string | null; exists: boolean }>;

  // Current project
  'project:loadCurrent': () => Promise<ConfigSnapshot>;
  'project:saveCurrent': (config: ConfigSnapshot) => Promise<{ success: boolean }>;
  
  // Solver
  'solver:run': (opts: { config: SolverRunConfig; snapshot: ConfigSnapshot }) => Promise<{ runId: string | null; error: string | null }>;
  'solver:cancel': () => Promise<{ canceled: boolean; runId: string | null }>;
  'solver:isRunning': () => Promise<{ running: boolean; runId: string | null }>;
  
  // App
  'app:getVersion': () => Promise<string>;
  'app:getPaths': () => Promise<{ userData: string; temp: string; logs: string; history: string }>;
}

// Event channels (main -> renderer)
export interface IpcEvents {
  'solver:progress': SolverProgress;
  'solver:log': { runId: string; text: string; type: 'stdout' | 'stderr' };
  'solver:done': SolverResult;
  'solver:error': { runId: string; error: string };
}
