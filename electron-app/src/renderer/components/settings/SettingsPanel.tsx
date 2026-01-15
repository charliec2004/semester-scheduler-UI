/**
 * Settings Panel Component
 * Slide-out panel for configuring solver parameters and UI preferences
 */

import { useState, useEffect } from 'react';
import { useSettingsStore, useUIStore, useStaffStore, useDepartmentStore, useFlagsStore } from '../../store';
import type { AppSettings } from '../../../main/ipc-types';

// Tooltip component with ? icon
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  
  return (
    <span className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-surface-700 text-surface-400 hover:bg-surface-600 hover:text-surface-300 flex items-center justify-center text-xs font-medium transition-colors"
        aria-label="More information"
      >
        ?
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-surface-200 bg-surface-800 border border-surface-700 rounded-lg shadow-lg w-64 text-left">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-surface-800" />
          </div>
        </div>
      )}
    </span>
  );
}

export function SettingsPanel() {
  const { settings, saveSettings, resetSettings } = useSettingsStore();
  const { setShowSettings, showToast } = useUIStore();
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');

  // Fetch app version from Electron (reads from package.json)
  useEffect(() => {
    window.electronAPI.app.getVersion().then(setAppVersion).catch(() => setAppVersion('unknown'));
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
      await saveSettings(localSettings);
      showToast('Settings saved successfully', 'success');
      handleClose();
    } catch (err) {
      showToast('Failed to save settings', 'error');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    const confirmed = window.confirm('Reset all settings to defaults?');
    if (confirmed) {
      try {
        const newSettings = await resetSettings();
        setLocalSettings(newSettings);
        await saveSettings(newSettings);
        showToast('Settings reset to defaults', 'success');
      } catch (err) {
        console.error('Failed to reset settings:', err);
        showToast('Failed to reset settings', 'error');
      }
    }
  };

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      'This will clear all staff, departments, and presets. History will be preserved. Are you sure?'
    );
    if (confirmed) {
      try {
        const result = await window.electronAPI.data.clearAll();
        if (result.success) {
          // Clear the in-memory stores
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
      }
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (localSettings) {
      setLocalSettings({ ...localSettings, [key]: value });
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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div 
        className="relative w-full max-w-md bg-surface-900 border-l border-surface-700 overflow-y-auto animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface-900 border-b border-surface-700 px-6 py-4 flex items-center justify-between">
          <h2 id="settings-title" className="text-lg font-display font-semibold">Settings</h2>
          <button 
            onClick={handleClose}
            className="btn-ghost p-2"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Solver Settings */}
          <section>
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
              Solver Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="solverMaxTime">
                  Max Solve Time (seconds)
                  <Tooltip text="The maximum time the optimizer will spend searching for the best schedule. Longer times may find better solutions. 2-3 minutes is usually sufficient." />
                </label>
                <input
                  id="solverMaxTime"
                  type="number"
                  min="30"
                  max="600"
                  value={localSettings.solverMaxTime}
                  onChange={(e) => updateSetting('solverMaxTime', parseInt(e.target.value) || 180)}
                  className="input"
                />
                <p className="text-xs text-surface-500 mt-1">
                  How long the solver will search for an optimal solution
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="minSlots">
                    Min Shift Slots
                    <Tooltip text="Minimum shift length in 30-minute slots. A value of 4 means shifts must be at least 2 hours long." />
                  </label>
                  <input
                    id="minSlots"
                    type="number"
                    min="2"
                    max="8"
                    value={localSettings.minSlots}
                    onChange={(e) => updateSetting('minSlots', parseInt(e.target.value) || 4)}
                    className="input"
                  />
                  <p className="text-xs text-surface-500 mt-1">30-min slots</p>
                </div>

                <div>
                  <label className="label" htmlFor="maxSlots">
                    Max Shift Slots
                    <Tooltip text="Maximum shift length in 30-minute slots. A value of 8 means shifts can be up to 4 hours long." />
                  </label>
                  <input
                    id="maxSlots"
                    type="number"
                    min="4"
                    max="16"
                    value={localSettings.maxSlots}
                    onChange={(e) => updateSetting('maxSlots', parseInt(e.target.value) || 8)}
                    className="input"
                  />
                  <p className="text-xs text-surface-500 mt-1">30-min slots</p>
                </div>
              </div>
            </div>
          </section>

          {/* Objective Weights */}
          <section>
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
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
                  value={localSettings.frontDeskCoverageWeight}
                  onChange={(e) => updateSetting('frontDeskCoverageWeight', parseInt(e.target.value) || 10000)}
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
                  value={localSettings.departmentTargetWeight}
                  onChange={(e) => updateSetting('departmentTargetWeight', parseInt(e.target.value) || 1000)}
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
                  value={localSettings.targetAdherenceWeight}
                  onChange={(e) => updateSetting('targetAdherenceWeight', parseInt(e.target.value) || 100)}
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
                  value={localSettings.collaborativeHoursWeight}
                  onChange={(e) => updateSetting('collaborativeHoursWeight', parseInt(e.target.value) || 200)}
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
                  value={localSettings.shiftLengthWeight}
                  onChange={(e) => updateSetting('shiftLengthWeight', parseInt(e.target.value) || 20)}
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
                  value={localSettings.favoredEmployeeDeptWeight}
                  onChange={(e) => updateSetting('favoredEmployeeDeptWeight', parseInt(e.target.value) || 50)}
                  className="input"
                />
                <p className="text-xs text-surface-500 mt-1">
                  Bonus per 30-min slot when favored employee works preferred dept
                </p>
              </div>
            </div>
          </section>

          {/* Thresholds */}
          <section>
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
              Thresholds
              <Tooltip text="These values define acceptable ranges. Setting them too tight may make scheduling impossible; too loose may produce poor results." />
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="departmentHourThreshold">
                  Department Hour Wiggle Room
                  <Tooltip text="Departments can be staffed within +/- this many hours of their target. Provides flexibility when perfect staffing isn't possible." />
                </label>
                <input
                  id="departmentHourThreshold"
                  type="number"
                  min="0"
                  max="10"
                  value={localSettings.departmentHourThreshold}
                  onChange={(e) => updateSetting('departmentHourThreshold', parseInt(e.target.value) || 4)}
                  className="input"
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
                <input
                  id="targetHardDeltaHours"
                  type="number"
                  min="1"
                  max="10"
                  value={localSettings.targetHardDeltaHours}
                  onChange={(e) => updateSetting('targetHardDeltaHours', parseInt(e.target.value) || 5)}
                  className="input"
                />
                <p className="text-xs text-surface-500 mt-1">
                  Keep employees within +/- hours of their target
                </p>
              </div>
            </div>
          </section>

          {/* UI Preferences */}
          <section>
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
              Accessibility
              <Tooltip text="Visual preferences to improve readability and usability for different needs." />
            </h3>
            <div className="space-y-4">
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

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="highContrast"
                  checked={localSettings.highContrast}
                  onChange={(e) => updateSetting('highContrast', e.target.checked)}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500"
                />
                <label htmlFor="highContrast" className="text-surface-200">
                  High contrast mode
                </label>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
              Data Management
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-surface-400">
                Clear all saved staff, departments, and presets. History will be preserved.
              </p>
              <button
                onClick={handleClearAllData}
                className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-900/20 w-full border border-red-900/50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All Data
              </button>
            </div>
          </section>

          {/* Version Info */}
          <div className="pt-4 mt-4 border-t border-surface-800">
            <p className="text-xs text-surface-500 text-center">
              Semester Scheduler v{appVersion}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface-900 border-t border-surface-700 px-6 py-4 flex gap-3">
          <button
            onClick={handleReset}
            className="btn-ghost flex-1"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
