/**
 * Flags & Solve Tab Component
 * Configure solver flags and run the optimization
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronDown, Download, HelpCircle, LoaderCircle, Upload, X } from 'lucide-react';
import { 
  useFlagsStore, 
  useStaffStore, 
  useDepartmentStore, 
  useSolverStore, 
  useSettingsStore,
  useUIStore,
  createConfigSnapshot,
} from '../../store';
import type { TrainingPair, TimesetRequest, FlagPreset, FavoredEmployeeDept, ShiftTimePreference, EqualityConstraint, StaffMember, Department } from '../../../main/ipc-types';
import { useProjectConfigActions } from '../../hooks/useProjectConfigActions';
import { staffToCsv, departmentsToCsv } from '../../utils/csvValidators';
import { DAY_NAMES, DAY_END_MINUTES, TIME_SLOT_STARTS } from '../../../shared/constants';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { DialogShell } from '../ui/dialog-shell';
import { Input } from '../ui/input';
import { NoticePanel } from '../ui/notice-panel';
import { formatHoursValue } from '../../utils/hours';
import { cn } from '../../lib/utils';

// Simple UUID generator for browser compatibility
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const TIME_OPTIONS = [...TIME_SLOT_STARTS, minutesToTimeLabel(DAY_END_MINUTES)];
const MULTIPLIER_OPTIONS = [
  { value: 0.5, label: '0.5x Weak' },
  { value: 1.0, label: '1.0x Normal' },
  { value: 1.5, label: '1.5x Medium' },
  { value: 2.0, label: '2.0x Strong' },
  { value: 3.0, label: '3.0x Very Strong' },
] as const;


function minutesToTimeLabel(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function toggleDepartmentStrength(
  currentValues: Record<string, number>,
  department: string,
  checked: boolean,
): Record<string, number> {
  if (checked) {
    return { ...currentValues, [department]: currentValues[department] ?? 1.0 };
  }

  const { [department]: _removed, ...rest } = currentValues;
  void _removed;
  return rest;
}

function StrengthSelect({
  value,
  disabled,
  onChange,
  ariaLabel,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className={cn('relative w-36 shrink-0', disabled && 'opacity-60')}
      data-strength-select="true"
      onClick={(e) => e.stopPropagation()}
    >
      <select
        value={disabled ? '' : value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(
          'input h-8 w-full pr-8 text-[12px] font-medium',
          disabled && 'cursor-not-allowed text-muted-foreground',
        )}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        {disabled ? (
          <option value="">Strength</option>
        ) : (
          MULTIPLIER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
    </div>
  );
}

function DepartmentPreferenceCard({
  title,
  description,
  departments,
  selectedDepartments,
  onSelectedDepartmentsChange,
  tooltip,
  emptyLabel = 'No departments loaded',
}: {
  title: string;
  description: string;
  departments: string[];
  selectedDepartments: Record<string, number>;
  onSelectedDepartmentsChange: (next: Record<string, number>) => void;
  tooltip: React.ReactNode;
  emptyLabel?: string;
}) {
  const departmentCount = departments.length;

  return (
    <div className="card">
      <div className="mb-3 space-y-1.5">
        <h3 className="flex items-center font-semibold text-surface-200">
          {title}
          <Tooltip text={tooltip} />
        </h3>
        <p className="max-w-[34rem] text-sm leading-6 text-surface-400">{description}</p>
      </div>

      {departmentCount > 0 ? (
        <div className="space-y-1.5">
          {departments.map((department) => {
            const isChecked = department in selectedDepartments;
            const multiplier = selectedDepartments[department] ?? 1.0;

            const handleToggle = (nextChecked: boolean) => {
              onSelectedDepartmentsChange(toggleDepartmentStrength(selectedDepartments, department, nextChecked));
            };

            return (
              <div
                key={department}
                role="checkbox"
                aria-checked={isChecked}
                tabIndex={0}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('[data-strength-select="true"]')) {
                    return;
                  }
                  handleToggle(!isChecked);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle(!isChecked);
                  }
                }}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-1 focus:ring-ring',
                  isChecked
                    ? 'border-surface-700 bg-surface-800/70'
                    : 'border-transparent hover:border-surface-700/70 hover:bg-surface-800/45',
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => handleToggle(checked === true)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-surface-200">{department}</div>
                </div>
                <StrengthSelect
                  value={multiplier}
                  disabled={!isChecked}
                  onChange={(nextValue) =>
                    onSelectedDepartmentsChange({
                      ...selectedDepartments,
                      [department]: nextValue,
                    })
                  }
                  ariaLabel={`${title} strength for ${department}`}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <span className="text-sm text-surface-500">{emptyLabel}</span>
      )}
    </div>
  );
}

function FlagsSection({
  title,
  description,
  children,
  withDivider = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  withDivider?: boolean;
}) {
  return (
    <section
      className={cn(
        'space-y-4',
        withDivider && 'border-t border-border/80 pt-8',
      )}
    >
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-surface-100">{title}</h2>
        <p className="max-w-[44rem] text-sm leading-6 text-surface-400">{description}</p>
      </div>
      {children}
    </section>
  );
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function isFrontDeskRole(value: string): boolean {
  return value.trim().toLowerCase().replace(/\s+/g, '_') === 'front_desk';
}

function getEffectiveRoles(roles: string[], frontDeskEnabled: boolean): string[] {
  return roles.filter((role) => frontDeskEnabled || !isFrontDeskRole(role));
}

export function getFlagsRunBlockingIssues(
  staff: StaffMember[],
  departments: Department[],
  frontDeskEnabled: boolean,
): string[] {
  const issues: string[] = [];

  if (staff.length === 0) {
    issues.push('Import or create staff data.');
  }
  if (departments.length === 0) {
    issues.push('Import or create department data.');
  }

  const blankStaffCount = staff.filter(member => !member.name.trim()).length;
  if (blankStaffCount > 0) {
    issues.push(blankStaffCount === 1 ? 'One employee is missing a name.' : `${blankStaffCount} employees are missing names.`);
  }

  const duplicateStaffNames = Array.from(
    staff.reduce((duplicates, member) => {
      const normalized = normalizeLabel(member.name);
      if (!normalized) {
        return duplicates;
      }
      duplicates.set(normalized, (duplicates.get(normalized) ?? 0) + 1);
      return duplicates;
    }, new Map<string, number>())
      .entries(),
  )
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
  if (duplicateStaffNames.length > 0) {
    issues.push(
      `Duplicate employee names: ${duplicateStaffNames.slice(0, 3).join(', ')}${duplicateStaffNames.length > 3 ? '...' : ''}.`,
    );
  }

  const staffWithNoRoles = staff.filter(member => getEffectiveRoles(member.roles, frontDeskEnabled).length === 0);
  if (staffWithNoRoles.length > 0) {
    issues.push(
      staffWithNoRoles.length === 1
        ? `${staffWithNoRoles[0].name || 'An employee'} has no qualifications.`
        : `${staffWithNoRoles.length} employees have no qualifications.`,
    );
  }

  const invalidStaffHoursCount = staff.filter(member => member.targetHours > member.maxHours).length;
  if (invalidStaffHoursCount > 0) {
    issues.push(
      invalidStaffHoursCount === 1
        ? 'One employee has target hours above max hours.'
        : `${invalidStaffHoursCount} employees have target hours above max hours.`,
    );
  }

  if (frontDeskEnabled) {
    const hasFrontDeskQualifiedEmployee = staff.some(member =>
      member.roles.some((role) => isFrontDeskRole(role)),
    );
    if (!hasFrontDeskQualifiedEmployee) {
      issues.push('At least one employee must be qualified for Front Desk while Front Desk is enabled.');
    }
  }

  const blankDepartmentCount = departments.filter(department => !department.name.trim()).length;
  if (blankDepartmentCount > 0) {
    issues.push(
      blankDepartmentCount === 1
        ? 'One department is missing a name.'
        : `${blankDepartmentCount} departments are missing names.`,
    );
  }

  const duplicateDepartments = Array.from(
    departments.reduce((duplicates, department) => {
      const normalized = normalizeLabel(department.name);
      if (!normalized) {
        return duplicates;
      }
      duplicates.set(normalized, (duplicates.get(normalized) ?? 0) + 1);
      return duplicates;
    }, new Map<string, number>())
      .entries(),
  )
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
  if (duplicateDepartments.length > 0) {
    issues.push(
      `Duplicate departments: ${duplicateDepartments.slice(0, 3).join(', ')}${duplicateDepartments.length > 3 ? '...' : ''}.`,
    );
  }

  const hasReservedFrontDeskDepartment = departments.some(department => isFrontDeskRole(department.name));
  if (hasReservedFrontDeskDepartment) {
    issues.push('Front Desk is built in and cannot be added as a custom department.');
  }

  const invalidDepartmentHoursCount = departments.filter(department => department.targetHours > department.maxHours).length;
  if (invalidDepartmentHoursCount > 0) {
    issues.push(
      invalidDepartmentHoursCount === 1
        ? 'One department has target hours above max hours.'
        : `${invalidDepartmentHoursCount} departments have target hours above max hours.`,
    );
  }

  return issues;
}

export function FlagsSetupBanner() {
  const { activeTab, setActiveTab } = useUIStore();
  const { staff } = useStaffStore();
  const { departments, frontDeskEnabled } = useDepartmentStore();

  const runBlockingIssues = useMemo(
    () => getFlagsRunBlockingIssues(staff, departments, frontDeskEnabled),
    [departments, frontDeskEnabled, staff],
  );
  const canRun = runBlockingIssues.length === 0;

  const staffNames = staff.map(member => normalizeLabel(member.name)).filter(Boolean);
  const departmentLabels = departments.map(department => normalizeLabel(department.name)).filter(Boolean);
  const hasStaffSetupIssues =
    staff.length === 0 ||
    staff.some(member => !member.name.trim()) ||
    staff.some(member => getEffectiveRoles(member.roles, frontDeskEnabled).length === 0) ||
    staff.some(member => member.targetHours > member.maxHours) ||
    new Set(staffNames).size !== staffNames.length;
  const hasDepartmentSetupIssues =
    departments.length === 0 ||
    departments.some(department => !department.name.trim()) ||
    departments.some(department => department.targetHours > department.maxHours) ||
    new Set(departmentLabels).size !== departmentLabels.length;

  if (activeTab !== 'flags' || canRun) {
    return null;
  }

  return (
    <div className="warning-banner">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-[13px]">
        <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="font-semibold">Cannot run solver:</span>
        <span className="text-inherit/95">{runBlockingIssues.join(' ')}</span>
        {(staff.length === 0 || departments.length === 0) && (
          <button
            type="button"
            className="warning-banner-link ml-auto underline underline-offset-4"
            onClick={() => setActiveTab('welcome')}
          >
            Open Welcome
          </button>
        )}
        {hasStaffSetupIssues && (
          <button
            type="button"
            className="warning-banner-link underline underline-offset-4"
            onClick={() => setActiveTab('staff')}
          >
            Review Staff
          </button>
        )}
        {hasDepartmentSetupIssues && (
          <button
            type="button"
            className="warning-banner-link underline underline-offset-4"
            onClick={() => setActiveTab('departments')}
          >
            Review Departments
          </button>
        )}
      </div>
    </div>
  );
}

// Convert 24-hour time to 12-hour format for display
function to12Hour(time24: string): string {
  const [hourStr, min] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${min} ${period}`;
}

// Tooltip component with ? icon - uses fixed positioning to avoid clipping
function Tooltip({ text }: { text: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const handleMouseEnter = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Position below the button, constrained to viewport
      const tooltipWidth = 256; // w-64 = 16rem = 256px
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      // Keep tooltip within viewport with 8px padding
      left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
      setCoords({
        top: rect.bottom + 8,
        left,
      });
    }
    setShow(true);
  };
  
  return (
    <span className="relative ml-1.5 inline-flex shrink-0 -translate-y-0.5 align-middle">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
        onFocus={handleMouseEnter}
        onBlur={() => setShow(false)}
        className="flex h-4 w-4 items-center justify-center text-surface-400 transition-colors hover:text-surface-300"
        aria-label="More information"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {show && createPortal(
        <div 
          className="pointer-events-none fixed z-[100] px-3 py-2 text-xs text-surface-200 bg-surface-800 border border-surface-700 rounded-lg shadow-lg w-64 text-left"
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
        </div>,
        document.body,
      )}
    </span>
  );
}

export function FlagsTab() {
  const {
    favoredEmployees, addFavoredEmployee, removeFavoredEmployee,
    trainingPairs, addTrainingPair, removeTrainingPair,
    favoredDepartments, setFavoredDepartments,
    favoredFrontDeskDepts, setFavoredFrontDeskDepts,
    favoredEmployeeDepts, addFavoredEmployeeDept, removeFavoredEmployeeDept,
    timesets, addTimeset, removeTimeset,
    shiftTimePreferences, addShiftTimePreference, removeShiftTimePreference,
    equalityConstraints, addEqualityConstraint, removeEqualityConstraint,
    maxSolveSeconds, setMaxSolveSeconds,
    presets, savePreset, applyPreset, deletePreset,
  } = useFlagsStore();
  
  const { staff, saveStaff, dirty: staffDirty } = useStaffStore();
  const { departments, frontDeskEnabled, saveDepartments, dirty: deptDirty } = useDepartmentStore();
  const { running, setRunning, reset } = useSolverStore();
  const { settings } = useSettingsStore();
  const { showToast, setActiveTab } = useUIStore();
  const { exportConfig, exporting, importErrors, importing, openConfigPicker } = useProjectConfigActions();

  const [newFavored, setNewFavored] = useState('');
  const [newFavoredMultiplier, setNewFavoredMultiplier] = useState(1.0);
  const [newPresetName, setNewPresetName] = useState('');
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [showOpenConfigWarning, setShowOpenConfigWarning] = useState(false);

  const employeeNames = useMemo(() => staff.map(s => s.name).filter(Boolean), [staff]);
  const departmentNames = useMemo(() => departments.map(d => d.name).filter(Boolean), [departments]);
  const hiddenFrontDeskDepartmentPreferenceCount = !frontDeskEnabled
    ? Object.keys(favoredFrontDeskDepts).length
    : 0;
  const runBlockingIssues = useMemo(
    () => getFlagsRunBlockingIssues(staff, departments, frontDeskEnabled),
    [departments, frontDeskEnabled, staff],
  );
  const canRun = runBlockingIssues.length === 0;

  const handleAddFavored = () => {
    if (newFavored && !(newFavored in favoredEmployees)) {
      addFavoredEmployee(newFavored, newFavoredMultiplier);
      setNewFavored('');
      setNewFavoredMultiplier(1.0);
    }
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;
    
    try {
      const preset: FlagPreset = {
        id: generateId(),
        name: newPresetName.trim(),
        favoredEmployees,
        trainingPairs,
        favoredDepartments,
        favoredFrontDeskDepts,
        favoredEmployeeDepts,
        timesets,
        shiftTimePreferences,
        equalityConstraints,
        maxSolveSeconds,
      };
      
      await savePreset(preset);
      setNewPresetName('');
      setShowPresetDialog(false);
      showToast('Flag preset saved', 'success');
    } catch (error) {
      console.error('Failed to save preset:', error);
      showToast('Failed to save flag preset', 'error');
    }
  };

  const handleRunSolver = async () => {
    if (!canRun) return;
    
    try {
      // Auto-save any unsaved changes before running
      if (staffDirty) {
        await saveStaff();
      }
      if (deptDirty) {
        await saveDepartments();
      }
      
      // Save CSVs to temp files
      const staffCsv = staffToCsv(staff, settings?.travelBufferMinutes);
      const deptCsv = departmentsToCsv(departments);
      const filteredFavoredFrontDeskDepts = frontDeskEnabled ? favoredFrontDeskDepts : {};
      const filteredFavoredEmployeeDepts = frontDeskEnabled
        ? favoredEmployeeDepts
        : favoredEmployeeDepts.filter((entry) => !isFrontDeskRole(entry.department));
      const filteredTimesets = frontDeskEnabled
        ? timesets
        : timesets.filter((timeset) => !isFrontDeskRole(timeset.department));
      
      const staffResult = await window.electronAPI.files.saveCsvToTemp({ 
        content: staffCsv, 
        filename: 'staff.csv' 
      });
      const deptResult = await window.electronAPI.files.saveCsvToTemp({ 
        content: deptCsv, 
        filename: 'departments.csv' 
      });

      // Create config snapshot for history
      const snapshot = createConfigSnapshot();

      // Clear previous result/error before starting
      reset();
      setRunning(true, undefined, frontDeskEnabled);
      
      const result = await window.electronAPI.solver.run({
        config: {
          staffPath: staffResult.path,
          deptPath: deptResult.path,
          frontDeskEnabled,
          maxSolveSeconds: maxSolveSeconds || settings?.solverMaxTime || 300,
          favoredEmployees,
          trainingPairs,
          favoredDepartments,
          favoredFrontDeskDepts: filteredFavoredFrontDeskDepts,
          favoredEmployeeDepts: filteredFavoredEmployeeDepts,
          timesets: filteredTimesets,
          shiftTimePreferences,
          equalityConstraints,
          enforceMinDeptBlock: settings?.enforceMinDeptBlock ?? true,
          enforceFavoredTwoHourMinimum: settings?.enforceFavoredTwoHourMinimum ?? true,
          // Pass all settings to solver
          minSlots: settings?.minSlots,
          maxSlots: settings?.maxSlots,
          frontDeskCoverageWeight: settings?.frontDeskCoverageWeight,
          departmentTargetWeight: settings?.departmentTargetWeight,
          officeCoverageWeight: settings?.officeCoverageWeight,
          singleCoverageWeight: settings?.singleCoverageWeight,
          targetAdherenceWeight: settings?.targetAdherenceWeight,
          collaborativeHoursWeight: settings?.collaborativeHoursWeight,
          departmentSpreadWeight: settings?.departmentSpreadWeight,
          departmentDayCoverageWeight: settings?.departmentDayCoverageWeight,
          shiftLengthWeight: settings?.shiftLengthWeight,
          shiftTimePreferenceWeight: settings?.shiftTimePreferenceWeight,
          favoredEmployeeDeptWeight: settings?.favoredEmployeeDeptWeight,
          underclassmenFrontDeskWeight: settings?.underclassmenFrontDeskWeight,
          departmentTotalWeight: settings?.departmentTotalWeight,
          equalityConstraintWeight: settings?.equalityConstraintWeight,
          departmentHourThreshold: settings?.departmentHourThreshold,
          targetHardDeltaHours: settings?.targetHardDeltaHours,
          weeklyHourCap: settings?.weeklyHourCap,
          favoredStudentDailyMaxHours: settings?.favoredStudentDailyMaxHours,
          favoredStudentMinShiftHours: settings?.favoredStudentMinShiftHours,
          favoredStudentTargetPriority: settings?.favoredStudentTargetPriority,
          favoredStudentFillBonus: settings?.favoredStudentFillBonus,
          travelBufferMinutes: settings?.travelBufferMinutes,
          defaultWeeklyMaxHours: settings?.defaultWeeklyMaxHours,
          defaultTargetHours: settings?.defaultTargetHours,
          trainingMinHours: settings?.trainingMinHours,
          trainingOverlapTargetPercent: settings?.trainingOverlapTargetPercent,
          trainingOverlapWeight: settings?.trainingOverlapWeight,
          trainingOverlapBonus: settings?.trainingOverlapBonus,
          collaborationMinCareerEducationHours: settings?.collaborationMinCareerEducationHours,
          collaborationMinMarketingHours: settings?.collaborationMinMarketingHours,
          collaborationMinEmployerEngagementHours: settings?.collaborationMinEmployerEngagementHours,
          collaborationMinEventsHours: settings?.collaborationMinEventsHours,
          collaborationMinDataSystemsHours: settings?.collaborationMinDataSystemsHours,
          favoredDepartmentTargetMultiplier: settings?.favoredDepartmentTargetMultiplier,
          favoredDepartmentFocusedBonus: settings?.favoredDepartmentFocusedBonus,
          favoredDepartmentDualPenalty: settings?.favoredDepartmentDualPenalty,
          favoredFrontDeskDeptBonus: settings?.favoredFrontDeskDeptBonus,
          timesetBonusWeight: settings?.timesetBonusWeight,
          departmentScarcityWeight: settings?.departmentScarcityWeight,
          largeDeviationThresholdHours: settings?.largeDeviationThresholdHours,
          employeeLargeDeviationPenalty: settings?.employeeLargeDeviationPenalty,
          departmentLargeDeviationPenalty: settings?.departmentLargeDeviationPenalty,
          year1TargetMultiplier: settings?.year1TargetMultiplier,
          year2TargetMultiplier: settings?.year2TargetMultiplier,
          year3TargetMultiplier: settings?.year3TargetMultiplier,
          year4TargetMultiplier: settings?.year4TargetMultiplier,
        },
        snapshot,
      });

      if (result.error) {
        showToast(`Solver error: ${result.error}`, 'error');
        setRunning(false);
      } else {
        showToast('Solver started', 'info');
        setActiveTab('results');
      }
    } catch (err) {
      showToast(`Failed to start solver: ${(err as Error).message}`, 'error');
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-surface-100 mb-1">
            Flags & Solve Configuration
          </h2>
          <p className="text-surface-400">
            Configure optimization preferences and run the scheduler
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => setShowPresetDialog(true)} 
            variant="secondary"
            size="sm"
          >
            Save Flag Preset
          </Button>
          <Button
            type="button"
            onClick={handleRunSolver}
            disabled={!canRun || running}
            size="sm"
          >
            {running ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.8} />
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Generate Schedule
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-surface-200">Project Configuration</h3>
            <p className="mt-1 max-w-[38rem] text-sm leading-6 text-surface-400">
              Open or save a full project file, including linked staff, departments, and solve preferences.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => {
                setShowOpenConfigWarning(true);
              }}
              variant="secondary"
              size="sm"
              disabled={importing}
            >
              <Upload className="h-4 w-4" strokeWidth={1.8} />
              {importing ? 'Opening...' : 'Open Config File'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                void exportConfig();
              }}
              variant="secondary"
              size="sm"
              disabled={exporting}
            >
              <Download className="h-4 w-4" strokeWidth={1.8} />
              {exporting ? 'Saving...' : 'Save Config File'}
            </Button>
          </div>
        </div>
        {importErrors.length > 0 && (
          <NoticePanel variant="error" title={`Import issues (${importErrors.length})`}>
            <ul className="space-y-1">
              {importErrors.map((item, index) => (
                <li key={`${item.message}-${index}`} className="flex items-start gap-2">
                  <span className="text-surface-300">•</span>
                  <span>{item.message}</span>
                </li>
              ))}
            </ul>
          </NoticePanel>
        )}
      </div>

      {/* Presets */}
      {presets.length > 0 && (
        <div className="card">
          <h3 className="mb-4 font-semibold text-surface-200">Saved Flag Presets</h3>
          <div className="flex flex-wrap gap-2">
            {presets.map(preset => (
              <div key={preset.id} className="flex items-stretch bg-surface-800 rounded-lg">
                <button
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 text-sm hover:bg-surface-700/50 transition-colors rounded-l-lg"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="px-2 flex items-center text-surface-400 hover:bg-surface-700/80 hover:text-surface-100 transition-colors rounded-r-lg"
                  aria-label={`Delete flag preset ${preset.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <FlagsSection
        title="Priority Rules"
        description="Soft preferences that guide the solver toward certain employees, departments, and shift patterns without forcing an exact outcome."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Favored Employees */}
          <div className="card">
            <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
              Favored Employees
              <Tooltip text="Favored employees get higher priority to reach their target hours. Use the strength multiplier to control how strongly the solver favors them: 0.5x = weak, 1x = normal, 2x = strong, 3x = very strong." />
            </h3>
            <p className="text-sm text-surface-400 mb-4">
              Prioritize specific employees to hit their target hours
            </p>
            
            <div className="flex gap-2 mb-4 items-end">
              <div className="flex-1">
              <select
                value={newFavored}
                onChange={(e) => setNewFavored(e.target.value)}
                  className="input w-full"
              >
                <option value="">Select employee...</option>
                  {employeeNames.filter(n => !(n in favoredEmployees)).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              </div>
              <div className="w-36 sm:w-40 flex-shrink-0">
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs text-surface-400">Strength</label>
                  <MultiplierTooltip />
                </div>
                <select 
                  value={newFavoredMultiplier} 
                  onChange={(e) => setNewFavoredMultiplier(parseFloat(e.target.value))} 
                  className="input w-full"
                >
                  <option value={0.5}>0.5x Weak</option>
                  <option value={1.0}>1.0x Normal</option>
                  <option value={1.5}>1.5x Medium</option>
                  <option value={2.0}>2.0x Strong</option>
                  <option value={3.0}>3.0x Very Strong</option>
                </select>
              </div>
              <button 
                onClick={handleAddFavored}
                disabled={!newFavored}
                className="btn-secondary flex-shrink-0"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(favoredEmployees).map(([emp, mult]) => (
                <Badge key={emp} variant="secondary" className="gap-1 px-2 py-0.5 text-[12px]">
                  {emp}
                  <span className="text-surface-500">({mult}x)</span>
                  <button
                    onClick={() => removeFavoredEmployee(emp)}
                    className="text-surface-500 transition-colors hover:text-surface-100"
                    aria-label={`Remove ${emp}`}
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                </Badge>
              ))}
              {Object.keys(favoredEmployees).length === 0 && (
                <span className="text-sm text-surface-500">No favored employees</span>
              )}
            </div>
          </div>

          {frontDeskEnabled && (
            <DepartmentPreferenceCard
              title="Favor Departments for Front Desk"
              description="Prioritize members of these departments to cover front desk shifts. At least one member must have front desk qualification."
              departments={departmentNames}
              selectedDepartments={favoredFrontDeskDepts}
              onSelectedDepartmentsChange={setFavoredFrontDeskDepts}
              tooltip="When filling front desk shifts, prioritize employees from these departments. Use the strength multiplier to control priority when multiple departments are favored. Department members must be qualified for front desk."
            />
          )}
          {!frontDeskEnabled && hiddenFrontDeskDepartmentPreferenceCount > 0 && (
            <NoticePanel
              variant="info"
              title="Front Desk department preferences are preserved"
              description={`${hiddenFrontDeskDepartmentPreferenceCount} saved Front Desk department preference${hiddenFrontDeskDepartmentPreferenceCount === 1 ? '' : 's'} ${hiddenFrontDeskDepartmentPreferenceCount === 1 ? 'is' : 'are'} inactive while Front Desk is disabled. Re-enable Front Desk to review or edit ${hiddenFrontDeskDepartmentPreferenceCount === 1 ? 'it' : 'them'}.`}
            />
          )}

          {/* Department Hour Priority */}
          <DepartmentPreferenceCard
            title="Department Hour Priority"
            description="Boost focused hours and target adherence for specific departments."
            departments={departmentNames}
            selectedDepartments={favoredDepartments}
            onSelectedDepartmentsChange={setFavoredDepartments}
            tooltip="Increases the priority for these departments to meet their target hours. Use the strength multiplier to control how aggressively the solver targets these departments. Selected departments will get bonus points for focused work time."
          />

          {/* Favor Employee for Department */}
          <div className="card lg:col-span-2">
          <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
            Favor Employee for Department
            <Tooltip text={frontDeskEnabled
              ? "Adds a soft preference for an employee to work in a specific department or front desk. Use the multiplier to control strength: 0.5x = weak preference, 1x = normal, 2x = strong, 3x = very strong. The employee must be qualified for the role."
              : "Adds a soft preference for an employee to work in a specific department. Use the multiplier to control strength: 0.5x = weak preference, 1x = normal, 2x = strong, 3x = very strong. The employee must be qualified for the role."} />
          </h3>
          <p className="text-sm text-surface-400 mb-4">
            Softly prefer assigning specific employees to specific departments{frontDeskEnabled ? ' or Front Desk' : ''}.
            The employee must be qualified for the role.
          </p>
          
          <FavoredEmployeeDeptForm
            employees={employeeNames}
            departments={departmentNames}
            staff={staff}
            frontDeskEnabled={frontDeskEnabled}
            onAdd={addFavoredEmployeeDept}
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
            {favoredEmployeeDepts.map((fed, i) => (
              <div key={i} className="flex items-center justify-between bg-surface-800 rounded-lg px-3 py-2">
                <span className="text-sm">
                  <span className="font-medium text-surface-200">{fed.employee}</span>
                  <span className="text-surface-400"> → </span>
                  <span className="text-surface-200">{fed.department}</span>
                  <span className="text-surface-500 ml-1">({fed.multiplier || 1}x)</span>
                </span>
                <button 
                  onClick={() => removeFavoredEmployeeDept(i)}
                  className="ml-2 text-surface-400 hover:text-surface-100"
                  aria-label={`Remove ${fed.employee} → ${fed.department}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {favoredEmployeeDepts.length === 0 && (
              <span className="text-sm text-surface-500">No employee-department preferences set</span>
            )}
          </div>
        </div>

          {/* Shift Time Preferences */}
          <div className="card lg:col-span-2">
            <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
              Shift Time Preferences
              <Tooltip text="Softly nudge specific employees toward morning (8am-12pm) or afternoon (12pm-5pm) shifts on certain days. This is a gentle preference that won't override hard constraints, buffered availability, or travel-time trims." />
            </h3>
            <p className="text-sm text-surface-400 mb-4">
              Set soft preferences for when employees should work on specific days
            </p>
            
            <ShiftTimePreferenceForm
              employees={employeeNames}
              onAdd={addShiftTimePreference}
            />

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
              {shiftTimePreferences.map((pref, i) => (
                <div key={i} className="flex items-center justify-between bg-surface-800 rounded-lg px-3 py-2">
                  <span className="text-sm">
                    <span className="font-medium text-surface-200">{pref.employee}</span>
                    <span className="text-surface-400"> on </span>
                    <span className="text-surface-200">{pref.day}</span>
                    <span className="text-surface-400"> → </span>
                    <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
                      {pref.preference === 'morning' ? 'Morning' : 'Afternoon'}
                    </Badge>
                  </span>
                  <button 
                    onClick={() => removeShiftTimePreference(i)}
                    className="ml-2 text-surface-400 hover:text-surface-100"
                    aria-label={`Remove ${pref.employee} ${pref.day} preference`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {shiftTimePreferences.length === 0 && (
                <span className="text-sm text-surface-500">No shift time preferences set</span>
              )}
            </div>
          </div>
        </div>
      </FlagsSection>

      <FlagsSection
        title="Coverage & Coordination"
        description="Rules that coordinate employees together or balance work across people inside the same department."
        withDivider
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Training Pairs */}
          <div className="card lg:col-span-2">
            <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
              Training Pairs
              <Tooltip text="Pairs two employees to work in the same department at overlapping times. Useful for training new employees by scheduling them alongside experienced staff." />
            </h3>
            <p className="text-sm text-surface-400 mb-4">
              Schedule employees to work together for training
            </p>
            
            <TrainingPairForm 
              departments={departmentNames}
              employees={employeeNames}
              staff={staff}
              onAdd={addTrainingPair}
            />

            <div className="space-y-2 mt-4">
              {trainingPairs.map((pair, i) => (
                <div key={i} className="flex items-center justify-between bg-surface-800 rounded-lg px-3 py-2">
                  <span className="text-sm">
                    <span className="text-surface-200">{pair.department}</span>: {pair.trainee1} + {pair.trainee2}
                  </span>
                  <button 
                    onClick={() => removeTrainingPair(i)}
                    className="text-surface-400 hover:text-surface-100"
                    aria-label="Remove training pair"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Equality - Equalize hours between two employees in a department */}
          <div className="card lg:col-span-2">
            <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
              Equality
              <Tooltip text="Equalizes hours between two employees within a specific department only. Both employees must be qualified for the department and have the same target hours. The solver will try to give them equal time in that department, helping ensure fair distribution when two people should get the same opportunity." />
            </h3>
            <p className="text-sm text-surface-400 mb-4">
              Give two employees equal hours in a specific department
            </p>
            
            <EqualityForm
              departments={departmentNames}
              staff={staff}
              onAdd={addEqualityConstraint}
            />

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
              {equalityConstraints.map((eq, i) => (
                <div key={i} className="flex items-center justify-between bg-surface-800 rounded-lg px-3 py-2">
                  <span className="text-sm">
                    <span className="text-surface-200">{eq.department}</span>
                    <span className="text-surface-400">: </span>
                    <span className="font-medium text-surface-200">{eq.employee1}</span>
                    <span className="text-surface-400"> = </span>
                    <span className="font-medium text-surface-200">{eq.employee2}</span>
                  </span>
                  <button 
                    onClick={() => removeEqualityConstraint(i)}
                    className="ml-2 text-surface-400 hover:text-surface-100"
                    aria-label={`Remove ${eq.employee1} = ${eq.employee2} equality`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {equalityConstraints.length === 0 && (
                <span className="text-sm text-surface-500">No equality constraints set</span>
              )}
            </div>
          </div>
        </div>
      </FlagsSection>

      <FlagsSection
        title="Forced Assignments"
        description="Hard requirements that pin an employee to a role and time window. Use sparingly because these constraints can make scheduling impossible."
        withDivider
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Timesets - Force Employee to Role */}
          <div className="card lg:col-span-2">
            <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
              Assign Employee to Role/Time
              <Tooltip text="Creates a hard requirement for an employee to work in a specific department at specific times. Unlike soft preferences, this will be enforced if possible. Use sparingly as too many constraints may make scheduling impossible." />
            </h3>
            <p className="text-sm text-surface-400 mb-4">
              Force a specific employee to work a role at specific times.
              Works with any department, even if the employee is not normally qualified.
            </p>
            
            <TimesetForm
              staff={staff}
              departments={departmentNames}
              frontDeskEnabled={frontDeskEnabled}
              onAdd={addTimeset}
            />

            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              {timesets.map((ts, i) => (
                <div key={i} className="flex items-center justify-between bg-surface-800 rounded-lg px-3 py-2">
                  <span className="text-sm">
                    <span className="font-medium text-surface-200">{ts.employee}</span>
                    <span className="text-surface-400"> → </span>
                    <span className="text-surface-200">{ts.department === 'front_desk' ? 'Front Desk' : ts.department}</span>
                    <span className="text-surface-400"> on </span>
                    <span>{ts.day} {to12Hour(ts.startTime)}-{to12Hour(ts.endTime)}</span>
                  </span>
                  <button 
                    onClick={() => removeTimeset(i)}
                    className="ml-2 text-surface-400 hover:text-surface-100"
                    aria-label="Remove timeset"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FlagsSection>

      <FlagsSection
        title="Solver Settings"
        description="Controls for how long the optimizer searches and how much time it should spend improving the schedule."
        withDivider
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Solver Time */}
          <div className="card">
            <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
              Solver Time Limit
              <Tooltip text={<>The maximum time the optimizer will spend searching for the best schedule. Longer times may find better solutions but take longer. <span className="font-medium text-surface-200">4-6 minutes</span> is recommended for most schedules.</>} />
            </h3>
            <p className="text-sm text-surface-400 mb-4">
              Maximum time the optimizer will search for solutions
            </p>
            
            <div className="space-y-4">
              <input
                type="range"
                min="30"
                max="600"
                step="30"
                value={maxSolveSeconds}
                onChange={(e) => setMaxSolveSeconds(parseInt(e.target.value))}
                className="w-full accent-foreground"
              />
              <div className="flex justify-between text-sm">
                <span className="text-surface-400">30 sec</span>
                <span className="font-medium text-surface-200">{maxSolveSeconds} seconds</span>
                <span className="text-surface-400">10 min</span>
              </div>
            </div>
          </div>
        </div>
      </FlagsSection>

      {/* Save Preset Dialog */}
      {showPresetDialog && (
        <PresetDialog
          value={newPresetName}
          onChange={setNewPresetName}
          onSave={handleSavePreset}
          onClose={() => setShowPresetDialog(false)}
        />
      )}

      <ConfirmDialog
        open={showOpenConfigWarning}
        onOpenChange={setShowOpenConfigWarning}
        title="Replace current project?"
        description="Opening a config file will override the current project, including departments, employees, Front Desk settings, and all Flags & Solve preferences."
        confirmLabel="Open And Replace"
        confirmVariant="destructive"
        onConfirm={() => {
          void openConfigPicker();
        }}
      />
    </div>
  );
}

// Preset Dialog Component with Escape key support
function PresetDialog({
  value,
  onChange,
  onSave,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSave();
    }
  };

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Save flag preset"
      description="Store only the current Flags & Solve choices as a reusable preset. This does not save staff or departments."
      widthClassName="max-w-sm"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="default" size="sm" onClick={onSave} disabled={!value.trim()}>
            Save Flag Preset
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <label className="label" htmlFor="preset-name">
          Flag Preset Name
        </label>
        <Input
          id="preset-name"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Flag preset name..."
          className="input"
          autoFocus
        />
      </div>
    </DialogShell>
  );
}

// Training Pair Form Component
function TrainingPairForm({ 
  departments, 
  employees, 
  staff,
  onAdd 
}: { 
  departments: string[]; 
  employees: string[]; 
  staff: StaffMember[];
  onAdd: (pair: TrainingPair) => void;
}) {
  const [dept, setDept] = useState('');
  const [trainee1, setTrainee1] = useState('');
  const [trainee2, setTrainee2] = useState('');

  // Filter employees who are qualified for the selected department
  const qualifiedEmployees = useMemo(() => {
    if (!dept) return [];
    return employees.filter(empName => {
      const staffMember = staff.find(s => s.name === empName);
      if (!staffMember) return false;
      // Check if employee has this department in their roles
      return staffMember.roles.some(role => 
        role.toLowerCase().replace(/\s+/g, '_') === dept.toLowerCase().replace(/\s+/g, '_')
      );
    });
  }, [dept, employees, staff]);

  const handleDeptChange = (newDept: string) => {
    setDept(newDept);
    // Reset trainees when department changes
    setTrainee1('');
    setTrainee2('');
  };

  const handleAdd = () => {
    if (dept && trainee1 && trainee2 && trainee1 !== trainee2) {
      onAdd({ department: dept, trainee1, trainee2 });
      setDept('');
      setTrainee1('');
      setTrainee2('');
    }
  };

  return (
    <div className="flex flex-wrap sm:flex-nowrap gap-2">
      <select value={dept} onChange={(e) => handleDeptChange(e.target.value)} className="input w-full sm:flex-1">
        <option value="">Department</option>
        {departments.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select 
        value={trainee1} 
        onChange={(e) => setTrainee1(e.target.value)} 
        className="input w-[calc(50%-0.25rem)] sm:flex-1"
        disabled={!dept}
      >
        <option value="">Person 1</option>
        {qualifiedEmployees.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      <select 
        value={trainee2} 
        onChange={(e) => setTrainee2(e.target.value)} 
        className="input w-[calc(50%-0.25rem)] sm:flex-1"
        disabled={!dept}
      >
        <option value="">Person 2</option>
        {qualifiedEmployees.filter(e => e !== trainee1).map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      <button 
        onClick={handleAdd} 
        disabled={!dept || !trainee1 || !trainee2}
        className="btn-secondary flex-shrink-0 px-4 w-full sm:w-auto"
      >
        +
      </button>
    </div>
  );
}

// Timeset Form Component - Shows all departments (not just qualified ones)
function TimesetForm({
  staff,
  departments,
  frontDeskEnabled,
  onAdd,
}: {
  staff: StaffMember[];
  departments: string[];
  frontDeskEnabled: boolean;
  onAdd: (ts: TimesetRequest) => void;
}) {
  const [employee, setEmployee] = useState('');
  const [day, setDay] = useState('');
  const [department, setDepartment] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // All departments plus Front Desk option
  const allRoles = useMemo(() => {
    const normalized = departments.map(d => d.toLowerCase().replace(/\s+/g, '_'));
    if (frontDeskEnabled && !normalized.includes('front_desk')) {
      normalized.push('front_desk');
    }
    return normalized;
  }, [departments, frontDeskEnabled]);

  // Reset dependent fields when employee changes
  const handleEmployeeChange = (name: string) => {
    setEmployee(name);
    setDay('');
    setDepartment('');
    setStartTime('');
    setEndTime('');
  };

  // Reset time fields when department changes
  const handleDepartmentChange = (dept: string) => {
    setDepartment(dept);
    setStartTime('');
    setEndTime('');
  };

  const handleAdd = () => {
    if (employee && day && department && startTime && endTime) {
      onAdd({ employee, day, department, startTime, endTime });
      setEmployee('');
      setDay('');
      setDepartment('');
      setStartTime('');
      setEndTime('');
    }
  };

  const employeeNames = staff.map(s => s.name).filter(Boolean);

  return (
    <div className="grid grid-cols-6 gap-2">
      {/* 1. Employee - always enabled */}
      <select value={employee} onChange={(e) => handleEmployeeChange(e.target.value)} className="input">
        <option value="">Employee</option>
        {employeeNames.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      
      {/* 2. Day - enabled after employee */}
      <select 
        value={day} 
        onChange={(e) => setDay(e.target.value)} 
        className="input"
        disabled={!employee}
      >
        <option value="">{employee ? 'Day' : 'Select employee first'}</option>
        {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      
      {/* 3. Department - enabled after employee, shows all departments */}
      <select
        value={department}
        onChange={(e) => handleDepartmentChange(e.target.value)}
        className="input"
        disabled={!employee}
      >
        <option value="">{employee ? 'Role' : 'Select employee first'}</option>
        {allRoles.map(role => (
          <option key={role} value={role}>
            {role === 'front_desk' ? 'Front Desk' : role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </option>
        ))}
      </select>
      
      {/* 4. Start time - enabled after department */}
      <select 
        value={startTime} 
        onChange={(e) => { setStartTime(e.target.value); setEndTime(''); }} 
        className="input"
        disabled={!department}
      >
        <option value="">{department ? 'Start' : 'Select role first'}</option>
        {TIME_OPTIONS.slice(0, -1).map(t => <option key={t} value={t}>{to12Hour(t)}</option>)}
      </select>
      
      {/* 5. End time - enabled after start time */}
      <select 
        value={endTime} 
        onChange={(e) => setEndTime(e.target.value)} 
        className="input"
        disabled={!startTime}
      >
        <option value="">{startTime ? 'End' : 'Select start first'}</option>
        {TIME_OPTIONS.filter(t => t > startTime).map(t => <option key={t} value={t}>{to12Hour(t)}</option>)}
      </select>
      
      {/* 6. Add button */}
      <button 
        onClick={handleAdd}
        disabled={!employee || !day || !department || !startTime || !endTime}
        className="btn-secondary"
      >
        Add
      </button>
    </div>
  );
}

// Shift Time Preference Form Component
function ShiftTimePreferenceForm({
  employees,
  onAdd,
}: {
  employees: string[];
  onAdd: (pref: ShiftTimePreference) => void;
}) {
  const [employee, setEmployee] = useState('');
  const [day, setDay] = useState('');
  const [preference, setPreference] = useState<'morning' | 'afternoon'>('morning');

  const handleAdd = () => {
    if (employee && day) {
      onAdd({ employee, day, preference });
      setEmployee('');
      setDay('');
      setPreference('morning');
    }
  };

  return (
    <div className="flex flex-wrap sm:flex-nowrap gap-2">
      <select 
        value={employee} 
        onChange={(e) => setEmployee(e.target.value)} 
        className="input w-full sm:flex-1"
      >
        <option value="">Employee</option>
        {employees.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      <select 
        value={day} 
        onChange={(e) => setDay(e.target.value)} 
        className="input w-[calc(50%-0.25rem)] sm:w-36"
      >
        <option value="">Day</option>
        {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select 
        value={preference} 
        onChange={(e) => setPreference(e.target.value as 'morning' | 'afternoon')} 
        className="input w-[calc(50%-0.25rem)] sm:w-56"
      >
        <option value="morning">Morning (8-12)</option>
        <option value="afternoon">Afternoon (12-5)</option>
      </select>
      <button 
        onClick={handleAdd}
        disabled={!employee || !day}
        className="btn-secondary flex-shrink-0 px-4 w-full sm:w-auto"
      >
        Add
      </button>
    </div>
  );
}

// Multiplier tooltip for the form
function MultiplierTooltip() {
  const [show, setShow] = useState(false);
  
  return (
    <span className="relative inline-flex shrink-0 -translate-y-0.5 align-middle">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="flex h-4 w-4 items-center justify-center text-surface-400 transition-colors hover:text-surface-300"
        aria-label="Multiplier explanation"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-surface-200 bg-surface-800 border border-surface-700 rounded-lg shadow-lg w-56 text-left">
          <strong className="text-surface-100">Multiplier strength:</strong>
          <ul className="mt-1 space-y-0.5">
            <li><span className="text-surface-400">0.5x</span> - Weak preference</li>
            <li><span className="text-surface-400">1.0x</span> - Normal (default)</li>
            <li><span className="text-surface-400">2.0x</span> - Strong preference</li>
            <li><span className="text-surface-400">3.0x</span> - Very strong</li>
          </ul>
          <p className="mt-1.5 text-surface-400">Higher = solver tries harder to assign this employee to this role.</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-surface-800" />
          </div>
        </div>
      )}
    </span>
  );
}

// Favored Employee-Department Form Component
function FavoredEmployeeDeptForm({
  employees,
  departments,
  staff,
  frontDeskEnabled,
  onAdd,
}: {
  employees: string[];
  departments: string[];
  staff: StaffMember[];
  frontDeskEnabled: boolean;
  onAdd: (fed: FavoredEmployeeDept) => void;
}) {
  const [employee, setEmployee] = useState('');
  const [department, setDepartment] = useState('');
  const [multiplier, setMultiplier] = useState(1.0);

  // Get departments + front_desk the selected employee is qualified for
  const qualifiedRoles = useMemo(() => {
    if (!employee) return [];
    const staffMember = staff.find(s => s.name === employee);
    if (!staffMember) return [];
    
    const roles: string[] = [];
    
    // Check if qualified for front_desk
    if (frontDeskEnabled && staffMember.roles.some(role => 
      role.toLowerCase().replace(/\s+/g, '_') === 'front_desk'
    )) {
      roles.push('front_desk');
    }
    
    // Add departments the employee is qualified for
    departments.forEach(dept => {
      if (staffMember.roles.some(role => 
        role.toLowerCase().replace(/\s+/g, '_') === dept.toLowerCase().replace(/\s+/g, '_')
      )) {
        roles.push(dept);
      }
    });
    
    return roles;
  }, [departments, employee, frontDeskEnabled, staff]);

  const handleAdd = () => {
    if (employee && department) {
      onAdd({ employee, department, multiplier });
      setEmployee('');
      setDepartment('');
      setMultiplier(1.0);
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <select value={employee} onChange={(e) => { setEmployee(e.target.value); setDepartment(''); }} className="input w-full">
        <option value="">Select employee...</option>
        {employees.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      </div>
      <div className="flex-1">
      <select 
        value={department} 
        onChange={(e) => setDepartment(e.target.value)} 
          className="input w-full"
        disabled={!employee}
      >
        <option value="">{employee ? 'Select role...' : 'Select employee first'}</option>
        {qualifiedRoles.map(d => (
          <option key={d} value={d}>
              {d === 'front_desk' ? 'Front Desk' : d}
          </option>
        ))}
      </select>
      </div>
      <div className="w-36 sm:w-40 flex-shrink-0">
        <div className="flex items-center gap-1 mb-1">
          <label className="text-xs text-surface-400">Strength</label>
          <MultiplierTooltip />
        </div>
        <select 
          value={multiplier} 
          onChange={(e) => setMultiplier(parseFloat(e.target.value))} 
          className="input w-full"
        >
          <option value={0.5}>0.5x Weak</option>
          <option value={1.0}>1.0x Normal</option>
          <option value={1.5}>1.5x Medium</option>
          <option value={2.0}>2.0x Strong</option>
          <option value={3.0}>3.0x Very Strong</option>
        </select>
      </div>
      <button 
        onClick={handleAdd}
        disabled={!employee || !department}
        className="btn-secondary flex-shrink-0"
      >
        Add
      </button>
    </div>
  );
}

// Equality Form Component - Left-to-right input with target hours validation
function EqualityForm({
  departments,
  staff,
  onAdd,
}: {
  departments: string[];
  staff: StaffMember[];
  onAdd: (eq: EqualityConstraint) => void;
}) {
  const [department, setDepartment] = useState('');
  const [employee1, setEmployee1] = useState('');
  const [employee2, setEmployee2] = useState('');
  const [validationError, setValidationError] = useState('');

  // Get employees qualified for the selected department
  const qualifiedEmployees = useMemo(() => {
    if (!department) return [];
    return staff.filter(s => {
      // Check if employee has this department in their roles
      return s.roles.some(role => 
        role.toLowerCase().replace(/\s+/g, '_') === department.toLowerCase().replace(/\s+/g, '_')
      );
    });
  }, [department, staff]);

  // Get qualified employee names (excluding already selected employee1)
  const qualifiedNames1 = useMemo(() => qualifiedEmployees.map(e => e.name), [qualifiedEmployees]);
  const qualifiedNames2 = useMemo(() => 
    qualifiedEmployees.filter(e => e.name !== employee1).map(e => e.name), 
    [qualifiedEmployees, employee1]
  );

  // Validate target hours match
  useEffect(() => {
    if (employee1 && employee2) {
      const emp1Data = staff.find(s => s.name === employee1);
      const emp2Data = staff.find(s => s.name === employee2);
      if (emp1Data && emp2Data && emp1Data.targetHours !== emp2Data.targetHours) {
        setValidationError(`Target hours mismatch: ${employee1} has ${formatHoursValue(emp1Data.targetHours)} hrs, ${employee2} has ${formatHoursValue(emp2Data.targetHours)} hrs`);
      } else {
        setValidationError('');
      }
    } else {
      setValidationError('');
    }
  }, [employee1, employee2, staff]);

  const handleDepartmentChange = (dept: string) => {
    setDepartment(dept);
    setEmployee1('');
    setEmployee2('');
    setValidationError('');
  };

  const handleEmployee1Change = (emp: string) => {
    setEmployee1(emp);
    setEmployee2('');
  };

  const handleAdd = () => {
    if (department && employee1 && employee2 && !validationError) {
      onAdd({ department, employee1, employee2 });
      setDepartment('');
      setEmployee1('');
      setEmployee2('');
      setValidationError('');
    }
  };

  const canAdd = department && employee1 && employee2 && !validationError;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap sm:flex-nowrap gap-2">
        {/* 1. Department - always enabled */}
        <select 
          value={department} 
          onChange={(e) => handleDepartmentChange(e.target.value)} 
          className="input w-full sm:flex-1"
        >
          <option value="">Department</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        
        {/* 2. Employee 1 - enabled after department */}
        <select 
          value={employee1} 
          onChange={(e) => handleEmployee1Change(e.target.value)} 
          className="input w-full sm:flex-1"
          disabled={!department}
        >
          <option value="">{department ? 'Person 1' : 'Select department first'}</option>
          {qualifiedNames1.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        
        {/* 3. Employee 2 - enabled after employee 1 */}
        <select 
          value={employee2} 
          onChange={(e) => setEmployee2(e.target.value)} 
          className="input w-full sm:flex-1"
          disabled={!employee1}
        >
          <option value="">{employee1 ? 'Person 2' : 'Select person 1 first'}</option>
          {qualifiedNames2.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        
        {/* 4. Add button */}
        <button 
          onClick={handleAdd}
          disabled={!canAdd}
          className="btn-secondary flex-shrink-0 px-4 w-full sm:w-auto"
        >
          Add
        </button>
      </div>
      
      {/* Validation error message */}
      {validationError && (
        <NoticePanel
          variant="neutral"
          className="py-2"
          icon={<AlertTriangle className="h-4 w-4 text-surface-300" strokeWidth={1.8} />}
          description={validationError}
        />
      )}
    </div>
  );
}
