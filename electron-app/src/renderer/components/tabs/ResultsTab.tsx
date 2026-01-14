/**
 * Results Tab Component
 * Shows solver progress, logs, and output downloads
 */

import { useRef, useEffect } from 'react';
import { useSolverStore, useUIStore } from '../../store';
import { EmptyState } from '../ui/EmptyState';

export function ResultsTab() {
  const { running, runId, progress, logs, result, reset } = useSolverStore();
  const { showToast, setActiveTab } = useUIStore();
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCancel = async () => {
    const cancelResult = await window.electronAPI.solver.cancel();
    if (cancelResult.canceled) {
      showToast('Solver cancelled', 'info');
    }
  };

  const handleOpenOutput = async (path: string) => {
    await window.electronAPI.files.openInExplorer(path);
  };

  const handleNewRun = () => {
    reset();
    setActiveTab('flags');
  };

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // No runs yet
  if (!running && !result && logs.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        title="No Results Yet"
        description="Configure your flags and run the scheduler to see results here."
        action={{
          label: 'Go to Flags & Solve',
          onClick: () => setActiveTab('flags'),
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-surface-100 mb-1">
            {running ? 'Running Solver...' : result?.success ? 'Schedule Generated' : 'Results'}
          </h2>
          <p className="text-surface-400">
            {running && progress 
              ? `Elapsed: ${formatElapsed(progress.elapsed)}`
              : result 
                ? `Completed in ${formatElapsed(result.elapsed)}`
                : 'Waiting for solver to complete'}
          </p>
        </div>
        <div className="flex gap-3">
          {running ? (
            <button onClick={handleCancel} className="btn-danger">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Cancel
            </button>
          ) : (
            <button onClick={handleNewRun} className="btn-secondary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              New Run
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {running && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-surface-300">Optimizing...</span>
            <span className="text-sm text-accent-400">
              {progress?.percent ?? 0}%
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill animate-pulse-soft"
              style={{ width: `${progress?.percent ?? (running ? 10 : 0)}%` }}
            />
          </div>
          {progress?.message && (
            <p className="text-xs text-surface-400 mt-2 truncate">
              {progress.message}
            </p>
          )}
        </div>
      )}

      {/* Result Status */}
      {result && (
        <div className={`card ${result.success ? 'bg-accent-500/10 border-accent-500/30' : 'bg-danger-500/10 border-danger-500/30'}`}>
          <div className="flex items-start gap-4">
            {result.success ? (
              <div className="w-12 h-12 bg-accent-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-12 h-12 bg-danger-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <h3 className={`font-semibold ${result.success ? 'text-accent-400' : 'text-danger-400'}`}>
                {result.success ? 'Schedule Generated Successfully' : 'Generation Failed'}
              </h3>
              <p className="text-sm text-surface-400 mt-1">
                {result.success 
                  ? `Completed in ${formatElapsed(result.elapsed)}. Download your schedule below.`
                  : result.error || 'An error occurred during optimization.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Output Files */}
      {result?.success && result.outputs && (
        <div className="card">
          <h3 className="font-semibold text-surface-200 mb-4">Output Files</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {result.outputs.xlsx && (
              <button
                onClick={() => handleOpenOutput(result.outputs!.xlsx!)}
                className="flex items-center gap-4 p-4 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-accent-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-surface-200">schedule.xlsx</div>
                  <div className="text-sm text-surface-400">Excel workbook with all sheets</div>
                </div>
              </button>
            )}
            {result.outputs.xlsxFormatted && (
              <button
                onClick={() => handleOpenOutput(result.outputs!.xlsxFormatted!)}
                className="flex items-center gap-4 p-4 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-accent-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-surface-200">schedule-formatted.xlsx</div>
                  <div className="text-sm text-surface-400">Formatted version with comments</div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-surface-200">Solver Output</h3>
          <span className="text-xs text-surface-500">{logs.length} lines</span>
        </div>
        <div
          ref={logContainerRef}
          className="log-viewer max-h-96"
          role="log"
          aria-live="polite"
          aria-label="Solver output logs"
        >
          {logs.length === 0 ? (
            <span className="text-surface-500">Waiting for output...</span>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={log.type === 'stderr' ? 'log-stderr' : 'log-stdout'}>
                {log.text}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Troubleshooting */}
      {result && !result.success && (
        <div className="card bg-surface-800/50">
          <h3 className="font-semibold text-surface-200 mb-3">Troubleshooting Tips</h3>
          <ul className="space-y-2 text-sm text-surface-400">
            <li className="flex items-start gap-2">
              <span className="text-accent-400">•</span>
              Check that at least one employee has the front_desk role
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-400">•</span>
              Verify employee availability covers required time slots
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-400">•</span>
              Ensure target hours don't exceed max hours for any employee or department
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-400">•</span>
              Try increasing the solver time limit in Settings
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-400">•</span>
              Check the logs above for specific constraint violations
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
