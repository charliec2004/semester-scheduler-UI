/**
 * Main Application Component
 * Provides tab navigation, layout structure, and coordinates all features.
 */

import { useEffect } from 'react';
import { useSettingsStore, useUIStore, useFlagsStore, useSolverStore } from './store';
import { TabNavigation } from './components/layout/TabNavigation';
import { Toast } from './components/ui/Toast';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { ImportTab } from './components/tabs/ImportTab';
import { StaffEditorTab } from './components/tabs/StaffEditorTab';
import { DepartmentsTab } from './components/tabs/DepartmentsTab';
import { FlagsTab } from './components/tabs/FlagsTab';
import { ResultsTab } from './components/tabs/ResultsTab';
import { KeyboardShortcutsHelp } from './components/ui/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const { settings, loadSettings } = useSettingsStore();
  const { activeTab, showSettings, toast } = useUIStore();
  const { loadPresets } = useFlagsStore();
  const { setProgress, addLog, setResult, setRunning } = useSolverStore();

  // Load settings and presets on mount
  useEffect(() => {
    loadSettings();
    loadPresets();
  }, [loadSettings, loadPresets]);

  // Global keyboard shortcuts
  useKeyboardShortcuts();

  // Set up solver event listeners
  useEffect(() => {
    const unsubProgress = window.electronAPI.solver.onProgress((progress) => {
      setProgress(progress);
    });

    const unsubLog = window.electronAPI.solver.onLog((log) => {
      addLog(log.text, log.type);
    });

    const unsubDone = window.electronAPI.solver.onDone((result) => {
      setResult({
        success: result.success,
        outputs: result.outputs,
        error: result.error,
        elapsed: result.elapsed,
      });
    });

    const unsubError = window.electronAPI.solver.onError((error) => {
      setResult({
        success: false,
        error: error.error,
        elapsed: 0,
      });
    });

    return () => {
      unsubProgress();
      unsubLog();
      unsubDone();
      unsubError();
    };
  }, [setProgress, addLog, setResult]);

  // Apply settings-based classes
  const fontSizeClass = settings?.fontSize === 'small' 
    ? 'font-size-small' 
    : settings?.fontSize === 'large' 
      ? 'font-size-large' 
      : 'font-size-medium';

  const contrastClass = settings?.highContrast ? 'high-contrast' : '';

  return (
    <div className={`min-h-screen flex flex-col ${fontSizeClass} ${contrastClass}`}>
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-surface-900 border-b border-surface-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-accent-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold text-surface-100">
                Semester Scheduler
              </h1>
              <p className="text-sm text-surface-400">
                Optimized weekly scheduling for student employees
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <KeyboardShortcutsHelp />
            <button
              onClick={() => useUIStore.getState().setShowSettings(true)}
              className="btn-ghost"
              aria-label="Open settings (Cmd+,)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="sr-only md:not-sr-only">Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Main Content */}
      <main id="main-content" className="flex-1 overflow-auto" role="main">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {activeTab === 'import' && <ImportTab />}
          {activeTab === 'staff' && <StaffEditorTab />}
          {activeTab === 'departments' && <DepartmentsTab />}
          {activeTab === 'flags' && <FlagsTab />}
          {activeTab === 'results' && <ResultsTab />}
        </div>
      </main>

      {/* Settings Panel */}
      {showSettings && <SettingsPanel />}

      {/* Toast notifications */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Screen reader announcer */}
      <div 
        id="sr-announcer" 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      />
    </div>
  );
}

export default App;
