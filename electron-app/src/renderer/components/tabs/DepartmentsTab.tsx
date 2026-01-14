/**
 * Departments Tab Component
 * Table editor for department hour budgets
 */

import { useState } from 'react';
import { useDepartmentStore, useUIStore } from '../../store';
import { EmptyState } from '../ui/EmptyState';
import { departmentsToCsv } from '../../utils/csvValidators';
import type { Department } from '../../../main/ipc-types';

export function DepartmentsTab() {
  const { departments, updateDepartment, addDepartment, removeDepartment, dirty, setDirty } = useDepartmentStore();
  const { showToast } = useUIStore();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddDepartment = () => {
    const newDept: Department = {
      name: '',
      targetHours: 20,
      maxHours: 30,
    };
    addDepartment(newDept);
    setEditingIndex(departments.length);
  };

  const handleExport = async () => {
    const csv = departmentsToCsv(departments);
    const result = await window.electronAPI.files.saveCsv({
      kind: 'dept',
      content: csv,
    });
    if (!result.canceled) {
      setDirty(false);
      showToast('Department CSV exported successfully', 'success');
    }
  };

  const getTotalHours = () => {
    return {
      target: departments.reduce((sum, d) => sum + d.targetHours, 0),
      max: departments.reduce((sum, d) => sum + d.maxHours, 0),
    };
  };

  if (departments.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
        title="No Department Data"
        description="Import a department CSV from the Import tab or create departments manually."
        action={{
          label: 'Add First Department',
          onClick: handleAddDepartment,
        }}
      />
    );
  }

  const totals = getTotalHours();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-semibold text-surface-100 mb-1">
            Department Budgets
          </h2>
          <p className="text-surface-400">
            {departments.length} department{departments.length !== 1 ? 's' : ''} 
            {dirty && <span className="text-warning-400 ml-2">(unsaved changes)</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAddDepartment} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Department
          </button>
          <button onClick={handleExport} className="btn-primary" disabled={departments.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="card bg-surface-800/50">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-display font-semibold text-surface-100">
              {departments.length}
            </div>
            <div className="text-sm text-surface-400">Departments</div>
          </div>
          <div>
            <div className="text-3xl font-display font-semibold text-accent-400">
              {totals.target}h
            </div>
            <div className="text-sm text-surface-400">Total Target Hours</div>
          </div>
          <div>
            <div className="text-3xl font-display font-semibold text-surface-300">
              {totals.max}h
            </div>
            <div className="text-sm text-surface-400">Total Max Hours</div>
          </div>
        </div>
      </div>

      {/* Department Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-800">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-medium text-surface-300">
                Department
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-surface-300">
                Target Hours
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-surface-300">
                Max Hours
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-surface-300 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept, index) => {
              const isEditing = editingIndex === index;
              const hasError = dept.targetHours > dept.maxHours;

              return (
                <tr 
                  key={index} 
                  className={`
                    border-t border-surface-700
                    ${hasError ? 'bg-danger-500/5' : 'hover:bg-surface-800/50'}
                  `}
                >
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={dept.name}
                        onChange={(e) => updateDepartment(index, { name: e.target.value })}
                        onBlur={() => setEditingIndex(null)}
                        className="input py-1"
                        placeholder="Department name"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setEditingIndex(index)}
                        className="text-left hover:text-accent-400 transition-colors"
                      >
                        {dept.name || <span className="text-surface-500 italic">Unnamed</span>}
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={dept.targetHours}
                      onChange={(e) => updateDepartment(index, { targetHours: parseFloat(e.target.value) || 0 })}
                      className={`input py-1 text-right w-24 ml-auto ${hasError ? 'input-error' : ''}`}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={dept.maxHours}
                      onChange={(e) => updateDepartment(index, { maxHours: parseFloat(e.target.value) || 0 })}
                      className={`input py-1 text-right w-24 ml-auto ${hasError ? 'input-error' : ''}`}
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ${dept.name || 'this department'}?`)) {
                          removeDepartment(index);
                        }
                      }}
                      className="btn-ghost text-danger-400 hover:text-danger-300 p-1"
                      aria-label={`Delete ${dept.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-surface-800/50">
            <tr>
              <td className="py-3 px-4 font-medium text-surface-300">
                Total
              </td>
              <td className="py-3 px-4 text-right font-medium text-accent-400">
                {totals.target}h
              </td>
              <td className="py-3 px-4 text-right font-medium text-surface-300">
                {totals.max}h
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Validation Messages */}
      {departments.some(d => d.targetHours > d.maxHours) && (
        <div className="bg-danger-500/10 border border-danger-500/30 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-danger-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium text-danger-400">Validation Error</p>
            <p className="text-sm text-danger-300 mt-1">
              Some departments have target hours exceeding max hours. Please fix before generating a schedule.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
