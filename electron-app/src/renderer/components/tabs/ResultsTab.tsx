/**
 * Results Tab Component
 * Shows solver progress, logs (accordion), output downloads, and generation history
 */

import { useRef, useEffect, useState } from 'react';
import { useSolverStore, useHistoryStore, useUIStore } from '../../store';
import { EmptyState } from '../ui/EmptyState';
import type { HistoryEntry } from '../../../main/ipc-types';

export function ResultsTab() {
  const { running, progress, logs, result, reset } = useSolverStore();
  const { history, loadHistory, deleteEntry } = useHistoryStore();
  const { showToast, setActiveTab } = useUIStore();
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [logsExpanded, setLogsExpanded] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, result]);

  // Auto-scroll logs when expanded
  useEffect(() => {
    if (logsExpanded && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, logsExpanded]);

  const handleCancel = async () => {
    try {
      const cancelResult = await window.electronAPI.solver.cancel();
      if (cancelResult.canceled) {
        showToast('Solver cancelled', 'info');
      }
    } catch (err) {
      console.error('Failed to cancel solver:', err);
      showToast('Failed to cancel solver', 'error');
    }
  };

  const handleDownload = async (historyId: string, type: 'xlsx' | 'xlsxFormatted') => {
    try {
      const pathResult = await window.electronAPI.history.getOutputPath({ historyId, type });
      if (!pathResult.exists || !pathResult.path) {
        showToast('Output file not found', 'error');
        return;
      }

      const defaultName = type === 'xlsxFormatted' ? 'schedule-formatted.xlsx' : 'schedule.xlsx';
      const saveResult = await window.electronAPI.files.saveOutputAs({
        sourcePath: pathResult.path,
        defaultName,
      });

      if (!saveResult.canceled && saveResult.path) {
        showToast(`Saved to ${saveResult.path.split('/').pop()}`, 'success');
      }
    } catch (err) {
      console.error('Failed to download file:', err);
      showToast('Failed to download file', 'error');
    }
  };

  const handleDeleteEntry = async (entry: HistoryEntry) => {
    if (window.confirm('Delete this generation and its files?')) {
      try {
        await deleteEntry(entry.id);
        showToast('Generation deleted', 'info');
      } catch (err) {
        console.error('Failed to delete entry:', err);
        showToast('Failed to delete entry', 'error');
      }
    }
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

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = () => {
    if (!progress) return null;
    const remaining = Math.max(0, progress.maxTime - progress.elapsed);
    return formatElapsed(remaining);
  };

  // No runs yet and no history
  if (!running && !result && logs.length === 0 && history.length === 0) {
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
              ? `Elapsed: ${formatElapsed(progress.elapsed)} • Remaining: ~${getTimeRemaining()}`
              : result 
                ? `Completed in ${formatElapsed(result.elapsed)}`
                : 'View your generation history below'}
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
                  d="M12 4v16m8-8H4" />
              </svg>
              New Generation
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {running && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-surface-300">Optimizing schedule...</span>
            <span className="text-sm text-accent-400">
              {progress ? `~${Math.round(progress.percent)}%` : 'Starting...'}
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill"
              style={{ 
                width: `${progress?.percent ?? 5}%`,
                transition: 'width 0.5s ease-out',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-surface-500">
            <span>Elapsed: {progress ? formatElapsed(progress.elapsed) : '0s'}</span>
            <span>Remaining: ~{getTimeRemaining() || 'calculating...'}</span>
          </div>
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
                  ? `Completed in ${formatElapsed(result.elapsed)}. Download your schedule from the history below.`
                  : result.error || 'An error occurred during optimization.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Solver Logs - Accordion */}
      {(running || logs.length > 0) && (
        <div className="card p-0 overflow-hidden">
          <button
            onClick={() => setLogsExpanded(!logsExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg 
                className={`w-5 h-5 text-surface-400 transition-transform ${logsExpanded ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium text-surface-200">Solver Output</span>
              <span className="text-xs text-surface-500">({logs.length} lines)</span>
            </div>
            {running && (
              <span className="text-xs text-accent-400 animate-pulse">Live</span>
            )}
          </button>
          
          {logsExpanded && (
            <div
              ref={logContainerRef}
              className="log-viewer max-h-64 border-t border-surface-700"
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
          )}
        </div>
      )}

      {/* Generation History */}
      {history.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-surface-200 mb-4">Generation History</h3>
          <div className="space-y-3">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className="p-4 bg-surface-800 rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent-600/20 rounded-full flex items-center justify-center text-accent-400 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-surface-200">
                        {formatDate(entry.timestamp)}
                      </div>
                      <div className="text-xs text-surface-400">
                        {entry.employeeCount} employees, {entry.departmentCount} departments • {formatElapsed(entry.elapsed)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry)}
                    className="btn-ghost text-danger-400 hover:text-danger-300 p-1.5"
                    aria-label="Delete generation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex gap-2">
                  {entry.hasXlsx && (
                    <button
                      onClick={() => handleDownload(entry.id, 'xlsx')}
                      className="btn-primary text-sm py-1.5 flex-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Schedule
                    </button>
                  )}
                  {entry.hasFormattedXlsx && (
                    <button
                      onClick={() => handleDownload(entry.id, 'xlsxFormatted')}
                      className="btn-secondary text-sm py-1.5 flex-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Formatted
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
