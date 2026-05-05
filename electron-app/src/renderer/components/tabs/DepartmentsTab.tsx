/**
 * Departments Tab Component
 * Table editor for department hour budgets
 */

import { useState } from 'react';
import { Check, Download, GripVertical, Plus, Trash2 } from 'lucide-react';
import { NoticePanel } from '../ui/notice-panel';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { HourInput } from '../ui/hour-input';
import { Input } from '../ui/input';
import { useDepartmentStore, useStaffStore, useUIStore } from '../../store';
import { EmptyState } from '../ui/EmptyState';
import { departmentsToCsv } from '../../utils/csvValidators';
import { formatHoursLabel } from '../../utils/hours';
import type { Department } from '../../../main/ipc-types';

export function DepartmentsTab() {
  const { departments, updateDepartment, addDepartment, removeDepartment, reorderDepartments, dirty, setDirty, saveDepartments } = useDepartmentStore();
  const { dirty: staffDirty, saveStaff } = useStaffStore();
  const { showToast } = useUIStore();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverBottom, setDragOverBottom] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<{ index: number; name: string } | null>(null);
  const inlineDepartmentNameClassName =
    'h-8 w-full rounded-md px-2.5 py-1 text-left text-[13px] transition-colors placeholder:italic';

  const handleAddDepartment = () => {
    const newDept: Department = {
      name: '',
      targetHours: 20,
      maxHours: 30,
    };
    addDepartment(newDept);
    // Set editing index to the new department (will be at end of array)
    setEditingIndex(departments.length);
    setEditingName('');
  };

  const beginEditingDepartment = (index: number, name: string) => {
    if (editingIndex === index) return;
    setEditingIndex(index);
    setEditingName(name);
  };

  const commitDepartmentName = (index: number) => {
    updateDepartment(index, { name: editingName });
    setEditingIndex(null);
    setEditingName('');
  };

  const handleExport = async () => {
    try {
      const csv = departmentsToCsv(departments);
      const result = await window.electronAPI.files.saveCsv({
        kind: 'dept',
        content: csv,
      });
      if (!result.canceled) {
        setDirty(false);
        showToast('Department CSV exported successfully', 'success');
      }
    } catch (err) {
      console.error('Failed to export department CSV:', err);
      showToast('Failed to export department CSV', 'error');
    }
  };

  const getTotalHours = () => {
    return {
      target: departments.reduce((sum, d) => sum + d.targetHours, 0),
      max: departments.reduce((sum, d) => sum + d.maxHours, 0),
    };
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Find the parent row to use as drag image (so entire row shows, not just the handle)
    const row = (e.currentTarget as HTMLElement).closest('tr');
    if (row) {
      e.dataTransfer.setDragImage(row, 50, 20);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === index) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isBottomHalf = e.clientY > rect.top + rect.height / 2;
    const isLastItem = index === departments.length - 1;
    
    setDragOverIndex(index);
    setDragOverBottom(isBottomHalf && isLastItem);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
    setDragOverBottom(false);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === toIndex) return;
    
    // If dropping on bottom half of last item, move to end
    const targetIndex = dragOverBottom ? departments.length - 1 : toIndex;
    reorderDepartments(draggedIndex, targetIndex);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverBottom(false);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragOverBottom(false);
  };

  const confirmDeleteDepartment = async () => {
    if (!departmentToDelete) return;

    try {
      removeDepartment(departmentToDelete.index);
      await saveDepartments();
      if (useStaffStore.getState().dirty) {
        await saveStaff();
      }
      showToast('Department deleted', 'info');
    } catch (err) {
      console.error('Failed to save after delete:', err);
      showToast('Failed to save changes', 'error');
    } finally {
      setDepartmentToDelete(null);
    }
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
            {dirty && <span className="ml-2 text-warning-300">(unsaved changes)</span>}
          </p>
          <p className="mt-1 text-sm text-surface-500">
            Front Desk is already included as a built-in department. Add only your additional departments here.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleAddDepartment} variant="secondary" size="sm">
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            Add Department
          </Button>
          <Button
            onClick={async () => {
              try {
                await saveDepartments();
                if (staffDirty) {
                  await saveStaff();
                }
                showToast('Department data saved', 'success');
              } catch (err) {
                console.error('Failed to save departments:', err);
                showToast('Failed to save department data', 'error');
              }
            }}
            disabled={!dirty || departments.length === 0}
            variant="default"
            size="sm"
          >
            <Check className="h-4 w-4" strokeWidth={1.8} />
            Save
          </Button>
          <Button onClick={handleExport} variant="secondary" size="sm" disabled={departments.length === 0}>
            <Download className="h-4 w-4" strokeWidth={1.8} />
            Export CSV
          </Button>
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
            <div className="text-3xl font-display font-semibold text-surface-200">
              {formatHoursLabel(totals.target)}
            </div>
            <div className="text-sm text-surface-400">Total Target Hours</div>
          </div>
          <div>
            <div className="text-3xl font-display font-semibold text-surface-300">
              {formatHoursLabel(totals.max)}
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
              <th className="w-10"></th>
              <th className="text-left py-3 px-4 text-sm font-medium text-surface-300">
                Department
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-surface-300">
                Target Hours
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-surface-300">
                Max Hours
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-surface-300 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept, index) => {
              const isEditing = editingIndex === index;
              const hasError = dept.targetHours > dept.maxHours;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;
              const isLastItem = index === departments.length - 1;
              const showTopBorder = isDragOver && !dragOverBottom;
              const showBottomBorder = isDragOver && dragOverBottom && isLastItem;

              return (
                <tr 
                  key={`dept-${index}`} 
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    border-t border-surface-700 transition-all
                    ${hasError ? 'bg-surface-900/70' : 'hover:bg-surface-800/50'}
                    ${isDragging ? 'opacity-50' : ''}
                    ${showTopBorder ? 'border-t-2 border-t-foreground/40' : ''}
                    ${showBottomBorder ? 'border-b-2 border-b-foreground/40' : ''}
                  `}
                >
                  {/* Drag Handle */}
                  <td className="py-3 pl-2 pr-0">
                    <div 
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      className="cursor-grab active:cursor-grabbing text-surface-500 hover:text-surface-300 transition-colors flex items-center justify-center"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" strokeWidth={1.8} />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Input
                      type="text"
                      value={isEditing ? editingName : dept.name}
                      readOnly={!isEditing}
                      onFocus={() => beginEditingDepartment(index, dept.name)}
                      onClick={() => beginEditingDepartment(index, dept.name)}
                      onChange={(e) => {
                        if (isEditing) {
                          setEditingName(e.target.value);
                        }
                      }}
                      onBlur={() => {
                        if (isEditing) {
                          commitDepartmentName(index);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          commitDepartmentName(index);
                        }
                        if (e.key === 'Escape') {
                          setEditingIndex(null);
                          setEditingName('');
                        }
                      }}
                      className={[
                        inlineDepartmentNameClassName,
                        isEditing
                          ? 'border-input bg-background text-foreground'
                          : 'border-transparent bg-transparent text-surface-300 shadow-none hover:border-border/70 hover:text-surface-100',
                        !isEditing ? 'cursor-text placeholder:text-surface-500' : '',
                      ].join(' ')}
                      placeholder={isEditing ? 'Department name' : 'Unnamed'}
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <HourInput
                      min="0"
                      max="100"
                      value={dept.targetHours || 0}
                      onValueChange={(value) => updateDepartment(index, { targetHours: value })}
                      className={`py-1 text-center w-24 mx-auto ${hasError ? 'input-error' : ''}`}
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <HourInput
                      min="0"
                      max="100"
                      value={dept.maxHours || 0}
                      onValueChange={(value) => updateDepartment(index, { maxHours: value })}
                      className={`py-1 text-center w-24 mx-auto ${hasError ? 'input-error' : ''}`}
                    />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Button
                      onClick={() => {
                        setDepartmentToDelete({
                          index,
                          name: dept.name || 'this department',
                        });
                      }}
                      variant="ghost"
                      size="icon-sm"
                      className="mx-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete ${dept.name}`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-surface-800/50">
            <tr>
              <td></td>
              <td className="py-3 px-4 font-medium text-surface-300">
                Total
              </td>
              <td className="py-3 px-4 text-center font-medium text-surface-200">
                {formatHoursLabel(totals.target)}
              </td>
              <td className="py-3 px-4 text-center font-medium text-surface-300">
                {formatHoursLabel(totals.max)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Validation Messages */}
      {departments.some(d => d.targetHours > d.maxHours) && (
        <NoticePanel
          variant="error"
          title="Validation error"
          description="Some departments have target hours exceeding max hours. Fix those values before generating a schedule."
        />
      )}
      <ConfirmDialog
        open={departmentToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDepartmentToDelete(null);
          }
        }}
        title="Delete department?"
        description={`Remove ${departmentToDelete?.name ?? 'this department'} from the schedule setup.`}
        confirmLabel="Delete Department"
        confirmVariant="destructive"
        onConfirm={confirmDeleteDepartment}
      />
    </div>
  );
}
