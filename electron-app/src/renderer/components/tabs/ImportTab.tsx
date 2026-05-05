/**
 * Import Tab Component
 * CSV file import with drag/drop, validation, sample downloads, and config history
 */

import { useState, useEffect } from 'react';
import { ArrowRight, Download, Trash2, Users, Building2 } from 'lucide-react';
import { useStaffStore, useDepartmentStore, useUIStore, useHistoryStore } from '../../store';
import { DropZone } from '../ui/DropZone';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { NoticePanel } from '../ui/notice-panel';
import { QuickStartGuide } from '../ui/QuickStartGuide';
import { validateStaffCsv, validateDepartmentCsv, parseStaffCsv, parseDepartmentCsv } from '../../utils/csvValidators';
import type { HistoryEntry } from '../../../main/ipc-types';

export function ImportTab() {
  const {
    setStaff,
    setErrors: setStaffErrors,
    staff,
    errors: staffValidationErrors,
    warnings: staffValidationWarnings,
  } = useStaffStore();
  const {
    setDepartments,
    setErrors: setDeptErrors,
    departments,
    errors: deptValidationErrors,
    warnings: deptValidationWarnings,
  } = useDepartmentStore();
  const { history, loadHistory, restoreConfig, deleteEntry } = useHistoryStore();
  const { showToast, setActiveTab } = useUIStore();
  
  const [staffImporting, setStaffImporting] = useState(false);
  const [deptImporting, setDeptImporting] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<HistoryEntry | null>(null);

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
        showToast(
          validation.warnings.length > 0
            ? `Imported ${parsedStaff.length} employees with ${validation.warnings.length} warning(s)`
            : `Imported ${parsedStaff.length} employees`,
          'success',
        );
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
        showToast(
          validation.warnings.length > 0
            ? `Imported ${parsedDepts.length} departments with ${validation.warnings.length} warning(s)`
            : `Imported ${parsedDepts.length} departments`,
          'success',
        );
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
    setConfigToDelete(entry);
  };

  const confirmDeleteConfig = async () => {
    if (!configToDelete) return;

    try {
      await deleteEntry(configToDelete.id);
      showToast('Configuration deleted', 'info');
    } catch (err) {
      console.error('Failed to delete config:', err);
      showToast('Failed to delete configuration', 'error');
    } finally {
      setConfigToDelete(null);
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

  const renderIssues = (
    items: Array<{ row?: number; column?: string; message: string }>,
    kind: 'error' | 'warning',
    label: string,
  ) => {
    if (items.length === 0) return null;

    return (
      <NoticePanel variant={kind} title={`${label} (${items.length})`}>
        <ul className="max-h-32 space-y-1 overflow-auto">
          {items.slice(0, 5).map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-surface-300">•</span>
              <span>
                {item.row && `Row ${item.row}: `}
                {item.column && `[${item.column}] `}
                {item.message}
              </span>
            </li>
          ))}
          {items.length > 5 && (
            <li className="text-surface-400">
              ...and {items.length - 5} more
            </li>
          )}
        </ul>
      </NoticePanel>
    );
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
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-900 text-[12px] font-semibold text-surface-300">
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
                  <Button
                    onClick={() => handleRestoreConfig(entry)}
                    variant="secondary"
                    size="sm"
                  >
                    Restore
                  </Button>
                  <Button
                    onClick={() => handleDeleteConfig(entry)}
                    variant="ghost"
                    size="icon-sm"
                    className="text-danger-300 hover:bg-danger-700/10 hover:text-danger-200"
                    aria-label="Delete configuration"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                  </Button>
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
            <Button
              onClick={() => handleDownloadSample('staff')}
              variant="ghost"
              size="sm"
            >
              <Download className="h-4 w-4" strokeWidth={1.8} />
              Download Sample
            </Button>
          </div>

          <DropZone
            onFileDrop={handleStaffDrop}
            label="Drop Staff CSV Here"
            description="Employee names, roles, availability, and hour targets"
            icon={
              <Users className="h-6 w-6" strokeWidth={1.8} />
            }
          />

          <div className="flex items-center justify-between text-sm">
            <Button
              onClick={() => handleOpenFilePicker('staff')}
              variant="secondary"
              size="sm"
              disabled={staffImporting}
            >
              {staffImporting ? 'Importing...' : 'Browse Files'}
            </Button>
            
            {staff.length > 0 && (
              <Button
                onClick={() => setActiveTab('staff')}
                variant="outline"
                size="sm"
                className="gap-2 px-3"
              >
                <span className="text-sm font-medium">
                  {staff.length} employees loaded
                </span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            )}
          </div>

          {renderIssues(staffValidationErrors, 'error', 'Validation errors')}
          {renderIssues(staffValidationWarnings, 'warning', 'Warnings')}
        </div>

        {/* Department Import */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-surface-200">Departments</h3>
            <Button
              onClick={() => handleDownloadSample('dept')}
              variant="ghost"
              size="sm"
            >
              <Download className="h-4 w-4" strokeWidth={1.8} />
              Download Sample
            </Button>
          </div>

          <DropZone
            onFileDrop={handleDeptDrop}
            label="Drop Department CSV Here"
            description="Department names with target and max hour budgets"
            icon={
              <Building2 className="h-6 w-6" strokeWidth={1.8} />
            }
          />

          <div className="flex items-center justify-between text-sm">
            <Button
              onClick={() => handleOpenFilePicker('dept')}
              variant="secondary"
              size="sm"
              disabled={deptImporting}
            >
              {deptImporting ? 'Importing...' : 'Browse Files'}
            </Button>
            
            {departments.length > 0 && (
              <Button
                onClick={() => setActiveTab('departments')}
                variant="outline"
                size="sm"
                className="gap-2 px-3"
              >
                <span className="text-sm font-medium">
                  {departments.length} departments loaded
                </span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </Button>
            )}
          </div>

          {renderIssues(deptValidationErrors, 'error', 'Validation errors')}
          {renderIssues(deptValidationWarnings, 'warning', 'Warnings')}
        </div>
      </div>

      <QuickStartGuide />
      <ConfirmDialog
        open={configToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfigToDelete(null);
          }
        }}
        title="Delete saved configuration?"
        description="This removes the saved configuration and its output files from history."
        confirmLabel="Delete Configuration"
        confirmVariant="destructive"
        onConfirm={confirmDeleteConfig}
      />
    </div>
  );
}
