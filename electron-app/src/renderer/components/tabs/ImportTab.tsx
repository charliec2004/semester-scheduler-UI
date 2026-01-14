/**
 * Import Tab Component
 * CSV file import with drag/drop, validation, sample downloads, and config history
 */

import { useState, useEffect } from 'react';
import { useStaffStore, useDepartmentStore, useUIStore, useHistoryStore } from '../../store';
import { DropZone } from '../ui/DropZone';
import { validateStaffCsv, validateDepartmentCsv, parseStaffCsv, parseDepartmentCsv } from '../../utils/csvValidators';
import type { HistoryEntry } from '../../../main/ipc-types';

export function ImportTab() {
  const { setStaff, setErrors: setStaffErrors, staff, errors: staffValidationErrors } = useStaffStore();
  const { setDepartments, setErrors: setDeptErrors, departments, errors: deptValidationErrors } = useDepartmentStore();
  const { history, loadHistory, restoreConfig, deleteEntry } = useHistoryStore();
  const { showToast, setActiveTab } = useUIStore();
  
  const [staffImporting, setStaffImporting] = useState(false);
  const [deptImporting, setDeptImporting] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleStaffDrop = async (content: string, filename: string) => {
    setStaffImporting(true);
    try {
      const validation = validateStaffCsv(content);
      setStaffErrors(validation.errors, validation.warnings);
      
      if (validation.valid) {
        const parsedStaff = parseStaffCsv(content);
        setStaff(parsedStaff, filename);
        showToast(`Imported ${parsedStaff.length} employees`, 'success');
      } else {
        showToast(`Validation failed: ${validation.errors.length} error(s)`, 'error');
      }
    } catch (err) {
      showToast(`Import failed: ${(err as Error).message}`, 'error');
    }
    setStaffImporting(false);
  };

  const handleDeptDrop = async (content: string, filename: string) => {
    setDeptImporting(true);
    try {
      const validation = validateDepartmentCsv(content);
      setDeptErrors(validation.errors, validation.warnings);
      
      if (validation.valid) {
        const parsedDepts = parseDepartmentCsv(content);
        setDepartments(parsedDepts, filename);
        showToast(`Imported ${parsedDepts.length} departments`, 'success');
      } else {
        showToast(`Validation failed: ${validation.errors.length} error(s)`, 'error');
      }
    } catch (err) {
      showToast(`Import failed: ${(err as Error).message}`, 'error');
    }
    setDeptImporting(false);
  };

  const handleOpenFilePicker = async (kind: 'staff' | 'dept') => {
    try {
      const result = await window.electronAPI.files.openCsv(kind);
      if (!result.canceled && result.content && result.path) {
        if (kind === 'staff') {
          handleStaffDrop(result.content, result.path);
        } else {
          handleDeptDrop(result.content, result.path);
        }
      }
    } catch (err) {
      showToast(`Failed to open file: ${(err as Error).message}`, 'error');
    }
  };

  const handleDownloadSample = async (kind: 'staff' | 'dept') => {
    try {
      const result = await window.electronAPI.files.downloadSample(kind);
      if (!result.canceled) {
        showToast(`Sample ${kind} CSV saved`, 'success');
      }
    } catch (err) {
      showToast(`Failed to download sample: ${(err as Error).message}`, 'error');
    }
  };

  const handleRestoreConfig = async (entry: HistoryEntry) => {
    try {
      const success = await restoreConfig(entry.id);
      if (success) {
        showToast(`Restored configuration from ${formatDate(entry.timestamp)}`, 'success');
      } else {
        showToast('Failed to restore configuration', 'error');
      }
    } catch (err) {
      console.error('Failed to restore config:', err);
      showToast('Failed to restore configuration', 'error');
    }
  };

  const handleDeleteConfig = async (entry: HistoryEntry) => {
    if (window.confirm(`Delete this configuration and its output files?`)) {
      try {
        await deleteEntry(entry.id);
        showToast('Configuration deleted', 'info');
      } catch (err) {
        console.error('Failed to delete config:', err);
        showToast('Failed to delete configuration', 'error');
      }
    }
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-semibold text-surface-100 mb-2">
          Import Data
        </h2>
        <p className="text-surface-400">
          Import your staff and department CSV files to get started, or restore a previous configuration.
        </p>
      </div>

      {/* Config History */}
      {history.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-surface-200 mb-4">Previous Configurations</h3>
          <div className="space-y-2">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-accent-600/20 rounded-full flex items-center justify-center text-accent-400 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-surface-200">
                      {formatDate(entry.timestamp)}
                    </div>
                    <div className="text-xs text-surface-400">
                      {entry.employeeCount} employees, {entry.departmentCount} departments
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestoreConfig(entry)}
                    className="btn-secondary text-sm py-1.5"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handleDeleteConfig(entry)}
                    className="btn-ghost text-danger-400 hover:text-danger-300 p-1.5"
                    aria-label="Delete configuration"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Staff Import */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-surface-200">Staff / Employees</h3>
            <button
              onClick={() => handleDownloadSample('staff')}
              className="btn-ghost text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Sample
            </button>
          </div>

          <DropZone
            onFileDrop={handleStaffDrop}
            label="Drop Staff CSV Here"
            description="Employee names, roles, availability, and hour targets"
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />

          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => handleOpenFilePicker('staff')}
              className="btn-secondary"
              disabled={staffImporting}
            >
              {staffImporting ? 'Importing...' : 'Browse Files'}
            </button>
            
            {staff.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="badge-success">
                  {staff.length} employees loaded
                </span>
                <button
                  onClick={() => setActiveTab('staff')}
                  className="text-accent-400 hover:text-accent-300"
                >
                  View →
                </button>
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {staffValidationErrors.length > 0 && (
            <div className="bg-danger-500/10 border border-danger-500/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-danger-400 mb-2">
                Validation Errors ({staffValidationErrors.length})
              </h4>
              <ul className="space-y-1 text-sm text-danger-300 max-h-32 overflow-auto">
                {staffValidationErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>
                    {err.row && `Row ${err.row}: `}
                    {err.column && `[${err.column}] `}
                    {err.message}
                  </li>
                ))}
                {staffValidationErrors.length > 5 && (
                  <li className="text-surface-400">
                    ...and {staffValidationErrors.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Department Import */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-surface-200">Departments</h3>
            <button
              onClick={() => handleDownloadSample('dept')}
              className="btn-ghost text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Sample
            </button>
          </div>

          <DropZone
            onFileDrop={handleDeptDrop}
            label="Drop Department CSV Here"
            description="Department names with target and max hour budgets"
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />

          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => handleOpenFilePicker('dept')}
              className="btn-secondary"
              disabled={deptImporting}
            >
              {deptImporting ? 'Importing...' : 'Browse Files'}
            </button>
            
            {departments.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="badge-success">
                  {departments.length} departments loaded
                </span>
                <button
                  onClick={() => setActiveTab('departments')}
                  className="text-accent-400 hover:text-accent-300"
                >
                  View →
                </button>
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {deptValidationErrors.length > 0 && (
            <div className="bg-danger-500/10 border border-danger-500/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-danger-400 mb-2">
                Validation Errors ({deptValidationErrors.length})
              </h4>
              <ul className="space-y-1 text-sm text-danger-300 max-h-32 overflow-auto">
                {deptValidationErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>
                    {err.row && `Row ${err.row}: `}
                    {err.column && `[${err.column}] `}
                    {err.message}
                  </li>
                ))}
                {deptValidationErrors.length > 5 && (
                  <li className="text-surface-400">
                    ...and {deptValidationErrors.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="card bg-surface-800/50">
        <h3 className="font-semibold text-surface-200 mb-4">Quick Start Guide</h3>
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div className="space-y-2">
            <div className="w-8 h-8 bg-accent-600/20 rounded-lg flex items-center justify-center text-accent-400 font-semibold">
              1
            </div>
            <h4 className="font-medium text-surface-200">Import or Create Data</h4>
            <p className="text-surface-400">
              Upload your CSV files or use the Staff and Departments tabs to create data from scratch.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-accent-600/20 rounded-lg flex items-center justify-center text-accent-400 font-semibold">
              2
            </div>
            <h4 className="font-medium text-surface-200">Configure Flags</h4>
            <p className="text-surface-400">
              Set preferences like favored employees, training pairs, and department priorities.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-accent-600/20 rounded-lg flex items-center justify-center text-accent-400 font-semibold">
              3
            </div>
            <h4 className="font-medium text-surface-200">Generate Schedule</h4>
            <p className="text-surface-400">
              Run the optimizer and export your completed schedule as Excel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
