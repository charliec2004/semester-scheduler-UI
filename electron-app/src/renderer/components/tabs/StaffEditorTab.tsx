/**
 * Staff Editor Tab Component
 * Weekly schedule: periods when the student cannot work, plus optional buffer slots.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { useDepartmentStore, useSettingsStore, useStaffStore, useUIStore } from '../../store';
import { EmptyState } from '../ui/EmptyState';
import { NoticePanel } from '../ui/notice-panel';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { HourInput } from '../ui/hour-input';
import { Input } from '../ui/input';
import { looseParseTimeMinutes } from '../../utils/fuzzyTime';
import { formatHoursLabel } from '../../utils/hours';
import {
  BLOCK_END_EXCLUSIVE_OPTIONS,
  COMMON_ROLES,
  createEmptyUnavailabilityBlocks,
  createFullWorkDayAvailability,
  DAY_EXCLUSIVE_END_TIME,
  formatDayLabel,
  DAY_NAMES,
  dayUnavailabilityToTimelineSlotStates,
  parseTimeToMinutes,
  SLOT_MINUTES,
  TIME_SLOT_STARTS,
  travelBufferMinutesToSlots,
  type DayName,
  type UnavailabilityBlock,
} from '@shared/constants';
import type { StaffMember } from '../../../main/ipc-types';

// Convert 24h time to 12h format for display
function formatTime12h(time24: string): string {
  const [hourStr, min] = time24.split(':');
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${min} ${ampm}`;
}

function endTimesAfterStart(startTime: string): string[] {
  const startMin = parseTimeToMinutes(startTime);
  return BLOCK_END_EXCLUSIVE_OPTIONS.filter(e => parseTimeToMinutes(e) > startMin);
}

/** Minutes for an exclusive end option (17:00 = end of working day). */
function exclusiveEndToMinutes(opt: string): number {
  if (opt === DAY_EXCLUSIVE_END_TIME) {
    return 17 * 60;
  }
  return parseTimeToMinutes(opt);
}

function snapToStartSlot(intentMinutes: number): string {
  const minM = parseTimeToMinutes(TIME_SLOT_STARTS[0]);
  const maxM = parseTimeToMinutes(TIME_SLOT_STARTS[TIME_SLOT_STARTS.length - 1]);
  const clamped = Math.max(minM, Math.min(maxM, intentMinutes));
  let nearest = TIME_SLOT_STARTS[0];
  let best = Infinity;
  for (const t of TIME_SLOT_STARTS) {
    const d = Math.abs(parseTimeToMinutes(t) - clamped);
    if (d < best) {
      best = d;
      nearest = t;
    }
  }
  return nearest;
}

/** Smallest valid exclusive end on or after the user's intent (and after start). */
function snapToEndExclusive(startTime: string, intentMinutes: number): string {
  const opts = endTimesAfterStart(startTime);
  if (opts.length === 0) {
    return DAY_EXCLUSIVE_END_TIME;
  }
  let pick = opts[opts.length - 1];
  for (const opt of opts) {
    if (exclusiveEndToMinutes(opt) >= intentMinutes) {
      pick = opt;
      break;
    }
  }
  return pick;
}

function formatBlockTimeLabel(time24: string): string {
  return formatTime12h(time24);
}

function normalizeRoleValue(role: string): string {
  return role.trim().toLowerCase().replace(/\s+/g, '_');
}

function isFrontDeskRole(role: string): boolean {
  return normalizeRoleValue(role) === 'front_desk';
}

function getEffectiveRoles(roles: string[], frontDeskEnabled: boolean): string[] {
  return roles.filter((role) => frontDeskEnabled || !isFrontDeskRole(role));
}

function toTitleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

interface AvailabilityBlockTimeInputsProps {
  rowKey: string;
  startTime: string;
  endTime: string;
  onCommit: (next: { startTime: string; endTime: string }) => void;
}

