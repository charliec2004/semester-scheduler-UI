/**
 * Main Application Component
 * Provides tab navigation, layout structure, and coordinates all features.
 */

import { useEffect, useState } from 'react';
import { CalendarDays, Moon, Settings2, Sun } from 'lucide-react';
import { useSettingsStore, useUIStore, useFlagsStore, useSolverStore, useHistoryStore, useStaffStore, useDepartmentStore } from './store';
import { TabNavigation } from './components/layout/TabNavigation';
import { Toast } from './components/ui/Toast';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { ImportTab } from './components/tabs/ImportTab';
import { StaffEditorTab } from './components/tabs/StaffEditorTab';
import { DepartmentsTab } from './components/tabs/DepartmentsTab';
import { FlagsSetupBanner, FlagsTab } from './components/tabs/FlagsTab';
import { ResultsTab } from './components/tabs/ResultsTab';
import { WelcomeTab } from './components/tabs/WelcomeTab';
import { KeyboardShortcutsHelp } from './components/ui/KeyboardShortcutsHelp';
import { Button } from './components/ui/button';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const { settings, loadSettings, saveSettings } = useSettingsStore();
  const { activeTab, showSettings, toast } = useUIStore();
  const { loadPresets } = useFlagsStore();
  const { setProgress, addLog, setResult } = useSolverStore();
  const { loadHistory } = useHistoryStore();
  const { loadSavedStaff } = useStaffStore();
  const { loadSavedDepartments } = useDepartmentStore();

  // Load settings, presets, history, and saved data on mount
  useEffect(() => {
    loadSettings();
    loadPresets();
    loadHistory();
    loadSavedStaff();
    loadSavedDepartments();
  }, [loadSettings, loadPresets, loadHistory, loadSavedStaff, loadSavedDepartments]);

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
        errorType: result.errorType,
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

  const themePreference = settings?.theme ?? 'dark';
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

  const applyResolvedTheme = (theme: 'dark' | 'light') => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    setResolvedTheme(theme);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    root.classList.add(fontSizeClass);
  }, [fontSizeClass]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const nextResolvedTheme =
        themePreference === 'system'
          ? mediaQuery.matches
            ? 'dark'
            : 'light'
          : themePreference;

      applyResolvedTheme(nextResolvedTheme);
    };

    applyTheme();

    if (themePreference !== 'system') {
      return undefined;
    }

    const handleChange = () => applyTheme();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  const handleToggleTheme = async () => {
    if (!settings) return;

    const root = document.documentElement;
    root.classList.add('theme-transition');
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        void root.offsetWidth;
        resolve();
      });
    });
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    applyResolvedTheme(nextTheme);
    window.setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 220);
    await saveSettings({ ...settings, theme: nextTheme });
  };

  // Detect platform for title bar styling
  const isMac = navigator.platform.toLowerCase().includes('mac');

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Skip link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header with draggable title bar region - fixed at top */}
      <header className="titlebar-drag flex-shrink-0 border-b border-border bg-surface-900/95 backdrop-blur">
        {/* macOS: pl-24 to clear traffic lights on left. Windows/Linux: pr-36 to clear window controls on right */}
        <div className={`flex items-center justify-between ${isMac ? 'pl-24 pr-5' : 'pl-5 pr-36'} py-2 ${isMac ? 'pt-3' : ''}`}>
          <div className="no-drag flex min-w-0 items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-surface-300">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.9} />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <div className="shrink-0 text-[14px] font-semibold tracking-tight text-foreground">
                Semester Scheduler
              </div>
              <span className="hidden h-3.5 w-px bg-border md:block" aria-hidden="true" />
              <p className="hidden truncate text-[12px] text-muted-foreground md:block">
                Optimized weekly scheduling for student employees
              </p>
            </div>
          </div>

          <div className="no-drag flex items-center gap-1.5">
            <Button
              onClick={handleToggleTheme}
              variant="ghost"
              size="icon-sm"
              className="relative overflow-hidden"
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Sun
                className={`absolute h-4 w-4 transition-all duration-200 ease-out ${
                  resolvedTheme === 'dark'
                    ? 'rotate-0 scale-100 opacity-100'
                    : '-rotate-90 scale-75 opacity-0'
                }`}
                strokeWidth={1.8}
              />
              <Moon
                className={`absolute h-4 w-4 transition-all duration-200 ease-out ${
                  resolvedTheme === 'dark'
                    ? 'rotate-90 scale-75 opacity-0'
                    : 'rotate-0 scale-100 opacity-100'
                }`}
                strokeWidth={1.8}
              />
              <span className="sr-only">
                {resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              </span>
            </Button>
            <KeyboardShortcutsHelp />
            <Button
              onClick={() => useUIStore.getState().setShowSettings(true)}
              variant="ghost"
              size="sm"
              aria-label="Open settings (Cmd+,)"
            >
              <Settings2 className="h-4 w-4" strokeWidth={1.8} />
              <span className="sr-only md:not-sr-only">Settings</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation - fixed below header */}
      <div className="flex-shrink-0">
        <TabNavigation />
        <FlagsSetupBanner />
      </div>

      {/* Main Content - scrollable */}
      <main id="main-content" className="flex-1 overflow-y-auto scrollbar-gutter-stable" role="main">
        <div className="container mx-auto max-w-7xl px-5 py-6">
          {activeTab === 'welcome' && <WelcomeTab />}
          {activeTab === 'import' && <ImportTab />}
          {activeTab === 'departments' && <DepartmentsTab />}
          {activeTab === 'staff' && <StaffEditorTab />}
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
