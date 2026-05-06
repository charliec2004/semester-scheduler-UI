/**
 * Results Tab Component
 * Shows solver progress, logs (accordion), output downloads, and generation history
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import { AlertTriangle, Ban, CheckCircle2, Download, Plus, Square, Trash2, XCircle } from 'lucide-react';
import { useSolverStore, useHistoryStore, useUIStore } from '../../store';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { NoticePanel } from '../ui/notice-panel';
import type { HistoryEntry } from '../../../main/ipc-types';

// Rotating status messages shown during optimization
const SOLVER_STATUS_MESSAGES = [
  // Classic operations
  'Optimizing schedule...',
  'Crunching the numbers...',
  'Balancing workloads...',
  'Fine-tuning assignments...',
  // Clever/fun ones
  'Juggling time slots...',
  'Playing schedule tetris...',
  'Connecting the dots...',
  'Solving the puzzle...',
  'Working some magic...',
  'Making it all fit...',
  'Shuffling the deck...',
  'Finding the sweet spot...',
  'Doing the math...',
  'Running simulations...',
  'Exploring possibilities...',
  'Weighing the options...',
  'Piecing it together...',
  'Checking all the boxes...',
  'Crossing the t\'s...',
  'Dotting the i\'s...',
  'Spinning up solutions...',
  'Calibrating constraints...',
  'Harmonizing schedules...',
  'Orchestrating shifts...',
  'Aligning the stars...',
  'Brewing the perfect mix...',
  'Untangling conflicts...',
  'Smoothing out wrinkles...',
  'Refining results...',
  'Mapping the mayhem...',
  'Sorting out the shuffle...',
  'Measuring twice...',
  'Threading the needle...',
  'Taming the timetable...',
  'Settling the chaos...',
  'Coaxing the pieces together...',
  'Massaging the constraints...',
  'Squaring the circle...',
  'Counting every corner case...',
  'Looking for clean handoffs...',
  'Finding room to breathe...',
  'Nudging things into place...',
  'Resolving calendar diplomacy...',
  'Negotiating with the spreadsheet gods...',
  'Keeping all the plates spinning...',
  'Turning conflicts into compromises...',
  'Checking the edge cases...',
  'Giving every shift a fair shake...',
  'Making the puzzle less impossible...',
  'Tracing every dependency...',
  'Finding the hidden openings...',
  'Rebalancing the equation...',
  'Fitting square pegs neatly...',
  'Untying the scheduling knots...',
  'Lining up the dominoes...',
  'Clearing the bottlenecks...',
  'Comparing tradeoffs...',
  'Searching for a cleaner fit...',
  'Taking another angle...',
  'Keeping the constraints happy...',
  'Finding order in the overlap...',
  'Weaving the hours together...',
  'Hunting for the best match...',
  'Balancing the impossible triangle...',
  'Reducing the drama...',
  'Syncing all the moving parts...',
  'Pressure-testing the plan...',
  'Sharpening the solution...',
  'Putting each hour in its place...',
  'Finding the least-worst miracle...',
  'Translating chaos into coverage...',
  'Closing the gaps...',
  'Sifting through combinations...',
  'Making the hard parts behave...',
  'Checking who fits where...',
  'Shaving off the rough edges...',
  'Looking for a better arrangement...',
  'Keeping the whole machine aligned...',
  'Filling in the blanks...',
  'Following the breadcrumbs...',
  'Letting the pieces click...',
  'Chasing the optimal setup...',
  'Getting all the gears to mesh...',
  'Tightening the blueprint...',
  'Coordinating the moving pieces...',
  'Finding the smoothest path...',
  'Making the numbers behave...',
  'Reading the room...',
  'Checking the fit...',
  'Exploring the trade space...',
  'Untangling the overlap...',
  'Keeping the balance steady...',
  'Testing the combinations...',
  'Matching skills to slots...',
  'Working through the constraints...',
  'Sorting the signal from the noise...',
  'Laying out the possibilities...',
  'Reconciling the requirements...',
  'Working the angles...',
  'Balancing the moving parts...',
];

// Parse solver stats from logs
function parseSolverStats(logs: Array<{ text: string; type: string }>): {
  employees?: number;
  days?: number;
  timeSlotsPerDay?: number;
  assignmentVariables?: number;
  constraints?: number;
  totalVariables?: number;
} {
  const logText = logs.map(l => l.text).join('\n');

  const employeesMatch = logText.match(/- (\d+) employees/);
  const daysMatch = logText.match(/- (\d+) days/);
  const slotsMatch = logText.match(/- (\d+) time slots per day/);
  const assignVarsMatch = logText.match(/- (\d+) assignment variables/);
  const constraintsMatch = logText.match(/- ([\d,]+) constraints/);
  const totalVarsMatch = logText.match(/- ([\d,]+) total variables/);

  return {
    employees: employeesMatch ? parseInt(employeesMatch[1]) : undefined,
    days: daysMatch ? parseInt(daysMatch[1]) : undefined,
    timeSlotsPerDay: slotsMatch ? parseInt(slotsMatch[1]) : undefined,
    assignmentVariables: assignVarsMatch ? parseInt(assignVarsMatch[1]) : undefined,
    constraints: constraintsMatch ? parseInt(constraintsMatch[1].replace(/,/g, '')) : undefined,
    totalVariables: totalVarsMatch ? parseInt(totalVarsMatch[1].replace(/,/g, '')) : undefined,
  };
}

// Parse solver logs to detect specific issues and extract helpful details
function parseLogDiagnostics(logs: Array<{ text: string; type: string }>): {
  hasTrainingNoOverlap: boolean;
  hasInvalidEmployee: boolean;
  hasTimesetConflict: boolean;
  hasFrontDeskGap: boolean;
  hasNotQualified: boolean;
  hasEmployeeNotFound: boolean;
  hasDepartmentNotFound: boolean;
  hasAvailabilityConflict: boolean;
  hasLimitedAvailability: boolean;
  invalidEmployeeName?: string;
  notFoundName?: string;
  notQualifiedDetails?: string;
  frontDeskGapDetails?: string;
  availabilityDetails?: string;
  timesetConflicts: string[];
  limitedAvailEmployees: string[];
} {
  const logText = logs.map(l => l.text).join('\n');

  // Extract specific error details from log messages
  const notFoundMatch = logText.match(/employee ['"]([^'"]+)['"] not found/i) ||
                        logText.match(/person ['"]([^'"]+)['"] not found/i);
  const notQualifiedMatch = logText.match(/['"]([^'"]+)['"] is not qualified for.*['"]([^'"]+)['"]/i);
  const frontDeskMatch = logText.match(/Front desk has no available staff at: ([^\n]+)/i);
  const availabilityMatch = logText.match(/['"]([^'"]+)['"] is unavailable on ([^\n]+)/i) ||
                            logText.match(/CONFLICT: ([^\n]+)/i);

  // Extract all timeset conflicts (format: "CONFLICT: Name is unavailable on Day at Time")
  const timesetConflicts: string[] = [];
  const conflictMatches = logText.matchAll(/CONFLICT: ([^\n]+)/g);
  for (const match of conflictMatches) {
    timesetConflicts.push(match[1]);
  }

  // Also match "WARNING:" lines that contain availability info
  const warningMatches = logText.matchAll(/WARNING: ([^\n]*unavailable[^\n]*)/gi);
  for (const match of warningMatches) {
    if (!timesetConflicts.includes(match[1])) {
      timesetConflicts.push(match[1]);
    }
  }

  // Extract limited availability employees
  const limitedAvailEmployees: string[] = [];
  const limitedMatches = logText.matchAll(/- ([^:]+): (\d+)% available/g);
  for (const match of limitedMatches) {
    limitedAvailEmployees.push(`${match[1]} (${match[2]}% available)`);
  }

  return {
    hasTrainingNoOverlap: logText.includes('no overlapping availability'),
    hasInvalidEmployee: /└─\s*nan:/i.test(logText) || logText.includes('nan: max'),
    hasTimesetConflict: logText.includes('CONFLICT:') || (logText.includes('timeset') && logText.includes('unavailable')),
    hasFrontDeskGap: logText.includes('Front desk has no available staff'),
    hasNotQualified: logText.includes('is not qualified for'),
    hasEmployeeNotFound: logText.includes('not found in staff') || (logText.includes('employee') && logText.includes('not found')),
    hasDepartmentNotFound: logText.includes('department') && logText.includes('not found'),
    hasAvailabilityConflict: logText.includes('is unavailable on') || logText.includes('CONFLICT:'),
    hasLimitedAvailability: limitedAvailEmployees.length > 0,
    invalidEmployeeName: logText.match(/└─\s*(nan):/i)?.[1],
    notFoundName: notFoundMatch?.[1],
    notQualifiedDetails: notQualifiedMatch ? `${notQualifiedMatch[1]} for ${notQualifiedMatch[2]}` : undefined,
    frontDeskGapDetails: frontDeskMatch?.[1],
    availabilityDetails: availabilityMatch ? availabilityMatch[1] : undefined,
    timesetConflicts,
    limitedAvailEmployees,
  };
}

function cleanErrorText(error?: string | null): string | null {
  if (!error) return null;

  return error
    .replace(/^Error Details:\s*/i, '')
    .replace(/^Error details:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function getLatestMeaningfulLogLine(logs: Array<{ text: string; type: string }>): string | null {
  for (let i = logs.length - 1; i >= 0; i -= 1) {
    const text = logs[i]?.text?.trim();
    if (!text) continue;
    if (/^(INFO|DEBUG):/i.test(text)) continue;
    return text;
  }

  return null;
}

export function ResultsTab() {
  const { running, progress, logs, result, reset } = useSolverStore();
  const isCancelled = result?.errorType === 'cancelled';

  // Parse logs to detect specific issues and extract stats
  const diagnostics = useMemo(() => parseLogDiagnostics(logs), [logs]);
  const solverStats = useMemo(() => parseSolverStats(logs), [logs]);
  const cleanedErrorText = useMemo(() => cleanErrorText(result?.error), [result?.error]);
  const fallbackLogLine = useMemo(() => getLatestMeaningfulLogLine(logs), [logs]);
  const { history, loadHistory, deleteEntry } = useHistoryStore();
  const { showToast, setActiveTab } = useUIStore();
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const [entryToDelete, setEntryToDelete] = useState<HistoryEntry | null>(null);

  // Rotate status messages every 4-5 seconds while running
  useEffect(() => {
    if (!running) {
      setStatusMessageIndex(0);
      return;
    }

    const rotateMessage = () => {
      setStatusMessageIndex(prev => (prev + 1) % SOLVER_STATUS_MESSAGES.length);
    };

    // Random interval between 5-6 seconds
    const scheduleNext = () => {
      const delay = 5000 + Math.random() * 1000;
      return setTimeout(() => {
        rotateMessage();
        timerId = scheduleNext();
      }, delay);
    };

    let timerId = scheduleNext();
    return () => clearTimeout(timerId);
  }, [running]);

  const currentStatusMessage = SOLVER_STATUS_MESSAGES[statusMessageIndex];
  // Key for triggering animation on message change
  const messageKey = `msg-${statusMessageIndex}`;

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
        const filename = saveResult.path.split('/').pop() || saveResult.path.split('\\').pop();
        showToast(`Saved as ${filename}`, 'success');
      }
    } catch (err) {
      console.error('Failed to download file:', err);
      showToast('Failed to download file', 'error');
    }
  };

  const handleDeleteEntry = async (entry: HistoryEntry) => {
    setEntryToDelete(entry);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;

    try {
      await deleteEntry(entryToDelete.id);
      showToast('Generation deleted', 'info');
    } catch (err) {
      console.error('Failed to delete entry:', err);
      showToast('Failed to delete entry', 'error');
    } finally {
      setEntryToDelete(null);
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

  const hasSpecificDiagnostics =
    diagnostics.hasEmployeeNotFound ||
    diagnostics.hasDepartmentNotFound ||
    diagnostics.hasNotQualified ||
    diagnostics.hasTrainingNoOverlap ||
    diagnostics.hasInvalidEmployee ||
    diagnostics.hasTimesetConflict ||
    diagnostics.hasAvailabilityConflict ||
    diagnostics.hasLimitedAvailability ||
    diagnostics.hasFrontDeskGap;

  const rawErrorDetails =
    cleanedErrorText &&
    cleanedErrorText !== 'Solver encountered an unexpected error (code 1).' &&
    cleanedErrorText !== 'No schedule could satisfy all constraints.'
      ? cleanedErrorText
      : fallbackLogLine;

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
            {running
              ? 'Running Solver...'
              : result?.success
                ? 'Schedule Generated'
                : isCancelled
                  ? 'Generation Cancelled'
                  : 'Results'}
          </h2>
          <p className="text-surface-400">
            {running && progress 
              ? `Elapsed: ${formatElapsed(progress.elapsed)} • Remaining: ~${getTimeRemaining()}`
              : result 
                ? isCancelled
                  ? `Cancelled after ${formatElapsed(result.elapsed)}`
                  : `Completed in ${formatElapsed(result.elapsed)}`
                : 'View your generation history below'}
          </p>
        </div>
        <div className="flex gap-3">
          {running ? (
            <Button onClick={handleCancel} variant="destructive">
              <Square className="h-4 w-4" strokeWidth={1.8} />
              Cancel
            </Button>
          ) : (
            <Button onClick={handleNewRun} variant="secondary">
              <Plus className="h-4 w-4" strokeWidth={1.8} />
              New Generation
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {running && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span
              key={messageKey}
              className="text-sm font-medium status-message-enter"
              data-text={currentStatusMessage}
            >
              {currentStatusMessage}
            </span>
            <span className="text-sm text-surface-300">
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
        <NoticePanel
          variant={
            result.success
              ? 'success'
              : result.errorType === 'cancelled'
                ? 'neutral'
                : result.errorType === 'no_solution'
                  ? 'warning'
                  : 'error'
          }
          title={
            result.success 
              ? 'Schedule generated successfully' 
              : result.errorType === 'cancelled'
                ? 'Generation cancelled'
              : result.errorType === 'no_solution'
                ? 'No solution found'
                : 'Generation failed'
          }
          description={
            result.success
              ? `Completed in ${formatElapsed(result.elapsed)}. Download your schedule from the history below.`
              : result.errorType === 'cancelled'
                ? 'The current run was stopped before completion. You can adjust inputs and start a new generation anytime.'
              : result.errorType === 'no_solution'
                ? 'The current requirements cannot all be satisfied together. Review the likely causes below.'
                : cleanedErrorText || 'Something went wrong. Check the solver output below for details.'
          }
          icon={
            result.success ? <CheckCircle2 className="h-4 w-4 text-surface-200" strokeWidth={1.9} /> :
            result.errorType === 'cancelled' ? <Ban className="h-4 w-4 text-surface-300" strokeWidth={1.9} /> :
            result.errorType === 'no_solution' ? <AlertTriangle className="h-4 w-4 text-warning-300" strokeWidth={1.9} /> :
            <XCircle className="h-4 w-4 text-danger-300" strokeWidth={1.9} />
          }
          className="bg-surface-900/55"
        >
          <div className="space-y-3">
            <h3 className={`font-semibold ${
              result.success 
                ? 'text-surface-100' 
                : result.errorType === 'cancelled'
                  ? 'text-surface-200'
                : result.errorType === 'no_solution'
                  ? 'text-warning-200'
                  : 'text-danger-200'
            }`}>
              {result.success ? 'Solver summary' : result.errorType === 'no_solution' ? 'Likely causes' : result.errorType === 'cancelled' ? 'Run status' : 'What went wrong'}
            </h3>
              {/* Solver Stats - shown on success */}
              {result.success && solverStats.constraints && (
                <div className="border-t border-border/70 pt-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-semibold text-surface-100">
                        {solverStats.constraints?.toLocaleString()}
                      </div>
                      <div className="text-xs text-surface-400">constraints solved</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-surface-100">
                        {solverStats.totalVariables?.toLocaleString()}
                      </div>
                      <div className="text-xs text-surface-400">variables optimized</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-surface-100">
                        {solverStats.assignmentVariables?.toLocaleString()}
                      </div>
                      <div className="text-xs text-surface-400">possible assignments</div>
                    </div>
                  </div>
                  <p className="text-xs text-surface-500 text-center mt-3">
                    Evaluated {((solverStats.days || 5) * (solverStats.timeSlotsPerDay || 18) * (solverStats.employees || 12)).toLocaleString()} schedule combinations across {solverStats.days || 5} days
                  </p>
                </div>
              )}

              {/* Detected Issues - shown for both no_solution and errors */}
              {!result.success && result.errorType !== 'cancelled' && (
                <div className="space-y-1">
                  {hasSpecificDiagnostics ? (
                  <ul className="text-sm text-surface-300 space-y-1.5">
                    {/* Employee not found errors */}
                    {diagnostics.hasEmployeeNotFound && (
                      <li className="flex items-start gap-2">
                        <span className={result.errorType === 'no_solution' ? 'text-warning-300' : 'text-danger-300'}>•</span>
                        <span>
                          <strong>Employee not found:</strong> &quot;{diagnostics.notFoundName || 'unknown'}&quot; doesn&apos;t exist in the Staff tab.
                          Double-check the spelling matches exactly.
                        </span>
                      </li>
                    )}
                    {/* Department not found errors */}
                    {diagnostics.hasDepartmentNotFound && (
                      <li className="flex items-start gap-2">
                        <span className={result.errorType === 'no_solution' ? 'text-warning-300' : 'text-danger-300'}>•</span>
                        <span>
                          <strong>Department not found:</strong> A department name in your flags doesn&apos;t match any department in the Departments tab.
                        </span>
                      </li>
                    )}
                    {/* Not qualified errors */}
                    {diagnostics.hasNotQualified && (
                      <li className="flex items-start gap-2">
                        <span className={result.errorType === 'no_solution' ? 'text-warning-300' : 'text-danger-300'}>•</span>
                        <span>
                          <strong>Not qualified:</strong> {diagnostics.notQualifiedDetails
                            ? `${diagnostics.notQualifiedDetails}. Add this role to their qualifications in the Staff tab.`
                            : 'An employee is assigned to a role they\'re not qualified for. Check the Staff tab.'}
                        </span>
                      </li>
                    )}
                    {/* Training pair overlap issues */}
                    {diagnostics.hasTrainingNoOverlap && (
                      <li className="flex items-start gap-2">
                        <span className="text-warning-300">•</span>
                        <span>
                          <strong>Training pair conflict:</strong> The two employees have no overlapping availability, so they can never work together.
                          Adjust their availability in the Staff tab or remove this training pair.
                        </span>
                      </li>
                    )}
                    {/* Invalid employee (nan) */}
                    {diagnostics.hasInvalidEmployee && (
                      <li className="flex items-start gap-2">
                        <span className={result.errorType === 'no_solution' ? 'text-warning-300' : 'text-danger-300'}>•</span>
                        <span>
                          <strong>Empty employee row:</strong> There&apos;s a blank or invalid row in your staff data.
                          Go to the Staff tab and remove any empty rows.
                        </span>
                      </li>
                    )}
                    {/* Timeset/availability conflict - show all conflicts */}
                    {diagnostics.hasTimesetConflict && diagnostics.timesetConflicts.length > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-warning-300">•</span>
                        <span>
                          <strong>Forced assignment conflicts:</strong>
                          <ul className="mt-1 ml-4 space-y-0.5">
                            {diagnostics.timesetConflicts.map((conflict, i) => (
                              <li key={i} className="text-surface-300">{conflict}</li>
                            ))}
                          </ul>
                        </span>
                      </li>
                    )}
                    {diagnostics.hasTimesetConflict && diagnostics.timesetConflicts.length === 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-warning-300">•</span>
                        <span>
                          <strong>Forced assignment conflict:</strong> {diagnostics.availabilityDetails
                            ? `${diagnostics.availabilityDetails}. The employee is marked unavailable at the time you're trying to assign them.`
                            : 'An employee is being forced to work during a time they\'re marked unavailable. Check the Solver Output below for details.'}
                        </span>
                      </li>
                    )}
                    {/* Availability conflict without timeset */}
                    {diagnostics.hasAvailabilityConflict && !diagnostics.hasTimesetConflict && (
                      <li className="flex items-start gap-2">
                        <span className="text-warning-300">•</span>
                        <span>
                          <strong>Availability conflict:</strong> {diagnostics.availabilityDetails
                            ? `${diagnostics.availabilityDetails}. Remove the flag or update their availability.`
                            : 'A flag references a time when the employee is unavailable.'}
                        </span>
                      </li>
                    )}
                    {/* Limited availability employees */}
                    {diagnostics.hasLimitedAvailability && (
                      <li className="flex items-start gap-2">
                        <span className="text-warning-300">•</span>
                        <span>
                          <strong>Limited availability:</strong> Some employees have very restricted schedules:
                          <ul className="mt-1 ml-4 space-y-0.5">
                            {diagnostics.limitedAvailEmployees.slice(0, 5).map((emp, i) => (
                              <li key={i} className="text-surface-300">{emp}</li>
                            ))}
                            {diagnostics.limitedAvailEmployees.length > 5 && (
                              <li className="text-surface-400">...and {diagnostics.limitedAvailEmployees.length - 5} more</li>
                            )}
                          </ul>
                        </span>
                      </li>
                    )}
                    {/* Front desk coverage gap */}
                    {diagnostics.hasFrontDeskGap && (
                      <li className="flex items-start gap-2">
                        <span className="text-warning-300">•</span>
                        <span>
                          <strong>Front desk gap:</strong> {diagnostics.frontDeskGapDetails
                            ? `No one is available to cover front desk at: ${diagnostics.frontDeskGapDetails}`
                            : 'There are time slots with no front desk coverage possible.'}
                          {' '}Add more employees with front desk qualification or expand their availability.
                        </span>
                      </li>
                    )}
                    {/* Generic suggestion if no specific issues detected */}
                    {result.errorType === 'no_solution' &&
                      !diagnostics.hasTrainingNoOverlap &&
                      !diagnostics.hasInvalidEmployee &&
                      !diagnostics.hasTimesetConflict &&
                      !diagnostics.hasFrontDeskGap &&
                      !diagnostics.hasNotQualified &&
                      !diagnostics.hasEmployeeNotFound &&
                      !diagnostics.hasDepartmentNotFound &&
                      !diagnostics.hasAvailabilityConflict && (
                      <li className="flex items-start gap-2">
                        <span className="text-warning-300">•</span>
                        <span>
                          <strong>Too many constraints:</strong> The combination of employee availability, target hours, and department requirements
                          can&apos;t all be satisfied. Try reducing target hours, relaxing availability, or removing some flags.
                        </span>
                      </li>
                    )}
                  </ul>
                  ) : rawErrorDetails ? (
                    <div className="rounded-md border border-border/70 bg-surface-950/70 px-3 py-2 font-mono text-[12px] leading-5 text-surface-300">
                      {rawErrorDetails}
                    </div>
                  ) : (
                    <p className="text-sm text-surface-400">
                      No structured diagnostics were returned. Expand Solver Output below for the raw solver response.
                    </p>
                  )}
                  {result.errorType === 'no_solution' && (
                    <p className="text-xs text-surface-500 mt-2">
                      Tip: Expand &quot;Solver Output&quot; below for detailed diagnostic information.
                    </p>
                  )}
                </div>
              )}
            </div>
        </NoticePanel>
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
              <span className="text-xs text-surface-300 animate-pulse">Live</span>
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

      {/* Troubleshooting - Contextual based on error type */}
      {result && !result.success && result.errorType !== 'cancelled' && (
        <div className="space-y-3 rounded-lg border border-border bg-surface-800/35 px-4 py-4">
          <h3 className="font-semibold text-surface-200 mb-3">
            {result.errorType === 'no_solution' ? 'How to Fix This' : 'Troubleshooting Tips'}
          </h3>
          
          {result.errorType === 'no_solution' ? (
          <ul className="space-y-2 text-sm text-surface-400">
              {diagnostics.hasInvalidEmployee && (
                <li className="flex items-start gap-2">
                  <span className="text-warning-300">1.</span>
                  <span><strong className="text-surface-200">Remove invalid employees</strong> - Go to Staff tab and delete any empty or &quot;nan&quot; entries</span>
                </li>
              )}
              {diagnostics.hasTrainingNoOverlap && (
                <li className="flex items-start gap-2">
                  <span className="text-warning-300">{diagnostics.hasInvalidEmployee ? '2.' : '1.'}</span>
                  <span><strong className="text-surface-200">Remove training pair</strong> - The paired employees have no overlapping availability</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-warning-300">•</span>
                <span><strong className="text-surface-200">Check &quot;Assign Employee to Role/Time&quot;</strong> - Ensure forced assignments don&apos;t conflict with availability</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warning-300">•</span>
                <span><strong className="text-surface-200">Verify front desk coverage</strong> - At least one qualified employee must be available each time slot</span>
              </li>
            <li className="flex items-start gap-2">
                <span className="text-warning-300">•</span>
                <span><strong className="text-surface-200">Reduce hour requirements</strong> - Department targets may exceed available employee hours</span>
            </li>
            <li className="flex items-start gap-2">
                <span className="text-warning-300">•</span>
                <span><strong className="text-surface-200">Disable 2-hour minimum blocks</strong> - In Settings, turn off &quot;Enforce 2-hour minimum department blocks&quot;</span>
              </li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm text-surface-400">
              <li className="flex items-start gap-2">
                <span className="text-danger-300">•</span>
                <span>Check that your CSV files are properly formatted</span>
            </li>
            <li className="flex items-start gap-2">
                <span className="text-danger-300">•</span>
                <span>Ensure Python is installed and accessible</span>
            </li>
            <li className="flex items-start gap-2">
                <span className="text-danger-300">•</span>
                <span>Check the logs above for specific error messages</span>
            </li>
            <li className="flex items-start gap-2">
                <span className="text-danger-300">•</span>
                <span>Try restarting the application</span>
            </li>
          </ul>
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-900 text-sm font-semibold text-surface-300">
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
                  <Button
                    onClick={() => handleDeleteEntry(entry)}
                    variant="ghost"
                    size="icon-sm"
                    className="text-danger-300 hover:bg-danger-700/10 hover:text-danger-200"
                    aria-label="Delete generation"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                  </Button>
                </div>

                <div className="flex gap-2">
                  {entry.hasXlsx && (
                    <Button
                      onClick={() => handleDownload(entry.id, 'xlsx')}
                      variant="secondary"
                      className="flex-1"
                    >
                      <Download className="h-4 w-4" strokeWidth={1.8} />
                      Download Raw Schedule + Analytics
                    </Button>
                  )}
                  {entry.hasFormattedXlsx && (
                    <Button
                      onClick={() => handleDownload(entry.id, 'xlsxFormatted')}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4" strokeWidth={1.8} />
                      Download Formatted Schedule
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={entryToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEntryToDelete(null);
          }
        }}
        title="Delete generation?"
        description="This removes the saved solver run and deletes its generated files."
        confirmLabel="Delete Generation"
        confirmVariant="destructive"
        onConfirm={confirmDeleteEntry}
      />
    </div>
  );
}
