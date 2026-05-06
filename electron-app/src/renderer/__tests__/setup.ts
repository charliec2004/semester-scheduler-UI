/**
 * Vitest Setup File
 * Mocks Electron APIs for testing
 */

import { vi } from 'vitest';
import { DEFAULT_MAX_SLOTS, DEFAULT_MIN_SLOTS } from '../../shared/constants';

// Mock window.electronAPI
const mockElectronAPI = {
  files: {
    openCsv: vi.fn().mockResolvedValue({ canceled: true }),
    openConfig: vi.fn().mockResolvedValue({ canceled: true }),
    saveCsvToTemp: vi.fn().mockResolvedValue({ path: '/tmp/staff.csv' }),
    saveCsv: vi.fn().mockResolvedValue({ canceled: true }),
    saveConfig: vi.fn().mockResolvedValue({ canceled: true }),
    downloadSample: vi.fn().mockResolvedValue({ canceled: true }),
    readFile: vi.fn().mockResolvedValue({ content: null, error: 'Not found' }),
    saveOutputAs: vi.fn().mockResolvedValue({ canceled: true }),
    openInExplorer: vi.fn().mockResolvedValue(undefined),
  },
  settings: {
    load: vi.fn().mockResolvedValue({
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
    }),
    save: vi.fn().mockResolvedValue({ success: true }),
    reset: vi.fn().mockResolvedValue({}),
  },
  presets: {
    list: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  },
  data: {
    loadStaff: vi.fn().mockResolvedValue([]),
    saveStaff: vi.fn().mockResolvedValue({ success: true }),
    loadDepartments: vi.fn().mockResolvedValue({ departments: [], frontDeskEnabled: true }),
    saveDepartments: vi.fn().mockResolvedValue({ success: true }),
    clearAll: vi.fn().mockResolvedValue({ success: true }),
  },
  history: {
    list: vi.fn().mockResolvedValue([]),
    getConfig: vi.fn().mockResolvedValue({ config: null, error: 'Not found' }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    updateName: vi.fn().mockResolvedValue({ success: true, entry: null }),
    getOutputPath: vi.fn().mockResolvedValue({ path: null, exists: false }),
  },
  project: {
    loadCurrent: vi.fn().mockResolvedValue({
      staff: [],
      departments: [],
      frontDeskEnabled: true,
      favoredEmployees: {},
      trainingPairs: [],
      favoredDepartments: {},
      favoredFrontDeskDepts: {},
      timesets: [],
      favoredEmployeeDepts: [],
      shiftTimePreferences: [],
      equalityConstraints: [],
      maxSolveSeconds: 300,
    }),
    saveCurrent: vi.fn().mockResolvedValue({ success: true }),
  },
  solver: {
    run: vi.fn().mockResolvedValue({ runId: 'test-run', error: null }),
    cancel: vi.fn().mockResolvedValue({ canceled: true, runId: 'test-run' }),
    isRunning: vi.fn().mockResolvedValue({ running: false, runId: null }),
    onProgress: vi.fn().mockReturnValue(() => {}),
    onLog: vi.fn().mockReturnValue(() => {}),
    onDone: vi.fn().mockReturnValue(() => {}),
    onError: vi.fn().mockReturnValue(() => {}),
  },
  app: {
    getVersion: vi.fn().mockResolvedValue('1.0.2'),
    getPaths: vi.fn().mockResolvedValue({
      userData: '/tmp/userData',
      temp: '/tmp',
      logs: '/tmp/logs',
      history: '/tmp/history',
    }),
  },
};

// Set up global mock
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});
