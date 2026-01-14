/**
 * Flags & Solve Tab Component
 * Configure solver flags and run the optimization
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  useFlagsStore, 
  useStaffStore, 
  useDepartmentStore, 
  useSolverStore, 
  useSettingsStore,
  useUIStore,
  createConfigSnapshot,
} from '../../store';
import type { TrainingPair, TimesetRequest, FlagPreset, FavoredEmployeeDept, StaffMember } from '../../../main/ipc-types';
import { staffToCsv, departmentsToCsv } from '../../utils/csvValidators';

// Simple UUID generator for browser compatibility
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
];

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

export function FlagsTab() {
  const {
    favoredEmployees, addFavoredEmployee, removeFavoredEmployee,
    trainingPairs, addTrainingPair, removeTrainingPair,
    favoredDepartments, setFavoredDepartments,
    favoredFrontDeskDepts, setFavoredFrontDeskDepts,
    favoredEmployeeDepts, addFavoredEmployeeDept, removeFavoredEmployeeDept,
    timesets, addTimeset, removeTimeset,
    maxSolveSeconds, setMaxSolveSeconds,
    presets, savePreset, applyPreset, deletePreset,
  } = useFlagsStore();
  
  const { staff, staffPath, saveStaff, dirty: staffDirty } = useStaffStore();
  const { departments, deptPath, saveDepartments, dirty: deptDirty } = useDepartmentStore();
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
    
    try {
      const preset: FlagPreset = {
        id: generateId(),
        name: newPresetName.trim(),
        favoredEmployees,
        trainingPairs,
        favoredDepartments,
        favoredFrontDeskDepts,
        favoredEmployeeDepts,
        timesets,
        maxSolveSeconds,
      };
      
      await savePreset(preset);
      setNewPresetName('');
      setShowPresetDialog(false);
      showToast('Preset saved', 'success');
    } catch (error) {
      console.error('Failed to save preset:', error);
      showToast('Failed to save preset', 'error');
    }
  };

  const handleRunSolver = async () => {
    if (!canRun) return;
    
    try {
      // Auto-save any unsaved changes before running
      if (staffDirty) {
        await saveStaff();
      }
      if (deptDirty) {
        await saveDepartments();
      }
      
      // Save CSVs to temp files
      const staffCsv = staffToCsv(staff);
      const deptCsv = departmentsToCsv(departments);
      
      const staffResult = await window.electronAPI.files.saveCsvToTemp({ 
        content: staffCsv, 
        filename: 'staff.csv' 
      });
      const deptResult = await window.electronAPI.files.saveCsvToTemp({ 
        content: deptCsv, 
        filename: 'departments.csv' 
      });

      // Create config snapshot for history
      const snapshot = createConfigSnapshot();

      setRunning(true);
      
      const result = await window.electronAPI.solver.run({
        config: {
          staffPath: staffResult.path,
          deptPath: deptResult.path,
          maxSolveSeconds: maxSolveSeconds || settings?.solverMaxTime || 180,
          favoredEmployees,
          trainingPairs,
          favoredDepartments,
          favoredFrontDeskDepts,
          favoredEmployeeDepts,
          timesets,
        },
        snapshot,
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
          <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
            Favored Employees
            <Tooltip text="Favored employees get higher priority to reach their target hours. The solver will try harder to schedule them close to their goals and allow more flexible shift lengths." />
          </h3>
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
          <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
            Solver Time Limit
            <Tooltip text="The maximum time the optimizer will spend searching for the best schedule. Longer times may find better solutions but take longer. 2-3 minutes is usually sufficient for most schedules." />
          </h3>
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
          <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
            Training Pairs
            <Tooltip text="Pairs two employees to work in the same department at overlapping times. Useful for training new employees by scheduling them alongside experienced staff." />
          </h3>
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
          <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
            Favor Departments for Front Desk
            <Tooltip text="When filling front desk shifts, prioritize employees from these departments. Useful when you want specific teams to handle front desk coverage. Department members must be qualified for front_desk." />
          </h3>
          <p className="text-sm text-surface-400 mb-4">
            Prioritize members of these departments to cover front desk shifts.
            At least one member must have front_desk qualification.
          </p>
          
          <div className="space-y-2">
            {departmentNames.map(dept => (
              <label key={dept} className="flex items-center gap-3 cursor-pointer hover:bg-surface-800 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                <input
                  type="checkbox"
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
                <span className="text-sm text-surface-200">{dept}</span>
              </label>
            ))}
            {departmentNames.length === 0 && (
              <span className="text-sm text-surface-500">No departments loaded</span>
            )}
          </div>
        </div>

        {/* Department Hour Priority */}
        <div className="card">
          <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
            Department Hour Priority
            <Tooltip text="Increases the priority for these departments to meet their target hours. Selected departments will get bonus points for focused work time and penalty reduction when near target." />
          </h3>
          <p className="text-sm text-surface-400 mb-4">
            Boost focused hours and target adherence for specific departments
          </p>
          
          <div className="space-y-2">
            {departmentNames.map(dept => (
              <label key={dept} className="flex items-center gap-3 cursor-pointer hover:bg-surface-800 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                <input
                  type="checkbox"
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
                <span className="text-sm text-surface-200">{dept}</span>
              </label>
            ))}
            {departmentNames.length === 0 && (
              <span className="text-sm text-surface-500">No departments loaded</span>
            )}
          </div>
        </div>

        {/* Favor Employee for Department */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
            Favor Employee for Department
            <Tooltip text="Adds a soft preference for an employee to work in a specific department or front desk. This is a suggestion, not a requirement. The employee must be qualified for the role. Adjust the weight in Settings." />
          </h3>
          <p className="text-sm text-surface-400 mb-4">
            Softly prefer assigning specific employees to specific departments or front desk.
            The employee must be qualified for the role.
          </p>
          
          <FavoredEmployeeDeptForm
            employees={employeeNames}
            departments={departmentNames}
            staff={staff}
            onAdd={addFavoredEmployeeDept}
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
            {favoredEmployeeDepts.map((fed, i) => (
              <div key={i} className="flex items-center justify-between bg-surface-800 rounded-lg px-3 py-2">
                <span className="text-sm">
                  <span className="font-medium text-surface-200">{fed.employee}</span>
                  <span className="text-surface-400"> → </span>
                  <span className="text-accent-400">{fed.department}</span>
                </span>
                <button 
                  onClick={() => removeFavoredEmployeeDept(i)}
                  className="text-surface-400 hover:text-danger-400 ml-2"
                  aria-label={`Remove ${fed.employee} → ${fed.department}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {favoredEmployeeDepts.length === 0 && (
              <span className="text-sm text-surface-500">No employee-department preferences set</span>
            )}
          </div>
        </div>

        {/* Timesets - Force Employee to Role */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-surface-200 mb-2 flex items-center">
            Assign Employee to Role/Time
            <Tooltip text="Creates a hard requirement for an employee to work in a specific department at specific times. Unlike soft preferences, this will be enforced if possible. Use sparingly as too many constraints may make scheduling impossible." />
          </h3>
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
        <PresetDialog
          value={newPresetName}
          onChange={setNewPresetName}
          onSave={handleSavePreset}
          onClose={() => setShowPresetDialog(false)}
        />
      )}
    </div>
  );
}

// Preset Dialog Component with Escape key support
function PresetDialog({
  value,
  onChange,
  onSave,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-surface-950/80" onClick={onClose} />
      <div className="relative bg-surface-900 border border-surface-700 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-surface-200 mb-4">Save Preset</h3>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Preset name..."
          className="input mb-4"
          autoFocus
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={onSave} className="btn-primary" disabled={!value.trim()}>
            Save
          </button>
        </div>
      </div>
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
    <div className="flex gap-2">
      <select value={dept} onChange={(e) => setDept(e.target.value)} className="input flex-1 min-w-0">
        <option value="">Department</option>
        {departments.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={trainee1} onChange={(e) => setTrainee1(e.target.value)} className="input flex-1 min-w-0">
        <option value="">Trainee 1</option>
        {employees.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      <select value={trainee2} onChange={(e) => setTrainee2(e.target.value)} className="input flex-1 min-w-0">
        <option value="">Trainee 2</option>
        {employees.filter(e => e !== trainee1).map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      <button 
        onClick={handleAdd} 
        disabled={!dept || !trainee1 || !trainee2}
        className="btn-secondary flex-shrink-0 px-3"
      >
        +
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

// Favored Employee-Department Form Component
function FavoredEmployeeDeptForm({
  employees,
  departments,
  staff,
  onAdd,
}: {
  employees: string[];
  departments: string[];
  staff: StaffMember[];
  onAdd: (fed: FavoredEmployeeDept) => void;
}) {
  const [employee, setEmployee] = useState('');
  const [department, setDepartment] = useState('');

  // Get departments + front_desk the selected employee is qualified for
  const qualifiedRoles = useMemo(() => {
    if (!employee) return [];
    const staffMember = staff.find(s => s.name === employee);
    if (!staffMember) return [];
    
    const roles: string[] = [];
    
    // Check if qualified for front_desk
    if (staffMember.roles.some(role => 
      role.toLowerCase().replace(/\s+/g, '_') === 'front_desk'
    )) {
      roles.push('front_desk');
    }
    
    // Add departments the employee is qualified for
    departments.forEach(dept => {
      if (staffMember.roles.some(role => 
        role.toLowerCase().replace(/\s+/g, '_') === dept.toLowerCase().replace(/\s+/g, '_')
      )) {
        roles.push(dept);
      }
    });
    
    return roles;
  }, [employee, staff, departments]);

  const handleAdd = () => {
    if (employee && department) {
      onAdd({ employee, department });
      setEmployee('');
      setDepartment('');
    }
  };

  return (
    <div className="flex gap-2">
      <select value={employee} onChange={(e) => { setEmployee(e.target.value); setDepartment(''); }} className="input flex-1">
        <option value="">Select employee...</option>
        {employees.map(e => <option key={e} value={e}>{e}</option>)}
      </select>
      <select 
        value={department} 
        onChange={(e) => setDepartment(e.target.value)} 
        className="input flex-1"
        disabled={!employee}
      >
        <option value="">{employee ? 'Select role...' : 'Select employee first'}</option>
        {qualifiedRoles.map(d => (
          <option key={d} value={d}>
            {d === 'front_desk' ? '🖥️ Front Desk' : d}
          </option>
        ))}
      </select>
      <button 
        onClick={handleAdd}
        disabled={!employee || !department}
        className="btn-secondary flex-shrink-0"
      >
        Add
      </button>
    </div>
  );
}
