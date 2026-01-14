/**
 * Flags & Solve Tab Component
 * Configure solver flags and run the optimization
 */

import { useState, useMemo } from 'react';
import { 
  useFlagsStore, 
  useStaffStore, 
  useDepartmentStore, 
  useSolverStore, 
  useSettingsStore,
  useUIStore 
} from '../../store';
import type { TrainingPair, TimesetRequest, FlagPreset } from '../../../main/ipc-types';
import { staffToCsv, departmentsToCsv } from '../../utils/csvValidators';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

export function FlagsTab() {
  const {
    favoredEmployees, addFavoredEmployee, removeFavoredEmployee,
    trainingPairs, addTrainingPair, removeTrainingPair,
    favoredDepartments, setFavoredDepartments,
    favoredFrontDeskDepts, setFavoredFrontDeskDepts,
    timesets, addTimeset, removeTimeset,
    maxSolveSeconds, setMaxSolveSeconds,
    presets, savePreset, applyPreset, deletePreset,
  } = useFlagsStore();
  
  const { staff, staffPath } = useStaffStore();
  const { departments, deptPath } = useDepartmentStore();
  const { running, setRunning } = useSolverStore();
  const { settings } = useSettingsStore();
  const { showToast, setActiveTab } = useUIStore();

  const [newFavored, setNewFavored] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const [showPresetDialog, setShowPresetDialog] = useState(false);

  const employeeNames = useMemo(() => staff.map(s => s.name).filter(Boolean), [staff]);
  const departmentNames = useMemo(() => departments.map(d => d.name).filter(Boolean), [departments]);

  const canRun = staff.length > 0 && departments.length > 0;

  const handleAddFavored = () => {
    if (newFavored && !favoredEmployees.includes(newFavored)) {
      addFavoredEmployee(newFavored);
      setNewFavored('');
    }
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;
    
    const preset: FlagPreset = {
      id: crypto.randomUUID(),
      name: newPresetName.trim(),
      favoredEmployees,
      trainingPairs,
      favoredDepartments,
      favoredFrontDeskDepts,
      timesets,
      maxSolveSeconds,
    };
    
    await savePreset(preset);
    setNewPresetName('');
    setShowPresetDialog(false);
    showToast('Preset saved', 'success');
  };

  const handleRunSolver = async () => {
    if (!canRun) return;
    
    try {
      // Save CSVs to temp files and get paths
      const staffCsv = staffToCsv(staff);
      const deptCsv = departmentsToCsv(departments);
      
      // Save to temp locations via IPC
      const staffResult = await window.electronAPI.files.saveCsv({ kind: 'staff', content: staffCsv });
      const deptResult = await window.electronAPI.files.saveCsv({ kind: 'dept', content: deptCsv });
      
      if (staffResult.canceled || deptResult.canceled || !staffResult.path || !deptResult.path) {
        showToast('Please save CSV files before running', 'error');
        return;
      }

      setRunning(true);
      
      const result = await window.electronAPI.solver.run({
        staffPath: staffResult.path,
        deptPath: deptResult.path,
        maxSolveSeconds: maxSolveSeconds || settings?.solverMaxTime || 180,
        showProgress: true,
        favoredEmployees,
        trainingPairs,
        favoredDepartments,
        favoredFrontDeskDepts,
        timesets,
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
          <button 
            onClick={() => setShowPresetDialog(true)} 
            className="btn-secondary"
          >
            Save as Preset
          </button>
          <button
            onClick={handleRunSolver}
            disabled={!canRun || running}
            className="btn-primary"
          >
            {running ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
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
          </button>
        </div>
      </div>

      {/* Warnings */}
      {!canRun && (
        <div className="bg-warning-500/10 border border-warning-500/30 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-warning-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-warning-400">Missing Data</p>
            <p className="text-sm text-warning-300 mt-1">
              {staff.length === 0 && 'Import or create staff data. '}
              {departments.length === 0 && 'Import or create department data. '}
            </p>
          </div>
        </div>
      )}

      {/* Presets */}
      {presets.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-surface-200 mb-4">Saved Presets</h3>
          <div className="flex flex-wrap gap-2">
            {presets.map(preset => (
              <div key={preset.id} className="flex items-center gap-1 bg-surface-800 rounded-lg">
                <button
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 text-sm hover:bg-surface-700 rounded-l-lg transition-colors"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="p-1.5 text-surface-400 hover:text-danger-400 hover:bg-surface-700 rounded-r-lg transition-colors"
                  aria-label={`Delete preset ${preset.name}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Favored Employees */}
        <div className="card">
          <h3 className="font-semibold text-surface-200 mb-2">Favored Employees</h3>
          <p className="text-sm text-surface-400 mb-4">
            Prioritize specific employees to hit their target hours
          </p>
          
          <div className="flex gap-2 mb-4">
            <select
              value={newFavored}
              onChange={(e) => setNewFavored(e.target.value)}
              className="input flex-1"
            >
              <option value="">Select employee...</option>
              {employeeNames.filter(n => !favoredEmployees.includes(n)).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button 
              onClick={handleAddFavored}
              disabled={!newFavored}
              className="btn-secondary"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {favoredEmployees.map(emp => (
              <span key={emp} className="badge-success flex items-center gap-1">
                {emp}
                <button 
                  onClick={() => removeFavoredEmployee(emp)}
                  className="hover:text-danger-400"
                  aria-label={`Remove ${emp}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {favoredEmployees.length === 0 && (
              <span className="text-sm text-surface-500">No favored employees</span>
            )}
          </div>
        </div>

        {/* Solver Time */}
        <div className="card">
          <h3 className="font-semibold text-surface-200 mb-2">Solver Time Limit</h3>
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
              className="w-full accent-accent-500"
            />
            <div className="flex justify-between text-sm">
              <span className="text-surface-400">30 sec</span>
              <span className="font-medium text-accent-400">{maxSolveSeconds} seconds</span>
              <span className="text-surface-400">10 min</span>
            </div>
          </div>
        </div>

        {/* Training Pairs */}
        <div className="card">
          <h3 className="font-semibold text-surface-200 mb-2">Training Pairs</h3>
          <p className="text-sm text-surface-400 mb-4">
            Schedule employees to work together for training
          </p>
          
          <TrainingPairForm 
            departments={departmentNames}
            employees={employeeNames}
            onAdd={addTrainingPair}
          />

          <div className="space-y-2 mt-4">
            {trainingPairs.map((pair, i) => (
              <div key={i} className="flex items-center justify-between bg-surface-800 rounded-lg px-3 py-2">
                <span className="text-sm">
                  <span className="text-accent-400">{pair.department}</span>: {pair.trainee1} + {pair.trainee2}
                </span>
                <button 
                  onClick={() => removeTrainingPair(i)}
                  className="text-surface-400 hover:text-danger-400"
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

        {/* Favor Department for Front Desk */}
        <div className="card">
          <h3 className="font-semibold text-surface-200 mb-2">Favor Departments for Front Desk</h3>
          <p className="text-sm text-surface-400 mb-4">
            Prioritize members of these departments to cover front desk shifts.
            At least one member must have front_desk qualification.
          </p>
          
          <div className="space-y-3">
            {departmentNames.map(dept => (
              <div key={dept} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`favor-fd-${dept}`}
                  checked={dept in favoredFrontDeskDepts}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFavoredFrontDeskDepts({ ...favoredFrontDeskDepts, [dept]: 1.0 });
                    } else {
                      const { [dept]: _, ...rest } = favoredFrontDeskDepts;
                      setFavoredFrontDeskDepts(rest);
                    }
                  }}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500"
                />
                <label htmlFor={`favor-fd-${dept}`} className="flex-1 text-sm text-surface-200">
                  {dept}
                </label>
                {dept in favoredFrontDeskDepts && (
                  <input
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={favoredFrontDeskDepts[dept]}
                    onChange={(e) => setFavoredFrontDeskDepts({ ...favoredFrontDeskDepts, [dept]: parseFloat(e.target.value) })}
                    className="input w-20 py-1 text-sm"
                    aria-label={`Front desk priority multiplier for ${dept}`}
                  />
                )}
              </div>
            ))}
            {departmentNames.length === 0 && (
              <span className="text-sm text-surface-500">No departments loaded</span>
            )}
          </div>
        </div>

        {/* Department Hour Priority */}
        <div className="card">
          <h3 className="font-semibold text-surface-200 mb-2">Department Hour Priority</h3>
          <p className="text-sm text-surface-400 mb-4">
            Boost focused hours and target adherence for specific departments
          </p>
          
          <div className="space-y-3">
            {departmentNames.map(dept => (
              <div key={dept} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`favor-${dept}`}
                  checked={dept in favoredDepartments}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFavoredDepartments({ ...favoredDepartments, [dept]: 1.0 });
                    } else {
                      const { [dept]: _, ...rest } = favoredDepartments;
                      setFavoredDepartments(rest);
                    }
                  }}
                  className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500"
                />
                <label htmlFor={`favor-${dept}`} className="flex-1 text-sm text-surface-200">
                  {dept}
                </label>
                {dept in favoredDepartments && (
                  <input
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={favoredDepartments[dept]}
                    onChange={(e) => setFavoredDepartments({ ...favoredDepartments, [dept]: parseFloat(e.target.value) })}
                    className="input w-20 py-1 text-sm"
                    aria-label={`Hour priority multiplier for ${dept}`}
                  />
                )}
              </div>
            ))}
            {departmentNames.length === 0 && (
              <span className="text-sm text-surface-500">No departments loaded</span>
            )}
          </div>
        </div>

        {/* Timesets - Force Employee to Role */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-surface-200 mb-2">Assign Employee to Role/Time</h3>
          <p className="text-sm text-surface-400 mb-4">
            Force a specific employee to work a role at specific times. 
            Use this to favor someone for a particular role (they must be qualified).
          </p>
          
          <TimesetForm
            employees={employeeNames}
            departments={departmentNames}
            onAdd={addTimeset}
          />

          <div className="grid sm:grid-cols-2 gap-2 mt-4">
            {timesets.map((ts, i) => (
              <div key={i} className="flex items-center justify-between bg-surface-800 rounded-lg px-3 py-2">
                <span className="text-sm">
                  <span className="font-medium text-surface-200">{ts.employee}</span>
                  <span className="text-surface-400"> → </span>
                  <span className="text-accent-400">{ts.department}</span>
                  <span className="text-surface-400"> on </span>
                  <span>{ts.day} {ts.startTime}-{ts.endTime}</span>
                </span>
                <button 
                  onClick={() => removeTimeset(i)}
                  className="text-surface-400 hover:text-danger-400 ml-2"
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

      {/* Save Preset Dialog */}
      {showPresetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-surface-950/80" onClick={() => setShowPresetDialog(false)} />
          <div className="relative bg-surface-900 border border-surface-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-surface-200 mb-4">Save Preset</h3>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset name..."
              className="input mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowPresetDialog(false)} className="btn-ghost">
                Cancel
              </button>
              <button onClick={handleSavePreset} className="btn-primary" disabled={!newPresetName.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Training Pair Form Component
function TrainingPairForm({ 
  departments, 
  employees, 
  onAdd 
}: { 
  departments: string[]; 
  employees: string[]; 
  onAdd: (pair: TrainingPair) => void;
}) {
  const [dept, setDept] = useState('');
  const [trainee1, setTrainee1] = useState('');
  const [trainee2, setTrainee2] = useState('');

  const handleAdd = () => {
    if (dept && trainee1 && trainee2 && trainee1 !== trainee2) {
      onAdd({ department: dept, trainee1, trainee2 });
      setDept('');
      setTrainee1('');
      setTrainee2('');
    }
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      <select value={dept} onChange={(e) => setDept(e.target.value)} className="input">
        <option value="">Department</option>
        {departments.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={trainee1} onChange={(e) => setTrainee1(e.target.value)} className="input">
        <option value="">Trainee 1</option>
        {employees.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      <select value={trainee2} onChange={(e) => setTrainee2(e.target.value)} className="input">
        <option value="">Trainee 2</option>
        {employees.filter(e => e !== trainee1).map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      <button 
        onClick={handleAdd} 
        disabled={!dept || !trainee1 || !trainee2}
        className="btn-secondary"
      >
        Add
      </button>
    </div>
  );
}

// Timeset Form Component
function TimesetForm({
  employees,
  departments,
  onAdd,
}: {
  employees: string[];
  departments: string[];
  onAdd: (ts: TimesetRequest) => void;
}) {
  const [employee, setEmployee] = useState('');
  const [day, setDay] = useState('');
  const [department, setDepartment] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

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

  return (
    <div className="grid grid-cols-6 gap-2">
      <select value={employee} onChange={(e) => setEmployee(e.target.value)} className="input">
        <option value="">Employee</option>
        {employees.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      <select value={day} onChange={(e) => setDay(e.target.value)} className="input">
        <option value="">Day</option>
        {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input">
        <option value="">Department</option>
        {departments.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input">
        <option value="">Start</option>
        {TIME_OPTIONS.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input">
        <option value="">End</option>
        {TIME_OPTIONS.filter(t => t > startTime).map(t => <option key={t} value={t}>{t}</option>)}
      </select>
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
