/**
 * Settings Panel Component
 * Slide-out panel for configuring solver parameters and UI preferences
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Bug, CheckCircle2, ChevronDown, Copy, Download, HelpCircle, RefreshCw, Trash2, X } from 'lucide-react';
import { useSettingsStore, useUIStore, useStaffStore, useDepartmentStore, useFlagsStore } from '../../store';
import { DEFAULT_SETTINGS, type AppSettings } from '../../../main/ipc-types';
import { DEFAULT_MAX_SLOTS, DEFAULT_MIN_SLOTS, SLOT_MINUTES, TIME_SLOT_STARTS } from '../../../shared/constants';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { HourInput } from '../ui/hour-input';
import { NoticePanel } from '../ui/notice-panel';

function SettingsBooleanRow({
  id,
  checked,
  onCheckedChange,
  label,
  description,
  tooltip,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  tooltip?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border/70 bg-surface-900/40 px-3 py-2.5 transition-colors hover:border-surface-600"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center text-[13px] font-medium text-surface-200">
          {label}
          {tooltip && <Tooltip text={tooltip} />}
        </span>
        {description && (
          <span className="mt-0.5 block text-[12px] leading-5 text-surface-400">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

// Tooltip component with ? icon - uses fixed positioning to avoid clipping
function Tooltip({ text }: { text: string }) {
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
          className="pointer-events-none fixed z-[100] w-64 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-left text-xs text-surface-200 shadow-lg"
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
        </div>,
        document.body,
      )}
    </span>
  );
}

type UpdateStatus = 
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string; releaseNotes?: string }
  | { state: 'not-available' }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string };

export function SettingsPanel() {
  const { settings, saveSettings, resetSettings } = useSettingsStore();
  const { setShowSettings, showToast } = useUIStore();
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [showAdvancedSolverTuning, setShowAdvancedSolverTuning] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' });
  const [pendingConfirmAction, setPendingConfirmAction] = useState<'reset' | 'clear-data' | null>(null);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const lastSavedSettingsRef = useRef('');
  const isMac = navigator.platform.toLowerCase().includes('mac');

  // Fetch app version from Electron (reads from package.json)
  useEffect(() => {
    window.electronAPI.app.getVersion().then(setAppVersion).catch(() => setAppVersion('unknown'));
  }, []);

  // Listen for update status changes
  useEffect(() => {
    const unsubscribe = window.electronAPI.updater.onStatusChange(setUpdateStatus);
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (settings) {
      const nextSettings = { ...settings };
      lastSavedSettingsRef.current = JSON.stringify(nextSettings);
      setLocalSettings(nextSettings);
    }
  }, [settings]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPreparedSettings = (candidate: AppSettings, { allowFallbacks }: { allowFallbacks: boolean }) => {
    const nextSettings = { ...candidate } as AppSettings;
    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS) as Array<
      [keyof AppSettings, AppSettings[keyof AppSettings]]
    >) {
      if (typeof defaultValue !== 'number') {
        continue;
      }
      const currentValue = nextSettings[key];
      if (typeof currentValue !== 'number' || Number.isNaN(currentValue)) {
        if (!allowFallbacks) {
          return null;
        }
        nextSettings[key] = defaultValue as never;
      }
    }
    return nextSettings;
  };

  const persistSettings = async (
    candidate: AppSettings,
    { allowFallbacks = false, showErrorToast = true }: { allowFallbacks?: boolean; showErrorToast?: boolean } = {},
  ) => {
    const preparedSettings = getPreparedSettings(candidate, { allowFallbacks });
    if (!preparedSettings) {
      return false;
    }

    const serialized = JSON.stringify(preparedSettings);
    if (serialized === lastSavedSettingsRef.current) {
      return true;
    }

    try {
      await saveSettings(preparedSettings);
      lastSavedSettingsRef.current = serialized;
      return true;
    } catch (err) {
      if (showErrorToast) {
        showToast('Failed to save settings', 'error');
      }
      return false;
    }
  };

  useEffect(() => {
    if (!localSettings) {
      return;
    }

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      void persistSettings(localSettings, { allowFallbacks: false, showErrorToast: true });
      autosaveTimeoutRef.current = null;
    }, 250);

    return () => {
      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSettings]);

  const handleClose = async () => {
    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    if (localSettings) {
      await persistSettings(localSettings, { allowFallbacks: true, showErrorToast: true });
    }
    setShowSettings(false);
  };

  const handleReset = async () => {
    setPendingConfirmAction('reset');
  };

  const handleClearAllData = async () => {
    setPendingConfirmAction('clear-data');
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirmAction) return;

    if (pendingConfirmAction === 'reset') {
      try {
        const newSettings = await resetSettings();
        setLocalSettings(newSettings);
        showToast('Settings reset to defaults', 'success');
      } catch (err) {
        console.error('Failed to reset settings:', err);
        showToast('Failed to reset settings', 'error');
      } finally {
        setPendingConfirmAction(null);
      }
      return;
    }

    try {
      const result = await window.electronAPI.data.clearAll();
      if (result.success) {
        useStaffStore.getState().clearStaff();
        useDepartmentStore.getState().clearDepartments();
        useFlagsStore.getState().clearPresets();
        useFlagsStore.getState().reset();
        showToast('All data cleared', 'success');
        handleClose();
      } else {
        showToast('Failed to clear data', 'error');
      }
    } catch (err) {
      console.error('Failed to clear data:', err);
      showToast('Failed to clear data', 'error');
    } finally {
      setPendingConfirmAction(null);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (localSettings) {
      setLocalSettings({ ...localSettings, [key]: value });
    }
  };

  // Handle number input changes - allow empty/invalid values during typing
  const handleNumberChange = (key: keyof AppSettings, value: string) => {
    if (localSettings) {
      const num = value === '' ? NaN : Number(value);
      setLocalSettings({ ...localSettings, [key]: num as AppSettings[typeof key] });
    }
  };

  // Apply default value on blur if field is empty/invalid
  const handleNumberBlur = (key: keyof AppSettings, defaultValue: number) => {
    if (localSettings) {
      const current = localSettings[key];
      if (typeof current !== 'number' || isNaN(current)) {
        setLocalSettings({ ...localSettings, [key]: defaultValue as AppSettings[typeof key] });
      }
    }
  };

  // Get display value for number inputs (show empty string for NaN)
  const getNumberValue = (value: number): string => {
    return isNaN(value) ? '' : String(value);
  };

  const handleCheckForUpdates = async () => {
    try {
      const status = await window.electronAPI.updater.checkForUpdates();
      
      if (status.state === 'available') {
        showToast(`Update available: v${status.version}`, 'success');
      } else if (status.state === 'not-available') {
        showToast('You are running the latest version', 'success');
      } else if (status.state === 'error') {
        showToast(`Update check failed: ${status.message}`, 'error');
      }
    } catch (err) {
      console.error('Update check failed:', err);
      showToast('Failed to check for updates', 'error');
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      await window.electronAPI.updater.downloadAndInstall();
    } catch (err) {
      console.error('Download failed:', err);
      showToast('Failed to download update', 'error');
    }
  };

  const handleInstallUpdate = () => {
    window.electronAPI.updater.quitAndInstall();
  };

  const handleCopyMacBypassCommand = async () => {
    try {
      await navigator.clipboard.writeText('xattr -cr /Applications/Scheduler.app');
      showToast('Copied terminal command', 'success');
    } catch (err) {
      console.error('Failed to copy updater command:', err);
      showToast('Failed to copy command', 'error');
    }
  };

  // Lock main content scroll when modal is open
  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.overflow = 'hidden';
    }
    return () => {
      if (mainContent) {
        mainContent.style.overflow = '';
      }
    };
  }, []);

  if (!localSettings) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm"
          onClick={() => void handleClose()}
          aria-hidden="true"
        />

        {/* Panel */}
        <div 
          className="relative w-full max-w-md overflow-y-auto border-l border-surface-700 bg-surface-900 animate-slide-in-right"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
        >
        {/* Header */}
        <div className="sticky top-0 z-[60] flex items-center justify-between border-b border-surface-700 bg-surface-900/95 px-5 py-3 backdrop-blur">
          <h2 id="settings-title" className="text-base font-display font-semibold">Settings</h2>
          <Button 
            onClick={() => void handleClose()}
            variant="ghost"
            size="icon-sm"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-7 p-5">
          <section className="space-y-4">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-surface-100">
                Scheduling Rules
                <Tooltip text="Core guardrails the solver must respect when it builds shifts." />
              </h3>
              <p className="text-xs leading-5 text-surface-400">
                Set the basic rules for shift length, weekly caps, and travel buffers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="minSlots">
                  Min Shift Slots
                  <Tooltip text={`Minimum shift length in ${SLOT_MINUTES}-minute slots. ${DEFAULT_MIN_SLOTS} means the solver will usually avoid shifts shorter than 2 hours. Favoring an employee does not override this general minimum, but favored employees can still use the separate Favored Student Minimum Shift setting.`} />
                </label>
                <input
                  id="minSlots"
                  type="number"
                  min="1"
                  max={TIME_SLOT_STARTS.length}
                  value={getNumberValue(localSettings.minSlots)}
                  onChange={(e) => handleNumberChange('minSlots', e.target.value)}
                  onBlur={() => handleNumberBlur('minSlots', DEFAULT_MIN_SLOTS)}
                  className="input"
                />
                <p className="mt-1 text-xs text-surface-500">{SLOT_MINUTES}-minute slots per shift minimum</p>
              </div>

              <div>
                <label className="label" htmlFor="maxSlots">
                  Max Shift Slots
                  <Tooltip text={`Maximum shift length in ${SLOT_MINUTES}-minute slots. ${DEFAULT_MAX_SLOTS} means shifts can be up to 4 hours unless another rule explicitly requires more. Favoring an employee does not override this maximum.`} />
                </label>
                <input
                  id="maxSlots"
                  type="number"
                  min="1"
                  max={TIME_SLOT_STARTS.length}
                  value={getNumberValue(localSettings.maxSlots)}
                  onChange={(e) => handleNumberChange('maxSlots', e.target.value)}
                  onBlur={() => handleNumberBlur('maxSlots', DEFAULT_MAX_SLOTS)}
                  className="input"
                />
                <p className="mt-1 text-xs text-surface-500">{SLOT_MINUTES}-minute slots per shift maximum</p>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="weeklyHourCap">
                Weekly Hour Cap
                <Tooltip text="Universal weekly cap applied to everyone. The solver always uses the stricter of each employee's personal weekly max and this cap. Favoring an employee does not override it." />
              </label>
              <HourInput
                id="weeklyHourCap"
                min="1"
                max="40"
                value={localSettings.weeklyHourCap}
                onValueChange={(value) => updateSetting('weeklyHourCap', value)}
              />
              <p className="mt-1 text-xs text-surface-500">Default 19 hours. Lower personal max-hours still win.</p>
            </div>

            <div>
              <label className="label" htmlFor="travelBufferMinutes">
                Travel Buffer Minutes
                <Tooltip text="How much extra time to block before or after a class or commitment when a buffer checkbox is turned on. Use multiples of 10 minutes to match the schedule grid. Favoring an employee does not override this buffer." />
              </label>
              <input
                id="travelBufferMinutes"
                type="number"
                min="0"
                max="60"
                step="10"
                value={getNumberValue(localSettings.travelBufferMinutes)}
                onChange={(e) => handleNumberChange('travelBufferMinutes', e.target.value)}
                onBlur={() => handleNumberBlur('travelBufferMinutes', 10)}
                className="input"
              />
              <p className="mt-1 text-xs text-surface-500">Used in the staff availability editor, CSV export, and solver.</p>
            </div>

            <SettingsBooleanRow
              id="enforceMinDeptBlock"
              checked={localSettings.enforceMinDeptBlock}
              onCheckedChange={(checked) => updateSetting('enforceMinDeptBlock', checked)}
              label="Enforce 2-hour minimum department blocks"
              description="Keep non-Front-Desk department work from being split into awkward 1-hour fragments."
              tooltip="When enabled, non-Front-Desk department assignments usually need to be at least 2 hours long. Favoring an employee can partially relax this inside longer shifts, but it still does not let a 2-hour shift be split across two departments. Explicit timesets can still override the rule."
            />
          </section>

          <section className="space-y-4 border-t border-surface-800 pt-6">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-surface-100">
                Priority Weights
                <Tooltip text="These values decide what the solver cares about most. Higher numbers make a rule more important when the solver has to choose between tradeoffs." />
              </h3>
              <p className="text-xs leading-5 text-surface-400">
                Most teams can leave these near their defaults. Raise a value only when the solver is consistently under-prioritizing that behavior.
              </p>
              <p className="text-xs leading-5 text-surface-500">
                Reference point: small weights are often around <span className="font-medium text-surface-400">1-50</span>, medium weights around <span className="font-medium text-surface-400">100-1,000</span>, and very large weights around <span className="font-medium text-surface-400">5,000-10,000+</span>.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="frontDeskCoverageWeight">
                  Front Desk Coverage
                  <Tooltip text="How strongly the solver should protect front desk coverage. This should usually stay among the highest values." />
                </label>
                <input
                  id="frontDeskCoverageWeight"
                  type="number"
                  min="0"
                  max="50000"
                  step="100"
                  value={getNumberValue(localSettings.frontDeskCoverageWeight)}
                  onChange={(e) => handleNumberChange('frontDeskCoverageWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('frontDeskCoverageWeight', 10000)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="officeCoverageWeight">
                  Office Coverage
                  <Tooltip text="Bonus for having more than one person working at the same time. Raise this if you want less solo coverage overall." />
                </label>
                <input
                  id="officeCoverageWeight"
                  type="number"
                  min="0"
                  max="5000"
                  step="10"
                  value={getNumberValue(localSettings.officeCoverageWeight)}
                  onChange={(e) => handleNumberChange('officeCoverageWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('officeCoverageWeight', 150)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="singleCoverageWeight">
                  Single Coverage Penalty
                  <Tooltip text="Penalty for leaving only one person working at a time. Raise this if being alone in the office is a bigger concern." />
                </label>
                <input
                  id="singleCoverageWeight"
                  type="number"
                  min="0"
                  max="10000"
                  step="10"
                  value={getNumberValue(localSettings.singleCoverageWeight)}
                  onChange={(e) => handleNumberChange('singleCoverageWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('singleCoverageWeight', 500)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="departmentTargetWeight">
                  Department Target Adherence
                  <Tooltip text="How hard the solver should try to hit each department's requested hours." />
                </label>
                <input
                  id="departmentTargetWeight"
                  type="number"
                  min="0"
                  max="10000"
                  step="10"
                  value={getNumberValue(localSettings.departmentTargetWeight)}
                  onChange={(e) => handleNumberChange('departmentTargetWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('departmentTargetWeight', 1000)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="targetAdherenceWeight">
                  Employee Target Adherence
                  <Tooltip text="How strongly the solver tries to keep each employee near their target hours." />
                </label>
                <input
                  id="targetAdherenceWeight"
                  type="number"
                  min="0"
                  max="5000"
                  step="10"
                  value={getNumberValue(localSettings.targetAdherenceWeight)}
                  onChange={(e) => handleNumberChange('targetAdherenceWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('targetAdherenceWeight', 100)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="collaborativeHoursWeight">
                  Collaborative Hours
                  <Tooltip text="Bonus for scheduling overlapping department work so students can collaborate or train together." />
                </label>
                <input
                  id="collaborativeHoursWeight"
                  type="number"
                  min="0"
                  max="5000"
                  step="10"
                  value={getNumberValue(localSettings.collaborativeHoursWeight)}
                  onChange={(e) => handleNumberChange('collaborativeHoursWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('collaborativeHoursWeight', 200)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="departmentSpreadWeight">
                  Department Spread
                  <Tooltip text="Bonus for spreading department presence across more parts of the day instead of bunching all hours together." />
                </label>
                <input
                  id="departmentSpreadWeight"
                  type="number"
                  min="0"
                  max="5000"
                  step="10"
                  value={getNumberValue(localSettings.departmentSpreadWeight)}
                  onChange={(e) => handleNumberChange('departmentSpreadWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('departmentSpreadWeight', 60)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="shiftLengthWeight">
                  Shift Length Bonus
                  <Tooltip text="Bonus for longer, fewer shifts instead of many short shifts." />
                </label>
                <input
                  id="shiftLengthWeight"
                  type="number"
                  min="0"
                  max="1000"
                  step="5"
                  value={getNumberValue(localSettings.shiftLengthWeight)}
                  onChange={(e) => handleNumberChange('shiftLengthWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('shiftLengthWeight', 20)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="shiftTimePreferenceWeight">
                  Shift Time Preference
                  <Tooltip text="How much the solver should honor morning or afternoon preferences when you add them in Flags." />
                </label>
                <input
                  id="shiftTimePreferenceWeight"
                  type="number"
                  min="0"
                  max="1000"
                  step="5"
                  value={getNumberValue(localSettings.shiftTimePreferenceWeight)}
                  onChange={(e) => handleNumberChange('shiftTimePreferenceWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('shiftTimePreferenceWeight', 15)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="favoredEmployeeDeptWeight">
                  Favored Employee for Department
                  <Tooltip text="How strongly the solver should respect a specific employee-to-department preference when you add one in Flags." />
                </label>
                <input
                  id="favoredEmployeeDeptWeight"
                  type="number"
                  min="0"
                  max="1000"
                  step="10"
                  value={getNumberValue(localSettings.favoredEmployeeDeptWeight)}
                  onChange={(e) => handleNumberChange('favoredEmployeeDeptWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('favoredEmployeeDeptWeight', 50)}
                  className="input"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-surface-800 pt-6">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-surface-100">
                Favored Student Rules
                <Tooltip text="These settings control what the solver is allowed to do when you intentionally favor a student in the Flags tab." />
              </h3>
              <p className="text-xs leading-5 text-surface-400">
                Favoring a student can make the solver work harder to place them, but it should still stay within sensible daily and weekly limits.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="favoredStudentDailyMaxHours">
                Favored Student Daily Max
                <Tooltip text="Maximum hours a favored student can work in one day. Weekly caps still apply and are not overridden by favoring a student." />
              </label>
              <HourInput
                id="favoredStudentDailyMaxHours"
                min="1"
                max="12"
                value={localSettings.favoredStudentDailyMaxHours}
                onValueChange={(value) => updateSetting('favoredStudentDailyMaxHours', value)}
              />
              <p className="mt-1 text-xs text-surface-500">Default 8 hours per day for favored students.</p>
            </div>

            <div>
              <label className="label" htmlFor="favoredStudentMinShiftHours">
                Favored Student Minimum Shift
                <Tooltip text="Minimum shift length allowed for a favored student. This is the favored-student companion to the regular minimum shift rule." />
              </label>
              <HourInput
                id="favoredStudentMinShiftHours"
                min="0.5"
                max="4"
                value={localSettings.favoredStudentMinShiftHours}
                onValueChange={(value) => updateSetting('favoredStudentMinShiftHours', value)}
              />
              <p className="mt-1 text-xs text-surface-500">Default 1 hour for favored students.</p>
            </div>
          </section>

          <section className="space-y-4 border-t border-surface-800 pt-6">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-surface-100">
                Training
                <Tooltip text="Control how strongly the solver tries to keep training pairs working together." />
              </h3>
              <p className="text-xs leading-5 text-surface-400">
                Useful when you rely on pair shadowing or want overlap between specific trainees.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="trainingOverlapTargetPercent">
                Training Overlap Target %
                <Tooltip text="How much of the smaller trainee's target schedule should overlap with their training partner. Example: 35 means aim for overlap equal to 35% of the smaller target." />
              </label>
              <input
                id="trainingOverlapTargetPercent"
                type="number"
                min="0"
                max="100"
                step="5"
                value={getNumberValue(localSettings.trainingOverlapTargetPercent)}
                onChange={(e) => handleNumberChange('trainingOverlapTargetPercent', e.target.value)}
                onBlur={() => handleNumberBlur('trainingOverlapTargetPercent', 35)}
                className="input"
              />
              <p className="mt-1 text-xs text-surface-500">Default 35% of the smaller trainee target.</p>
            </div>

            <div>
              <label className="label" htmlFor="trainingOverlapWeight">
                Training Weight
                <Tooltip text="How hard the solver pushes to meet the training overlap target when a perfect schedule is not possible." />
              </label>
              <input
                id="trainingOverlapWeight"
                type="number"
                min="0"
                max="20000"
                step="100"
                value={getNumberValue(localSettings.trainingOverlapWeight)}
                onChange={(e) => handleNumberChange('trainingOverlapWeight', e.target.value)}
                onBlur={() => handleNumberBlur('trainingOverlapWeight', 5000)}
                className="input"
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-surface-800 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="mb-1 text-sm font-semibold text-surface-100">
                  Advanced Solver Tuning
                  <Tooltip text="These settings are powerful and easier to misuse. Change them only if the main sections are not enough." />
                </h3>
                <p className="text-xs leading-5 text-surface-400">
                  Thresholds, fallback defaults, lower-level weights, collaboration minimums, and academic-year weighting.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowAdvancedSolverTuning((open) => !open)}
                aria-label={showAdvancedSolverTuning ? 'Collapse advanced solver tuning' : 'Expand advanced solver tuning'}
                aria-expanded={showAdvancedSolverTuning}
              >
                <ChevronDown
                  className={`h-4 w-4 text-surface-400 transition-transform ${showAdvancedSolverTuning ? 'rotate-180' : ''}`}
                  strokeWidth={1.8}
                />
              </Button>
            </div>

            {showAdvancedSolverTuning && (
              <div className="space-y-5 rounded-lg border border-border/70 bg-surface-900/35 p-4">
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">Thresholds</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="label" htmlFor="solverMaxTime">
                        Solver Time Limit
                        <Tooltip text="How long the solver is allowed to search before it stops and returns its best answer so far." />
                      </label>
                      <input
                        id="solverMaxTime"
                        type="number"
                        min="30"
                        max="1800"
                        step="30"
                        value={getNumberValue(localSettings.solverMaxTime)}
                        onChange={(e) => handleNumberChange('solverMaxTime', e.target.value)}
                        onBlur={() => handleNumberBlur('solverMaxTime', 180)}
                        className="input"
                      />
                      <p className="mt-1 text-xs text-surface-500">Seconds of solver search time.</p>
                    </div>

                    <div>
                      <label className="label" htmlFor="departmentHourThreshold">
                        Department Hour Wiggle Room
                        <Tooltip text="How far a department is allowed to land above or below its target before the solver treats it as a major miss." />
                      </label>
                      <HourInput
                        id="departmentHourThreshold"
                        min="0"
                        max="10"
                        value={localSettings.departmentHourThreshold}
                        onValueChange={(value) => updateSetting('departmentHourThreshold', value)}
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="targetHardDeltaHours">
                        Employee Hour Band
                        <Tooltip text="How far an employee can land above or below their target before the solver considers the schedule invalid for that person." />
                      </label>
                      <HourInput
                        id="targetHardDeltaHours"
                        min="1"
                        max="10"
                        value={localSettings.targetHardDeltaHours}
                        onValueChange={(value) => updateSetting('targetHardDeltaHours', value)}
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="largeDeviationThresholdHours">
                        Large Deviation Threshold
                        <Tooltip text="Past this many hours away from a target, the solver starts applying the heavy large-deviation penalties below." />
                      </label>
                      <HourInput
                        id="largeDeviationThresholdHours"
                        min="0"
                        max="10"
                        value={localSettings.largeDeviationThresholdHours}
                        onValueChange={(value) => updateSetting('largeDeviationThresholdHours', value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">Penalty Weights</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="label" htmlFor="employeeLargeDeviationPenalty">
                        Employee Large Deviation Penalty
                        <Tooltip text="Penalty when an employee lands beyond the large-deviation threshold. Raise this if individual target misses matter more." />
                      </label>
                      <input
                        id="employeeLargeDeviationPenalty"
                        type="number"
                        min="0"
                        max="50000"
                        step="100"
                        value={getNumberValue(localSettings.employeeLargeDeviationPenalty)}
                        onChange={(e) => handleNumberChange('employeeLargeDeviationPenalty', e.target.value)}
                        onBlur={() => handleNumberBlur('employeeLargeDeviationPenalty', 5000)}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="departmentLargeDeviationPenalty">
                        Department Large Deviation Penalty
                        <Tooltip text="Penalty when a department lands beyond the large-deviation threshold. Raise this if department target misses matter more." />
                      </label>
                      <input
                        id="departmentLargeDeviationPenalty"
                        type="number"
                        min="0"
                        max="50000"
                        step="100"
                        value={getNumberValue(localSettings.departmentLargeDeviationPenalty)}
                        onChange={(e) => handleNumberChange('departmentLargeDeviationPenalty', e.target.value)}
                        onBlur={() => handleNumberBlur('departmentLargeDeviationPenalty', 4000)}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="departmentScarcityWeight">
                        Department Scarcity Weight
                        <Tooltip text="Penalty for pulling people from smaller departments to cover front desk. Raise this if small teams are getting drained too often." />
                      </label>
                      <input
                        id="departmentScarcityWeight"
                        type="number"
                        min="0"
                        max="1000"
                        step="1"
                        value={getNumberValue(localSettings.departmentScarcityWeight)}
                        onChange={(e) => handleNumberChange('departmentScarcityWeight', e.target.value)}
                        onBlur={() => handleNumberBlur('departmentScarcityWeight', 8)}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="timesetBonusWeight">
                        Timeset Bonus Strength
                        <Tooltip text="How strongly the solver should protect explicit employee/role/time assignments you add in Flags." />
                      </label>
                      <input
                        id="timesetBonusWeight"
                        type="number"
                        min="0"
                        max="50000"
                        step="100"
                        value={getNumberValue(localSettings.timesetBonusWeight)}
                        onChange={(e) => handleNumberChange('timesetBonusWeight', e.target.value)}
                        onBlur={() => handleNumberBlur('timesetBonusWeight', 20000)}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="equalityConstraintWeight">
                        Equality Constraint Strength
                        <Tooltip text="Penalty per slot of difference when you ask the solver to equalize two employees in a department." />
                      </label>
                      <input
                        id="equalityConstraintWeight"
                        type="number"
                        min="0"
                        max="5000"
                        step="1"
                        value={getNumberValue(localSettings.equalityConstraintWeight)}
                        onChange={(e) => handleNumberChange('equalityConstraintWeight', e.target.value)}
                        onBlur={() => handleNumberBlur('equalityConstraintWeight', 67)}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">Favored Student Tuning</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="label" htmlFor="favoredStudentTargetPriority">
                        Favored Student Target Priority
                        <Tooltip text="How much extra pressure the solver puts on hitting target hours for favored students. Higher values make favoring matter more." />
                      </label>
                      <input
                        id="favoredStudentTargetPriority"
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={getNumberValue(localSettings.favoredStudentTargetPriority)}
                        onChange={(e) => handleNumberChange('favoredStudentTargetPriority', e.target.value)}
                        onBlur={() => handleNumberBlur('favoredStudentTargetPriority', 10)}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="favoredStudentFillBonus">
                        Favored Student Fill Bonus
                        <Tooltip text="Extra reward for every slot a favored student works. Raise this if favoring should pull more hours toward that student overall." />
                      </label>
                      <input
                        id="favoredStudentFillBonus"
                        type="number"
                        min="0"
                        max="5000"
                        step="1"
                        value={getNumberValue(localSettings.favoredStudentFillBonus)}
                        onChange={(e) => handleNumberChange('favoredStudentFillBonus', e.target.value)}
                        onBlur={() => handleNumberBlur('favoredStudentFillBonus', 67)}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">Coverage & Distribution</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="label" htmlFor="departmentDayCoverageWeight">
                        Department Day Coverage
                        <Tooltip text="Reward for spreading each department across more days of the week instead of cramming all of its hours into fewer days." />
                      </label>
                      <input
                        id="departmentDayCoverageWeight"
                        type="number"
                        min="0"
                        max="500"
                        step="1"
                        value={getNumberValue(localSettings.departmentDayCoverageWeight)}
                        onChange={(e) => handleNumberChange('departmentDayCoverageWeight', e.target.value)}
                        onBlur={() => handleNumberBlur('departmentDayCoverageWeight', 30)}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="underclassmenFrontDeskWeight">
                        Underclassmen Front Desk Preference
                        <Tooltip text="How strongly the solver nudges front desk coverage toward lower-year students. Keep this low unless you very specifically want that bias." />
                      </label>
                      <input
                        id="underclassmenFrontDeskWeight"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={getNumberValue(localSettings.underclassmenFrontDeskWeight)}
                        onChange={(e) => handleNumberChange('underclassmenFrontDeskWeight', e.target.value)}
                        onBlur={() => handleNumberBlur('underclassmenFrontDeskWeight', 1)}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="departmentTotalWeight">
                        Department Total Presence
                        <Tooltip text="Small reward for simply placing department work across the week. Raise this only if some departments feel too invisible overall." />
                      </label>
                      <input
                        id="departmentTotalWeight"
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={getNumberValue(localSettings.departmentTotalWeight)}
                        onChange={(e) => handleNumberChange('departmentTotalWeight', e.target.value)}
                        onBlur={() => handleNumberBlur('departmentTotalWeight', 1 / 3)}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">Favored Department Tuning</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="label" htmlFor="favoredDepartmentTargetMultiplier">
                        Target Multiplier
                        <Tooltip text="How much extra department-target pressure a favored department receives. Higher values make its requested hours matter more." />
                      </label>
                      <input
                        id="favoredDepartmentTargetMultiplier"
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={getNumberValue(localSettings.favoredDepartmentTargetMultiplier)}
                        onChange={(e) => handleNumberChange('favoredDepartmentTargetMultiplier', e.target.value)}
                        onBlur={() => handleNumberBlur('favoredDepartmentTargetMultiplier', 1.5)}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="favoredDepartmentFocusedBonus">
                        Focused Bonus
                        <Tooltip text="Bonus per slot when a favored department gets dedicated, focused time instead of split attention." />
                      </label>
                      <input
                        id="favoredDepartmentFocusedBonus"
                        type="number"
                        min="0"
                        max="5000"
                        step="1"
                        value={getNumberValue(localSettings.favoredDepartmentFocusedBonus)}
                        onChange={(e) => handleNumberChange('favoredDepartmentFocusedBonus', e.target.value)}
                        onBlur={() => handleNumberBlur('favoredDepartmentFocusedBonus', 10)}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="favoredDepartmentDualPenalty">
                        Dual-Count Penalty
                        <Tooltip text="Penalty for favored-department time that also gets split with front desk coverage. Raise this if favored departments should get more dedicated time." />
                      </label>
                      <input
                        id="favoredDepartmentDualPenalty"
                        type="number"
                        min="0"
                        max="5000"
                        step="1"
                        value={getNumberValue(localSettings.favoredDepartmentDualPenalty)}
                        onChange={(e) => handleNumberChange('favoredDepartmentDualPenalty', e.target.value)}
                        onBlur={() => handleNumberBlur('favoredDepartmentDualPenalty', 7)}
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="favoredFrontDeskDeptBonus">
                        Front Desk Bonus
                        <Tooltip text="Bonus per front desk slot covered by a member of a favored department." />
                      </label>
                      <input
                        id="favoredFrontDeskDeptBonus"
                        type="number"
                        min="0"
                        max="5000"
                        step="1"
                        value={getNumberValue(localSettings.favoredFrontDeskDeptBonus)}
                        onChange={(e) => handleNumberChange('favoredFrontDeskDeptBonus', e.target.value)}
                        onBlur={() => handleNumberBlur('favoredFrontDeskDeptBonus', 13)}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">Training Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="label" htmlFor="trainingMinHours">
                        Training Minimum Hours
                        <Tooltip text="Baseline overlap target for a training pair before the percentage-based target kicks in. This prevents tiny overlap goals from being treated as sufficient." />
                      </label>
                      <HourInput
                        id="trainingMinHours"
                        min="0"
                        max="8"
                        value={localSettings.trainingMinHours}
                        onValueChange={(value) => updateSetting('trainingMinHours', value)}
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="trainingOverlapBonus">
                        Training Overlap Bonus
                        <Tooltip text="Extra reward for every overlapping training slot once a pair is working together. Raise this if training pairs should stay together more often after they overlap at all." />
                      </label>
                      <input
                        id="trainingOverlapBonus"
                        type="number"
                        min="0"
                        max="5000"
                        step="1"
                        value={getNumberValue(localSettings.trainingOverlapBonus)}
                        onChange={(e) => handleNumberChange('trainingOverlapBonus', e.target.value)}
                        onBlur={() => handleNumberBlur('trainingOverlapBonus', 67)}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">Collaboration Minimums</h4>
                  <p className="mb-3 text-xs leading-5 text-surface-500">
                    Desired weekly hours with 2+ people working in the same department at the same time.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label" htmlFor="collaborationMinCareerEducationHours">Career Education</label>
                      <HourInput
                        id="collaborationMinCareerEducationHours"
                        min="0"
                        max="20"
                        value={localSettings.collaborationMinCareerEducationHours}
                        onValueChange={(value) => updateSetting('collaborationMinCareerEducationHours', value)}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="collaborationMinMarketingHours">Marketing</label>
                      <HourInput
                        id="collaborationMinMarketingHours"
                        min="0"
                        max="20"
                        value={localSettings.collaborationMinMarketingHours}
                        onValueChange={(value) => updateSetting('collaborationMinMarketingHours', value)}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="collaborationMinEmployerEngagementHours">Employer Engagement</label>
                      <HourInput
                        id="collaborationMinEmployerEngagementHours"
                        min="0"
                        max="20"
                        value={localSettings.collaborationMinEmployerEngagementHours}
                        onValueChange={(value) => updateSetting('collaborationMinEmployerEngagementHours', value)}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="collaborationMinEventsHours">Events</label>
                      <HourInput
                        id="collaborationMinEventsHours"
                        min="0"
                        max="20"
                        value={localSettings.collaborationMinEventsHours}
                        onValueChange={(value) => updateSetting('collaborationMinEventsHours', value)}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="collaborationMinDataSystemsHours">Data Systems</label>
                      <HourInput
                        id="collaborationMinDataSystemsHours"
                        min="0"
                        max="20"
                        value={localSettings.collaborationMinDataSystemsHours}
                        onValueChange={(value) => updateSetting('collaborationMinDataSystemsHours', value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">Fallback Defaults</h4>
                  <p className="mb-3 text-xs leading-5 text-surface-500">
                    Used only when a staff record is missing its own max-hours or target-hours value.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label" htmlFor="defaultWeeklyMaxHours">
                        Default Weekly Max
                        <Tooltip text="Fallback weekly max-hours value for incomplete staff data. This does not replace an employee's own max when one is present." />
                      </label>
                      <HourInput
                        id="defaultWeeklyMaxHours"
                        min="1"
                        max="60"
                        value={localSettings.defaultWeeklyMaxHours}
                        onValueChange={(value) => updateSetting('defaultWeeklyMaxHours', value)}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="defaultTargetHours">
                        Default Target Hours
                        <Tooltip text="Fallback target-hours value for incomplete staff data. This does not replace an employee's own target when one is present." />
                      </label>
                      <HourInput
                        id="defaultTargetHours"
                        min="0"
                        max="40"
                        value={localSettings.defaultTargetHours}
                        onValueChange={(value) => updateSetting('defaultTargetHours', value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">Academic Year Weighting</h4>
                  <p className="mb-3 text-xs leading-5 text-surface-500">
                    Higher values make the solver work harder to hit target hours for students in that academic year.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label" htmlFor="year1TargetMultiplier">Year 1 Multiplier</label>
                      <input
                        id="year1TargetMultiplier"
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={getNumberValue(localSettings.year1TargetMultiplier)}
                        onChange={(e) => handleNumberChange('year1TargetMultiplier', e.target.value)}
                        onBlur={() => handleNumberBlur('year1TargetMultiplier', 1)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="year2TargetMultiplier">Year 2 Multiplier</label>
                      <input
                        id="year2TargetMultiplier"
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={getNumberValue(localSettings.year2TargetMultiplier)}
                        onChange={(e) => handleNumberChange('year2TargetMultiplier', e.target.value)}
                        onBlur={() => handleNumberBlur('year2TargetMultiplier', 1.2)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="year3TargetMultiplier">Year 3 Multiplier</label>
                      <input
                        id="year3TargetMultiplier"
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={getNumberValue(localSettings.year3TargetMultiplier)}
                        onChange={(e) => handleNumberChange('year3TargetMultiplier', e.target.value)}
                        onBlur={() => handleNumberBlur('year3TargetMultiplier', 1.5)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="year4TargetMultiplier">Year 4 Multiplier</label>
                      <input
                        id="year4TargetMultiplier"
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={getNumberValue(localSettings.year4TargetMultiplier)}
                        onChange={(e) => handleNumberChange('year4TargetMultiplier', e.target.value)}
                        onBlur={() => handleNumberBlur('year4TargetMultiplier', 2)}
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4 border-t border-surface-800 pt-6">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-surface-100">
                Appearance
                <Tooltip text="Visual preferences for the desktop app." />
              </h3>
            </div>
            <div>
              <label className="label" htmlFor="theme">Theme</label>
              <select
                id="theme"
                value={localSettings.theme}
                onChange={(e) => updateSetting('theme', e.target.value as 'system' | 'dark' | 'light')}
                className="input"
              >
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="fontSize">Font Size</label>
              <select
                id="fontSize"
                value={localSettings.fontSize}
                onChange={(e) => updateSetting('fontSize', e.target.value as 'small' | 'medium' | 'large')}
                className="input"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </section>

          {/* Updates */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">
              Updates
            </h3>
            <div className="space-y-3">
              {/* Status display */}
              {updateStatus.state === 'downloading' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-400">Downloading update...</span>
                    <span className="text-surface-300">{Math.round(updateStatus.percent)}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-foreground transition-all duration-300"
                      style={{ width: `${updateStatus.percent}%` }}
                    />
                  </div>
                  {isMac && (
                    <p className="mt-2 text-xs text-surface-500">
                      Once complete, the installer will open automatically.
                    </p>
                  )}
                </div>
              )}
              
              {updateStatus.state === 'available' && (
                <div className="rounded-lg border border-border bg-surface-800/70 p-3">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-100">
                    <Download className="h-4 w-4 text-surface-300" strokeWidth={1.8} />
                    Version {updateStatus.version} available!
                  </p>
                  {isMac ? (
                    <div className="mb-3 space-y-2 text-xs">
                      <p className="text-surface-400">
                        This will download the installer to your Downloads folder and open it. 
                        Drag the app to Applications to replace the old version.
                      </p>
                      <p className="flex items-center gap-1.5 font-medium text-warning-300">
                        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />
                        After installing, open Terminal and run:
                      </p>
                      <div className="flex items-center gap-1.5">
                        <code className="block flex-1 rounded bg-surface-950 px-2 py-1 text-xs font-mono text-surface-300">
                          xattr -cr /Applications/Scheduler.app
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          onClick={handleCopyMacBypassCommand}
                          aria-label="Copy terminal command"
                          title="Copy command"
                        >
                          <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mb-3 text-xs text-surface-400">
                      The update will download in the background. Once complete, click &quot;Restart and Install&quot; 
                      to automatically update and relaunch the app.
                    </p>
                  )}
                  <Button
                    onClick={handleDownloadUpdate}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" strokeWidth={1.8} />
                    Download Update
                  </Button>
                </div>
              )}
              
              {updateStatus.state === 'downloaded' && (
                <div className="rounded-lg border border-border bg-surface-800/70 p-3">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-surface-100">
                    <CheckCircle2 className="h-4 w-4 text-surface-300" strokeWidth={1.8} />
                    Version {updateStatus.version} ready to install
                  </p>
                  <p className="mb-3 text-xs text-surface-400">
                    The app will close and relaunch automatically with the new version.
                  </p>
                  <Button
                    onClick={handleInstallUpdate}
                    className="w-full"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" strokeWidth={1.8} />
                    Restart and Install
                  </Button>
                </div>
              )}
              
              {updateStatus.state === 'error' && (
                <NoticePanel
                  variant="error"
                  title="Update check failed"
                  description={updateStatus.message}
                />
              )}
              
              {(updateStatus.state === 'idle' || updateStatus.state === 'not-available' || updateStatus.state === 'checking') && (
                <Button
                  onClick={handleCheckForUpdates}
                  disabled={updateStatus.state === 'checking'}
                  variant="outline"
                  className="w-full"
                >
                  {updateStatus.state === 'checking' ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.8} />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" strokeWidth={1.8} />
                      Check for Updates
                    </>
                  )}
                </Button>
              )}
              
              {updateStatus.state === 'not-available' && (
                <p className="text-xs text-surface-500 text-center">
                  You&apos;re on the latest version
                </p>
              )}
            </div>
          </section>

          {/* Feedback */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">
              Feedback
            </h3>
            <Button asChild variant="outline" className="w-full justify-center text-surface-300 hover:text-surface-100">
              <a
                href="https://github.com/charliec2004/semester-scheduler-app/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Bug className="mr-2 h-4 w-4" strokeWidth={1.8} />
                Report a Bug
              </a>
            </Button>
            <p className="mt-2 text-center text-xs text-surface-500">
              View or report issues on GitHub
            </p>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">
              Reset
            </h3>
            <div className="space-y-3">
              <p className="text-[13px] leading-5 text-surface-400">
                Restore all settings in this panel back to the app defaults.
              </p>
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full justify-center"
              >
                Reset Defaults
              </Button>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">
              Data Management
            </h3>
            <div className="space-y-3">
              <p className="text-[13px] leading-5 text-surface-400">
                Clear all saved staff, departments, and presets. History will be preserved.
              </p>
              <Button
                onClick={handleClearAllData}
                variant="destructive"
                className="w-full justify-center"
              >
                <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.8} />
                Clear All Data
              </Button>
            </div>
          </section>

          {/* Version Info */}
          <div className="mt-3 border-t border-surface-800 pt-4">
            <p className="text-xs text-surface-500 text-center">
              Semester Scheduler v{appVersion} · Made by Charlie
            </p>
          </div>
        </div>
        </div>
      </div>
      <ConfirmDialog
        open={pendingConfirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingConfirmAction(null);
          }
        }}
        title={pendingConfirmAction === 'reset' ? 'Reset settings to defaults?' : 'Clear all scheduler data?'}
        description={
          pendingConfirmAction === 'reset'
            ? 'This will replace your current solver and appearance settings with the app defaults.'
            : 'This clears all staff, departments, and saved presets. Solver history will be preserved.'
        }
        confirmLabel={pendingConfirmAction === 'reset' ? 'Reset Settings' : 'Clear Data'}
        confirmVariant={pendingConfirmAction === 'reset' ? 'default' : 'destructive'}
        onConfirm={handleConfirmAction}
      />
    </>
  );
}