function Tooltip({ text }: { text: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updatePosition = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 320;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
    setCoords({
      top: rect.bottom + 8,
      left,
    });
  };

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onMouseEnter={(e) => {
          updatePosition(e.currentTarget);
          setShow(true);
        }}
        onMouseLeave={() => setShow(false)}
        onFocus={(e) => {
          updatePosition(e.currentTarget);
          setShow(true);
        }}
        onBlur={() => setShow(false)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-800 text-surface-400 transition-colors hover:text-surface-200 focus:outline-none focus:ring-1 focus:ring-ring"
        aria-label="Availability help"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      {show && (
        <div
          className="pointer-events-none fixed z-[100] w-80 rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-left text-xs leading-5 text-surface-200 shadow-lg"
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

function AvailabilityBlockTimeInputs({ rowKey, startTime, endTime, onCommit }: AvailabilityBlockTimeInputsProps) {
  const [startText, setStartText] = useState(() => formatBlockTimeLabel(startTime));
  const [endText, setEndText] = useState(() => formatBlockTimeLabel(endTime));
  const [startInvalid, setStartInvalid] = useState(false);
  const [endInvalid, setEndInvalid] = useState(false);

  useEffect(() => {
    setStartText(formatBlockTimeLabel(startTime));
    setEndText(formatBlockTimeLabel(endTime));
    setStartInvalid(false);
    setEndInvalid(false);
  }, [startTime, endTime, rowKey]);

  const inputClass = 'input text-sm py-1.5 min-w-[9rem] max-w-[11rem] font-sans';

  const commitStart = () => {
    const parsed = looseParseTimeMinutes(startText);
    if (parsed === null) {
      setStartText(formatBlockTimeLabel(startTime));
      setStartInvalid(true);
      window.setTimeout(() => setStartInvalid(false), 1600);
      return;
    }
    const snapped = snapToStartSlot(parsed);
    const ends = endTimesAfterStart(snapped);
    let nextEnd = endTime;
    if (!ends.includes(nextEnd)) {
      nextEnd = ends[0] ?? DAY_EXCLUSIVE_END_TIME;
    }
    setStartText(formatBlockTimeLabel(snapped));
    setEndText(formatBlockTimeLabel(nextEnd));
    onCommit({ startTime: snapped, endTime: nextEnd });
  };

  const commitEnd = () => {
    const parsed = looseParseTimeMinutes(endText);
    if (parsed === null) {
      setEndText(formatBlockTimeLabel(endTime));
      setEndInvalid(true);
      window.setTimeout(() => setEndInvalid(false), 1600);
      return;
    }
    const snapped = snapToEndExclusive(startTime, parsed);
    setEndText(formatBlockTimeLabel(snapped));
    onCommit({ startTime, endTime: snapped });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="text"
        className={`${inputClass}${startInvalid ? ' input-error' : ''}`}
        value={startText}
        onChange={e => setStartText(e.target.value)}
        onBlur={commitStart}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="8:00 AM"
        aria-label="Window start time"
        spellCheck={false}
      />
      <span className="text-surface-500">–</span>
      <Input
        type="text"
        className={`${inputClass}${endInvalid ? ' input-error' : ''}`}
        value={endText}
        onChange={e => setEndText(e.target.value)}
        onBlur={commitEnd}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="5:00 PM"
        aria-label="Window end time (exclusive)"
        spellCheck={false}
      />
    </div>
  );
}

function defaultNewBlock(): UnavailabilityBlock {
  return {
    startTime: '12:00',
    endTime: '13:00',
    bufferBeforeStart: false,
    bufferAfterEnd: false,
  };
}

function fullDayUnavailableBlock(): UnavailabilityBlock {
  return {
    startTime: TIME_SLOT_STARTS[0],
    endTime: DAY_EXCLUSIVE_END_TIME,
    bufferBeforeStart: false,
    bufferAfterEnd: false,
  };
}

function isFullDayUnavailable(dayBlocks: UnavailabilityBlock[]): boolean {
  return (
    dayBlocks.length === 1 &&
    dayBlocks[0].startTime === TIME_SLOT_STARTS[0] &&
    dayBlocks[0].endTime === DAY_EXCLUSIVE_END_TIME &&
    !dayBlocks[0].bufferBeforeStart &&
    !dayBlocks[0].bufferAfterEnd
  );
}

export function StaffEditorTab() {
  const { staff, updateStaffMember, addStaffMember, removeStaffMember, dirty, setDirty, saveStaff } = useStaffStore();
  const { departments, frontDeskEnabled } = useDepartmentStore();
  const { settings } = useSettingsStore();
  const { showToast } = useUIStore();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeToDelete, setEmployeeToDelete] = useState<{ index: number; name: string } | null>(null);

  const roleLabelMap = useMemo(() => {
    const labels = new Map<string, string>();
    labels.set('front_desk', 'Front Desk');
    departments.forEach((d) => {
      const normalized = normalizeRoleValue(d.name);
      if (normalized) {
        labels.set(normalized, d.name.trim());
      }
    });
    return labels;
  }, [departments]);

  const availableRoles = useMemo(() => {
    const roles = new Set(frontDeskEnabled ? COMMON_ROLES : []);
    roleLabelMap.forEach((_, role) => {
      if (!frontDeskEnabled && role === 'front_desk') {
        return;
      }
      roles.add(role);
    });
    return Array.from(roles).filter(Boolean).sort();
  }, [frontDeskEnabled, roleLabelMap]);

  const formatRoleLabel = useCallback((role: string) => {
    const normalized = normalizeRoleValue(role);
    const mapped = roleLabelMap.get(normalized);
    if (mapped) {
      return mapped;
    }

    const trimmed = role.trim();
    if (!trimmed) {
      return '';
    }

    if (trimmed.includes('_')) {
      return toTitleCaseWords(trimmed.replace(/_/g, ' '));
    }

    return trimmed;
  }, [roleLabelMap]);

  const filteredStaff = useMemo(() => {
    if (!searchTerm) return staff;
    const term = searchTerm.toLowerCase();
    return staff.filter(
      s =>
        s.name.toLowerCase().includes(term) ||
        s.roles.some(r =>
          r.toLowerCase().includes(term) ||
          formatRoleLabel(r).toLowerCase().includes(term),
        ),
    );
  }, [staff, searchTerm, formatRoleLabel]);

  const handleAddEmployee = () => {
    const unavailabilityBlocks = createEmptyUnavailabilityBlocks();
    const defaultRole = frontDeskEnabled
      ? 'front_desk'
      : normalizeRoleValue(departments[0]?.name ?? '');
    const newEmployee: StaffMember = {
      name: '',
      roles: defaultRole ? [defaultRole] : [],
      targetHours: 10,
      maxHours: 15,
      year: 1,
      unavailabilityBlocks,
      availability: createFullWorkDayAvailability(),
    };
    addStaffMember(newEmployee);
    setSelectedIndex(staff.length);
  };

  const selectedEmployee = selectedIndex !== null ? staff[selectedIndex] : null;
  const selectedEmployeeRoleOptions = useMemo(() => {
    const roles = new Set(availableRoles);
    selectedEmployee?.roles.forEach((role) => {
      const normalized = normalizeRoleValue(role);
      if (normalized) {
        roles.add(normalized);
      }
    });
    return Array.from(roles).sort();
  }, [availableRoles, selectedEmployee]);

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      removeStaffMember(employeeToDelete.index);
      setSelectedIndex(null);
      await saveStaff();
      showToast('Employee deleted', 'info');
    } catch (err) {
      console.error('Failed to save after delete:', err);
      showToast('Failed to save changes', 'error');
    } finally {
      setEmployeeToDelete(null);
    }
  };

  const updateDayUnavailability = (employeeIndex: number, day: DayName, dayBlocks: UnavailabilityBlock[]) => {
    const employee = staff[employeeIndex];
    updateStaffMember(employeeIndex, {
      unavailabilityBlocks: {
        ...employee.unavailabilityBlocks,
        [day]: dayBlocks,
      },
    });
  };

  if (staff.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
        title="No Staff Data"
        description="Import a project configuration from Welcome or create employees manually."
        action={{
          label: 'Add First Employee',
          onClick: handleAddEmployee,
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-display font-semibold text-surface-100">Staff Editor</h2>
          <p className="text-surface-400">
            {staff.length} employee{staff.length !== 1 ? 's' : ''}
            {dirty && <span className="ml-2 text-warning-300">(unsaved changes)</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleAddEmployee} variant="secondary" size="sm">
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            Add Employee
          </Button>
          {selectedEmployee && selectedIndex !== null && (
            <Button
              onClick={() => {
                setEmployeeToDelete({
                  index: selectedIndex,
                  name: selectedEmployee.name || 'this employee',
                });
              }}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              Delete Employee
            </Button>
          )}
          <Button
            onClick={async () => {
              try {
                await saveStaff();
                showToast('Staff data saved', 'success');
              } catch (err) {
                console.error('Failed to save staff:', err);
                showToast('Failed to save staff data', 'error');
              }
            }}
            disabled={!dirty || staff.length === 0}
            variant="default"
            size="sm"
          >
            <Check className="h-4 w-4" strokeWidth={1.8} />
            Save
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 card p-0 overflow-hidden h-fit">
          <div className="p-4 border-b border-surface-700">
            <Input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input"
              aria-label="Search employees"
            />
          </div>
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
            {filteredStaff.map(employee => {
              const actualIndex = staff.indexOf(employee);
              const effectiveRoles = getEffectiveRoles(employee.roles, frontDeskEnabled);
              const hasNoRoles = effectiveRoles.length === 0;
              const hasFrontDeskOnlyWhileDisabled = !frontDeskEnabled && employee.roles.length > 0 && hasNoRoles;
              return (
                <button
                  key={actualIndex}
                  onClick={() => setSelectedIndex(actualIndex)}
                  className={`
                    w-full px-4 py-3 text-left border-b border-surface-800 last:border-0
                    hover:bg-surface-800 transition-colors
                    ${selectedIndex === actualIndex ? 'bg-surface-800 border-l-2 border-l-foreground/70' : ''}
                    ${hasNoRoles ? 'bg-surface-900/70 border-l-2 border-l-foreground/40' : ''}
                  `}
                >
                  <div className={`font-medium ${hasNoRoles ? 'text-surface-100' : 'text-surface-200'}`}>
                    {employee.name || <span className="text-surface-500 italic">Unnamed</span>}
                    {hasNoRoles && (
                      <AlertTriangle className="ml-2 inline h-4 w-4 text-surface-400" strokeWidth={1.8} />
                    )}
                  </div>
                  <div className={`text-sm mt-0.5 ${hasNoRoles ? 'text-surface-400' : 'text-surface-400'}`}>
                    {hasNoRoles ? (
                      hasFrontDeskOnlyWhileDisabled ? 'Front Desk only (disabled)' : 'No qualifications'
                    ) : (
                      <>
                        {employee.roles.slice(0, 2).map((role) => formatRoleLabel(role)).join(', ')}
                        {employee.roles.length > 2 && ` +${employee.roles.length - 2}`}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-surface-500 mt-1">
                    Year {employee.year} · {formatHoursLabel(employee.targetHours)} target
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedEmployee ? (
            <>
              <div className="card">
                <h3 className="font-semibold text-surface-200 mb-4">Basic Information</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="emp-name">
                      Name
                    </label>
                    <Input
                      id="emp-name"
                      type="text"
                      value={selectedEmployee.name}
                      onChange={e => updateStaffMember(selectedIndex!, { name: e.target.value })}
                      className="input"
                      placeholder="Employee name"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="emp-year">
                      Academic Year
                    </label>
                    <select
                      id="emp-year"
                      value={selectedEmployee.year}
                      onChange={e => updateStaffMember(selectedIndex!, { year: parseInt(e.target.value) })}
                      className="input"
                    >
                      {[1, 2, 3, 4, 5, 6].map(y => (
                        <option key={y} value={y}>
                          Year {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="emp-target">
                      Target Hours/Week
                    </label>
                    <HourInput
                      id="emp-target"
                      min="0"
                      max="40"
                      value={selectedEmployee.targetHours || 0}
                      onValueChange={value =>
                        updateStaffMember(selectedIndex!, { targetHours: value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="emp-max">
                      Max Hours/Week
                    </label>
                    <HourInput
                      id="emp-max"
                      min="0"
                      max="40"
                      value={selectedEmployee.maxHours || 0}
                      onValueChange={value =>
                        updateStaffMember(selectedIndex!, { maxHours: value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-surface-200 mb-1">Roles / Qualifications</h3>
                {!frontDeskEnabled && selectedEmployee.roles.some((role) => isFrontDeskRole(role)) && (
                  <div className="mb-3">
                    <NoticePanel
                      variant="info"
                      title="Front Desk is disabled for this configuration"
                      description="This employee still has Front Desk saved as a qualification. You can remove it here, or re-enable Front Desk in Departments if you still want to schedule that role."
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {selectedEmployeeRoleOptions.map(role => {
                    const isSelected = selectedEmployee.roles.some(
                      selectedRole => normalizeRoleValue(selectedRole) === role,
                    );
                    return (
                      <button
                        key={role}
                        onClick={() => {
                          const newRoles = isSelected
                            ? selectedEmployee.roles.filter(r => normalizeRoleValue(r) !== role)
                            : [...selectedEmployee.roles, role];
                          updateStaffMember(selectedIndex!, { roles: newRoles });
                        }}
                        className={`
                          rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                          ${isSelected ? 'bg-foreground text-background' : 'bg-surface-700 text-surface-300 hover:bg-surface-600'}
                        `}
                        aria-pressed={isSelected}
                      >
                        {formatRoleLabel(role)}
                      </button>
                    );
                  })}
                </div>
                {getEffectiveRoles(selectedEmployee.roles, frontDeskEnabled).length === 0 && (
                  <div className="mt-3">
                    <NoticePanel
                      variant="warning"
                      title="At least one role is required"
                      description="Add one or more qualifications before generating a schedule."
                    />
                  </div>
                )}
              </div>

              <div className="card">
                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3 className="font-semibold text-surface-200">Define Employee Availiability</h3>
                  <Tooltip
                    text={
                      <>
                        Add classes, meetings, or any other times they are unavailable. End time is exclusive, so{' '}
                        <span className="text-surface-100">10:00</span> blocks through the{' '}
                        <span className="text-surface-100">9:50</span> slot. You can type times like{' '}
                        <span className="text-surface-100">8:00 AM</span>, <span className="text-surface-100">2pm</span>,{' '}
                        <span className="text-surface-100">645pm</span>, or <span className="text-surface-100">17:00</span>.
                        Use the buffer checkboxes to block the extra {SLOT_MINUTES}-minute slot immediately before or after a
                        block. The current buffer length is {settings?.travelBufferMinutes ?? SLOT_MINUTES} minutes.
                      </>
                    }
                  />
                  <span
                    className="hidden h-5 w-px shrink-0 bg-border/80 sm:inline-block"
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-surface-400">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-4 rounded bg-[hsl(var(--action-primary)/0.9)]" />
                      <span>Can work</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-4 rounded bg-[hsl(var(--danger-500)/0.85)]" />
                      <span>Cannot work</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-4 rounded bg-[hsl(var(--warning-500)/0.85)]" />
                      <span>Buffer</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {DAY_NAMES.map(day => {
                    const dayLabel = formatDayLabel(day);
                    const dayBlocks = selectedEmployee.unavailabilityBlocks[day] ?? [];
                    const timeline = dayUnavailabilityToTimelineSlotStates(
                      dayBlocks,
                      travelBufferMinutesToSlots(settings?.travelBufferMinutes ?? SLOT_MINUTES),
                    );
                    const isAvailableAllDay = dayBlocks.length === 0;
                    const isUnavailableAllDay = isFullDayUnavailable(dayBlocks);

                    return (
                      <div key={day} className="rounded-lg border border-surface-800 bg-surface-900/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="font-semibold text-surface-200">{dayLabel}</span>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={isAvailableAllDay ? 'secondary' : 'outline'}
                              size="sm"
                              className={`h-7 px-2.5 text-[12px] ${isAvailableAllDay ? 'cursor-not-allowed opacity-70' : ''}`}
                              aria-disabled={isAvailableAllDay}
                              title={isAvailableAllDay ? 'Already available all day' : undefined}
                              onClick={() => {
                                if (isAvailableAllDay) return;
                                updateDayUnavailability(selectedIndex!, day, []);
                              }}
                            >
                              Available all day
                            </Button>
                            <Button
                              type="button"
                              variant={isUnavailableAllDay ? 'secondary' : 'outline'}
                              size="sm"
                              className={`h-7 px-2.5 text-[12px] ${isUnavailableAllDay ? 'cursor-not-allowed opacity-70' : ''}`}
                              aria-disabled={isUnavailableAllDay}
                              title={isUnavailableAllDay ? 'Already not available all day' : undefined}
                              onClick={() => {
                                if (isUnavailableAllDay) return;
                                updateDayUnavailability(selectedIndex!, day, [fullDayUnavailableBlock()]);
                              }}
                            >
                              Not available all day
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 text-[12px]"
                              onClick={() => {
                                const next = [...dayBlocks, defaultNewBlock()];
                                updateDayUnavailability(selectedIndex!, day, next);
                              }}
                            >
                              + Add block
                            </Button>
                          </div>
                        </div>

                        {dayBlocks.length === 0 ? (
                          <p className="text-xs text-surface-500 mb-2">No blocks this day — they can work the full 8 AM–5 PM grid.</p>
                        ) : (
                          <div className="space-y-2">
                            {dayBlocks.map((block, bi) => (
                              <div
                                key={`${day}-b-${bi}`}
                                className="flex flex-col gap-2 rounded-lg bg-surface-800/80 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center"
                              >
                                <AvailabilityBlockTimeInputs
                                  rowKey={`${day}-${bi}`}
                                  startTime={block.startTime}
                                  endTime={block.endTime}
                                  onCommit={next => {
                                    const nb = [...dayBlocks];
                                    nb[bi] = { ...block, ...next };
                                    updateDayUnavailability(selectedIndex!, day, nb);
                                  }}
                                />
                                <div className="flex flex-wrap gap-4 text-xs text-surface-300 sm:ml-auto">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={block.bufferBeforeStart}
                                      onCheckedChange={value => {
                                        const nb = [...dayBlocks];
                                        nb[bi] = { ...block, bufferBeforeStart: value === true };
                                        updateDayUnavailability(selectedIndex!, day, nb);
                                      }}
                                    />
                                    Buffer before
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={block.bufferAfterEnd}
                                      onCheckedChange={value => {
                                        const nb = [...dayBlocks];
                                        nb[bi] = { ...block, bufferAfterEnd: value === true };
                                        updateDayUnavailability(selectedIndex!, day, nb);
                                      }}
                                    />
                                    Buffer after
                                  </label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="action-danger h-6 px-1.5"
                                    onClick={() => {
                                      const nb = dayBlocks.filter((_, j) => j !== bi);
                                      updateDayUnavailability(selectedIndex!, day, nb);
                                    }}
                                    aria-label={`Remove block ${bi + 1} on ${day}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div
                          className="mt-2 flex h-3 w-full gap-px overflow-hidden rounded"
                          title={`${dayLabel}: ${SLOT_MINUTES}-minute timeline (8 AM–5 PM)`}
                          role="img"
                          aria-label={`${dayLabel} can-work preview`}
                        >
                          {timeline.map((state, si) => (
                            <div
                              key={`${day}-tl-${si}`}
                              className={`min-w-0 flex-1 ${
                                state === 'busy'
                                  ? 'bg-[hsl(var(--danger-500)/0.85)]'
                                  : state === 'buffer'
                                    ? 'bg-[hsl(var(--warning-500)/0.85)]'
                                    : 'bg-[hsl(var(--action-primary)/0.9)]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setEmployeeToDelete({
                      index: selectedIndex!,
                      name: selectedEmployee.name || 'this employee',
                    });
                  }}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                  Delete Employee
                </Button>
              </div>
            </>
          ) : (
            <div className="card flex items-center justify-center h-64 text-surface-400">
              Select an employee from the list to edit
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={employeeToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEmployeeToDelete(null);
          }
        }}
        title={
          employeeToDelete?.name && employeeToDelete.name !== 'this employee'
            ? `Delete employee: ${employeeToDelete.name}`
            : 'Delete employee?'
        }
        description={`Remove ${employeeToDelete?.name ?? 'this employee'} and all of their availability, hour, and role settings.`}
        confirmLabel="Delete Employee"
        confirmVariant="destructive"
        onConfirm={confirmDeleteEmployee}
      />
    </div>
  );
}
