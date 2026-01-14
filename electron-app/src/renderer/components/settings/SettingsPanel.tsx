/**
 * Settings Panel Component
 * Slide-out panel for configuring solver parameters and UI preferences
 */

import { useState, useEffect } from 'react';
import { useSettingsStore, useUIStore } from '../../store';
import type { AppSettings } from '../../../main/ipc-types';

export function SettingsPanel() {
  const { settings, saveSettings, resetSettings } = useSettingsStore();
  const { setShowSettings, showToast } = useUIStore();
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({ ...settings });
    }
  }, [settings]);

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
      const newSettings = await resetSettings();
      setLocalSettings(newSettings);
      showToast('Settings reset to defaults', 'info');
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (localSettings) {
      setLocalSettings({ ...localSettings, [key]: value });
    }
  };

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
            </h3>
            <p className="text-xs text-surface-500 mb-4">
              Higher values give more priority to each objective
            </p>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="frontDeskCoverageWeight">
                  Front Desk Coverage
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
            </div>
          </section>

          {/* Thresholds */}
          <section>
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
              Thresholds
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="departmentHourThreshold">
                  Department Hour Wiggle Room
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
