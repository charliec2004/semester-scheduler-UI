/**
 * Settings Panel Component
 * Slide-out panel for configuring solver parameters and UI preferences
 */

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Bug, CheckCircle2, Download, HelpCircle, RefreshCw, Trash2, X } from 'lucide-react';
import { useSettingsStore, useUIStore, useStaffStore, useDepartmentStore, useFlagsStore } from '../../store';
import type { AppSettings } from '../../../main/ipc-types';
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
    <span className="relative inline-flex items-center ml-1.5">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
        onFocus={handleMouseEnter}
        onBlur={() => setShow(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-transparent text-surface-400 transition-colors hover:text-surface-300"
        aria-label="More information"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {show && (
        <div 
          className="fixed z-[100] w-64 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-left text-xs text-surface-200 shadow-lg"
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
        </div>
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
  const [saving, setSaving] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' });
  const [pendingConfirmAction, setPendingConfirmAction] = useState<'reset' | 'clear-data' | null>(null);
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
      setLocalSettings({ ...settings });
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

  const handleClose = () => {
    setShowSettings(false);
  };

  const handleSave = async () => {
    if (!localSettings) return;
    setSaving(true);
    try {
      // Ensure all numeric values have valid defaults before saving
      const validatedSettings: AppSettings = {
        ...localSettings,
        minSlots: isNaN(localSettings.minSlots) ? DEFAULT_MIN_SLOTS : localSettings.minSlots,
        maxSlots: isNaN(localSettings.maxSlots) ? DEFAULT_MAX_SLOTS : localSettings.maxSlots,
        frontDeskCoverageWeight: isNaN(localSettings.frontDeskCoverageWeight) ? 10000 : localSettings.frontDeskCoverageWeight,
        departmentTargetWeight: isNaN(localSettings.departmentTargetWeight) ? 1000 : localSettings.departmentTargetWeight,
        targetAdherenceWeight: isNaN(localSettings.targetAdherenceWeight) ? 100 : localSettings.targetAdherenceWeight,
        collaborativeHoursWeight: isNaN(localSettings.collaborativeHoursWeight) ? 200 : localSettings.collaborativeHoursWeight,
        shiftLengthWeight: isNaN(localSettings.shiftLengthWeight) ? 20 : localSettings.shiftLengthWeight,
        favoredEmployeeDeptWeight: isNaN(localSettings.favoredEmployeeDeptWeight) ? 50 : localSettings.favoredEmployeeDeptWeight,
        departmentHourThreshold: isNaN(localSettings.departmentHourThreshold) ? 4 : localSettings.departmentHourThreshold,
        targetHardDeltaHours: isNaN(localSettings.targetHardDeltaHours) ? 5 : localSettings.targetHardDeltaHours,
      };
      await saveSettings(validatedSettings);
      showToast('Settings saved successfully', 'success');
      handleClose();
    } catch (err) {
      showToast('Failed to save settings', 'error');
    }
    setSaving(false);
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
        await saveSettings(newSettings);
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
      // Store as number if valid, otherwise store NaN to allow clearing
      const num = value === '' ? NaN : parseInt(value);
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
          onClick={handleClose}
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
            onClick={handleClose}
            variant="ghost"
            size="icon-sm"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-7 p-5">
          {/* Solver Settings */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">
              Solver Configuration
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="minSlots">
                    Min Shift Slots
                    <Tooltip text={`Minimum shift length in ${SLOT_MINUTES}-minute slots. A value of ${DEFAULT_MIN_SLOTS} means shifts must be at least 2 hours long.`} />
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
                  <p className="text-xs text-surface-500 mt-1">{SLOT_MINUTES}-min slots</p>
                </div>

                <div>
                  <label className="label" htmlFor="maxSlots">
                    Max Shift Slots
                    <Tooltip text={`Maximum shift length in ${SLOT_MINUTES}-minute slots. A value of ${DEFAULT_MAX_SLOTS} means shifts can be up to 4 hours long.`} />
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
                  <p className="text-xs text-surface-500 mt-1">{SLOT_MINUTES}-min slots</p>
                </div>
              </div>
            </div>
          </section>

          {/* Objective Weights */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">
              Objective Weights
              <Tooltip text="These weights control how the solver prioritizes different objectives. Higher values mean stronger priority. Adjust carefully—extreme values can lead to imbalanced schedules." />
            </h3>
            <p className="text-xs text-surface-500 mb-4">
              Higher values give more priority to each objective
            </p>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="frontDeskCoverageWeight">
                  Front Desk Coverage
                  <Tooltip text="Priority for ensuring front desk is always staffed during operating hours. This should usually be the highest weight to guarantee coverage." />
                </label>
                <input
                  id="frontDeskCoverageWeight"
                  type="number"
                  min="0"
                  max="50000"
                  step="1000"
                  value={getNumberValue(localSettings.frontDeskCoverageWeight)}
                  onChange={(e) => handleNumberChange('frontDeskCoverageWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('frontDeskCoverageWeight', 10000)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="departmentTargetWeight">
                  Department Target Adherence
                  <Tooltip text="Priority for meeting each department's target hours. Higher values make the solver work harder to staff departments at their target levels." />
                </label>
                <input
                  id="departmentTargetWeight"
                  type="number"
                  min="0"
                  max="5000"
                  step="100"
                  value={getNumberValue(localSettings.departmentTargetWeight)}
                  onChange={(e) => handleNumberChange('departmentTargetWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('departmentTargetWeight', 1000)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="targetAdherenceWeight">
                  Employee Target Adherence
                  <Tooltip text="Priority for scheduling employees close to their individual target hours. Balances workload across the team." />
                </label>
                <input
                  id="targetAdherenceWeight"
                  type="number"
                  min="0"
                  max="500"
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
                  <Tooltip text="Bonus for scheduling multiple employees in the same department at the same time. Encourages teamwork and training opportunities." />
                </label>
                <input
                  id="collaborativeHoursWeight"
                  type="number"
                  min="0"
                  max="1000"
                  step="50"
                  value={getNumberValue(localSettings.collaborativeHoursWeight)}
                  onChange={(e) => handleNumberChange('collaborativeHoursWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('collaborativeHoursWeight', 200)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="shiftLengthWeight">
                  Shift Length Bonus
                  <Tooltip text="Small bonus for longer shifts. Encourages the solver to create fewer, longer shifts rather than many short ones." />
                </label>
                <input
                  id="shiftLengthWeight"
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={getNumberValue(localSettings.shiftLengthWeight)}
                  onChange={(e) => handleNumberChange('shiftLengthWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('shiftLengthWeight', 20)}
                  className="input"
                />
              </div>

              <div>
                <label className="label" htmlFor="favoredEmployeeDeptWeight">
                  Favor Employee for Department
                </label>
                <input
                  id="favoredEmployeeDeptWeight"
                  type="number"
                  min="0"
                  max="200"
                  step="10"
                  value={getNumberValue(localSettings.favoredEmployeeDeptWeight)}
                  onChange={(e) => handleNumberChange('favoredEmployeeDeptWeight', e.target.value)}
                  onBlur={() => handleNumberBlur('favoredEmployeeDeptWeight', 50)}
                  className="input"
                />
                <p className="text-xs text-surface-500 mt-1">
                  Bonus per slot when favored employee works preferred dept
                </p>
              </div>
            </div>
          </section>

          {/* Thresholds */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">
              Thresholds
              <Tooltip text="These values define acceptable ranges. Setting them too tight may make scheduling impossible; too loose may produce poor results." />
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="departmentHourThreshold">
                  Department Hour Wiggle Room
                  <Tooltip text="Departments can be staffed within +/- this many hours of their target. Provides flexibility when perfect staffing isn't possible." />
                </label>
                <HourInput
                  id="departmentHourThreshold"
                  min="0"
                  max="10"
                  value={localSettings.departmentHourThreshold}
                  onValueChange={(value) => updateSetting('departmentHourThreshold', value)}
                />
                <p className="text-xs text-surface-500 mt-1">
                  Allowable +/- hours from department targets
                </p>
              </div>

              <div>
                <label className="label" htmlFor="targetHardDeltaHours">
                  Employee Hour Band
                  <Tooltip text="Hard constraint: employees must be scheduled within +/- this many hours of their target. Prevents over- or under-scheduling individuals." />
                </label>
                <HourInput
                  id="targetHardDeltaHours"
                  min="1"
                  max="10"
                  value={localSettings.targetHardDeltaHours}
                  onValueChange={(value) => updateSetting('targetHardDeltaHours', value)}
                />
                <p className="text-xs text-surface-500 mt-1">
                  Keep employees within +/- hours of their target
                </p>
              </div>
            </div>
          </section>

          {/* UI Preferences */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">
              Accessibility
              <Tooltip text="Visual preferences to improve readability and usability for different needs." />
            </h3>
            <div className="space-y-3">
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

              <SettingsBooleanRow
                id="highContrast"
                checked={localSettings.highContrast}
                onCheckedChange={(checked) => updateSetting('highContrast', checked)}
                label="High contrast mode"
                description="Boosts separation and focus visibility across both themes."
              />
            </div>
          </section>

          {/* Experimental Features */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-surface-300">
              Experimental Features
              <Tooltip text="These features are experimental and may change in future versions." />
            </h3>
            <div className="space-y-3">
              <SettingsBooleanRow
                id="enforceMinDeptBlock"
                checked={localSettings.enforceMinDeptBlock}
                onCheckedChange={(checked) => updateSetting('enforceMinDeptBlock', checked)}
                label="Enforce 2-hour minimum department blocks"
                description="Prevent awkward 1-hour fragments inside non-front-desk department work."
                tooltip="When enabled, non-Front-Desk department assignments must be at least 2 hours. Prevents awkward 1-hour fragments within shifts. Favored employees are partially exempt but cannot split a 2-hour shift across two departments."
              />
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
                      <code className="block rounded bg-surface-950 px-2 py-1 text-xs font-mono text-surface-300">
                        xattr -cr /Applications/Scheduler.app
                      </code>
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

          {/* Version Info */}
          <div className="mt-3 border-t border-surface-800 pt-4">
            <p className="text-xs text-surface-500 text-center">
              Semester Scheduler v{appVersion}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-2.5 border-t border-surface-700 bg-surface-900/95 px-5 py-3 backdrop-blur">
          <Button
            onClick={handleReset}
            variant="ghost"
            className="flex-1"
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="default"
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
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
