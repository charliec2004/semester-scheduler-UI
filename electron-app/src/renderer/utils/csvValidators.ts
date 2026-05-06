/**
 * CSV Validation and Parsing Utilities
 * Validates staff and department CSVs against expected schemas
 */

import Papa from 'papaparse';
import type { StaffMember, Department, ValidationError, ValidationResult } from '../../main/ipc-types';
import {
  AVAILABILITY_BLOCKS_JSON_COLUMN,
  AVAILABILITY_COLUMNS,
  createDefaultTravelBuffers,
  DAY_NAMES,
  isSlotAlignedHours,
  LEGACY_AVAILABILITY_COLUMNS,
  migrateStaffAvailabilityShape,
  normalizeAvailabilityMap,
  TRAVEL_BUFFER_AFTER_COLUMNS,
  TRAVEL_BUFFER_BEFORE_COLUMNS,
  TRAVEL_BUFFER_COLUMNS,
  TRAVEL_BUFFER_MINUTES,
  UNAVAILABILITY_BLOCKS_JSON_COLUMN,
  unavailabilityBlocksToFlatWorkAvailability,
  travelBufferMinutesToSlots,
  type DayName,
  type LegacyAvailabilityBlock,
  type UnavailabilityBlock,
} from '../../shared/constants';
import { formatHoursValue } from './hours';

export { AVAILABILITY_COLUMNS } from '../../shared/constants';

const REQUIRED_STAFF_COLUMNS = ['name', 'roles', 'target_hours', 'max_hours', 'year'];
const REQUIRED_DEPT_COLUMNS = ['department', 'target_hours', 'max_hours'];

function hasAllHeaders(headers: string[], required: string[]): boolean {
  return required.every(header => headers.includes(header.toLowerCase()));
}

function validateSlotAlignedHours(
  value: number,
  rowNum: number,
  column: string,
  errors: ValidationError[],
): void {
  if (!isNaN(value) && !isSlotAlignedHours(value)) {
    errors.push({
      row: rowNum,
      column,
      message: `${column} must align to 10-minute increments (for example 1, 1.5, 1.6667, 2)`,
      severity: 'error',
    });
  }
}

function parseUnavailabilityBlocksJson(
  raw: string | undefined,
  rowNum: number,
  errors: ValidationError[],
): Record<DayName, UnavailabilityBlock[]> | null {
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      errors.push({
        row: rowNum,
        column: UNAVAILABILITY_BLOCKS_JSON_COLUMN,
        message: 'unavailability_blocks must be a JSON object keyed by weekday',
        severity: 'error',
      });
      return null;
    }
    const out = {} as Record<DayName, UnavailabilityBlock[]>;
    for (const day of DAY_NAMES) {
      const v = (parsed as Record<string, unknown>)[day];
      if (v === undefined) {
        out[day] = [];
        continue;
      }
      if (!Array.isArray(v)) {
        errors.push({
          row: rowNum,
          column: UNAVAILABILITY_BLOCKS_JSON_COLUMN,
          message: `unavailability_blocks.${day} must be an array`,
          severity: 'error',
        });
        return null;
      }
      out[day] = v as UnavailabilityBlock[];
    }
    if (!DAY_NAMES.some(day => out[day].length > 0)) {
      return null;
    }
    return out;
  } catch {
    errors.push({
      row: rowNum,
      column: UNAVAILABILITY_BLOCKS_JSON_COLUMN,
      message: 'unavailability_blocks must be valid JSON',
      severity: 'error',
    });
    return null;
  }
}

function parseLegacyAvailabilityBlocksJson(
  raw: string | undefined,
  rowNum: number,
  errors: ValidationError[],
): Record<DayName, LegacyAvailabilityBlock[]> | null {
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      errors.push({
        row: rowNum,
        column: AVAILABILITY_BLOCKS_JSON_COLUMN,
        message: 'availability_blocks must be a JSON object keyed by weekday',
        severity: 'error',
      });
      return null;
    }
    const out = {} as Record<DayName, LegacyAvailabilityBlock[]>;
    for (const day of DAY_NAMES) {
      const v = (parsed as Record<string, unknown>)[day];
      if (v === undefined) {
        out[day] = [];
        continue;
      }
      if (!Array.isArray(v)) {
        errors.push({
          row: rowNum,
          column: AVAILABILITY_BLOCKS_JSON_COLUMN,
          message: `availability_blocks.${day} must be an array`,
          severity: 'error',
        });
        return null;
      }
      out[day] = v as LegacyAvailabilityBlock[];
    }
    if (!DAY_NAMES.some(day => out[day].length > 0)) {
      return null;
    }
    return out;
  } catch {
    errors.push({
      row: rowNum,
      column: AVAILABILITY_BLOCKS_JSON_COLUMN,
      message: 'availability_blocks must be valid JSON',
      severity: 'error',
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Staff CSV Validation
// ---------------------------------------------------------------------------

export function validateStaffCsv(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push({
        row: err.row,
        message: err.message,
        severity: 'error',
      });
    }
  }

  const headers = parsed.meta.fields || [];

  // Check required columns
  for (const col of REQUIRED_STAFF_COLUMNS) {
    if (!headers.includes(col)) {
      errors.push({
        column: col,
        message: `Missing required column: ${col}`,
        severity: 'error',
      });
    }
  }

  const hasUnavailabilityJsonColumn = headers.includes(UNAVAILABILITY_BLOCKS_JSON_COLUMN);
  const hasLegacyAvailabilityJsonColumn = headers.includes(AVAILABILITY_BLOCKS_JSON_COLUMN);
  const hasCurrentAvailabilityGrid = hasAllHeaders(headers, AVAILABILITY_COLUMNS);
  const hasLegacyAvailabilityGrid = hasAllHeaders(headers, LEGACY_AVAILABILITY_COLUMNS);

  if (!hasUnavailabilityJsonColumn && !hasLegacyAvailabilityJsonColumn) {
    if (!hasCurrentAvailabilityGrid) {
      if (hasLegacyAvailabilityGrid) {
        warnings.push({
          message: 'Legacy 30-minute availability columns detected. They will be expanded to the 10-minute grid on import.',
          severity: 'warning',
        });
      } else {
        errors.push({
          message:
            'Missing schedule data. Provide unavailability_blocks JSON, legacy availability_blocks JSON, the full 10-minute grid, or the legacy 30-minute grid.',
          severity: 'error',
        });
      }
    }
  } else {
    if (hasUnavailabilityJsonColumn) {
      warnings.push({
        message:
          'unavailability_blocks column detected. Per-slot columns (if present) are ignored for rows with valid JSON unavailability.',
        severity: 'warning',
      });
    }
    if (hasLegacyAvailabilityJsonColumn) {
      warnings.push({
        message:
          'Legacy availability_blocks column detected (periods when the student CAN work). Prefer unavailability_blocks for new files.',
        severity: 'warning',
      });
    }
  }

  // Validate each row
  const names = new Set<string>();
  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNum = i + 2; // Account for header row

    // Name validation
    const name = row.name?.trim();
    if (!name) {
      errors.push({
        row: rowNum,
        column: 'name',
        message: 'Name is required',
        severity: 'error',
      });
    } else if (names.has(name.toLowerCase())) {
      errors.push({
        row: rowNum,
        column: 'name',
        message: `Duplicate name: ${name}`,
        severity: 'error',
      });
    } else {
      names.add(name.toLowerCase());
    }

    // Roles validation
    const roles = row.roles?.trim();
    if (!roles) {
      errors.push({
        row: rowNum,
        column: 'roles',
        message: 'At least one role is required',
        severity: 'error',
      });
    }

    // Hours validation
    const targetHours = parseFloat(row.target_hours);
    const maxHours = parseFloat(row.max_hours);

    if (isNaN(targetHours) || targetHours < 0) {
      errors.push({
        row: rowNum,
        column: 'target_hours',
        message: 'target_hours must be a non-negative number',
        severity: 'error',
      });
    }

    if (isNaN(maxHours) || maxHours < 0) {
      errors.push({
        row: rowNum,
        column: 'max_hours',
        message: 'max_hours must be a non-negative number',
        severity: 'error',
      });
    }

    if (!isNaN(targetHours) && !isNaN(maxHours) && targetHours > maxHours) {
      errors.push({
        row: rowNum,
        message: 'target_hours cannot exceed max_hours',
        severity: 'error',
      });
    }

    validateSlotAlignedHours(targetHours, rowNum, 'target_hours', errors);
    validateSlotAlignedHours(maxHours, rowNum, 'max_hours', errors);

    // Year validation
    const year = parseInt(row.year);
    if (isNaN(year) || year < 1 || year > 6) {
      warnings.push({
        row: rowNum,
        column: 'year',
        message: 'year should be 1-6 (academic year)',
        severity: 'warning',
      });
    }

    const unavailFromJson = hasUnavailabilityJsonColumn
      ? parseUnavailabilityBlocksJson(row[UNAVAILABILITY_BLOCKS_JSON_COLUMN], rowNum, errors)
      : null;
    const legacyAvailFromJson = hasLegacyAvailabilityJsonColumn
      ? parseLegacyAvailabilityBlocksJson(row[AVAILABILITY_BLOCKS_JSON_COLUMN], rowNum, errors)
      : null;

    const hasScheduleGrid = hasCurrentAvailabilityGrid || hasLegacyAvailabilityGrid;
    if (
      !unavailFromJson &&
      !legacyAvailFromJson &&
      !hasScheduleGrid &&
      (hasUnavailabilityJsonColumn || hasLegacyAvailabilityJsonColumn)
    ) {
      errors.push({
        row: rowNum,
        message:
          'This row has no usable schedule: provide non-empty unavailability_blocks or availability_blocks JSON, or include the full availability grid.',
        severity: 'error',
      });
    }

    if (!unavailFromJson && !legacyAvailFromJson && hasCurrentAvailabilityGrid) {
      for (const col of AVAILABILITY_COLUMNS) {
        const val = row[col.toLowerCase()];
        if (val !== undefined && val !== '' && val !== '0' && val !== '1') {
          warnings.push({
            row: rowNum,
            column: col,
            message: `Availability should be 0 or 1, got: ${val}`,
            severity: 'warning',
          });
        }
      }
    }

    for (const col of TRAVEL_BUFFER_COLUMNS) {
      const val = row[col.toLowerCase()];
      if (val !== undefined && val !== '' && val !== '0' && val !== '1') {
        warnings.push({
          row: rowNum,
          column: col,
          message: `Travel buffer flag should be 0 or 1, got: ${val}`,
          severity: 'warning',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function parseStaffCsv(content: string): StaffMember[] {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const headers = parsed.meta.fields || [];
  const hasUnavailabilityJsonColumn = headers.includes(UNAVAILABILITY_BLOCKS_JSON_COLUMN);
  const hasLegacyAvailabilityJsonColumn = headers.includes(AVAILABILITY_BLOCKS_JSON_COLUMN);

  return parsed.data.map(row => {
    const travelBuffers = createDefaultTravelBuffers();
    for (const day of DAY_NAMES) {
      travelBuffers[day].beforeNextCommitment = row[TRAVEL_BUFFER_BEFORE_COLUMNS[day].toLowerCase()] === '1';
      travelBuffers[day].afterPreviousCommitment = row[TRAVEL_BUFFER_AFTER_COLUMNS[day].toLowerCase()] === '1';
    }

    const unavailFromJson = hasUnavailabilityJsonColumn
      ? parseUnavailabilityBlocksJson(row[UNAVAILABILITY_BLOCKS_JSON_COLUMN], 0, [])
      : null;
    const legacyAvailFromJson = hasLegacyAvailabilityJsonColumn
      ? parseLegacyAvailabilityBlocksJson(row[AVAILABILITY_BLOCKS_JSON_COLUMN], 0, [])
      : null;

    const rawAvailability: Record<string, boolean> = {};
    for (const col of AVAILABILITY_COLUMNS) {
      if (row[col.toLowerCase()] !== undefined) {
        rawAvailability[col] = row[col.toLowerCase()] === '1';
      }
    }
    for (const col of LEGACY_AVAILABILITY_COLUMNS) {
      if (row[col.toLowerCase()] !== undefined) {
        rawAvailability[col] = row[col.toLowerCase()] === '1';
      }
    }

    const unavailNonEmpty = unavailFromJson && tmpHasNonEmptyUnavailability(unavailFromJson);
    const legacyAvailNonEmpty = legacyAvailFromJson && tmpHasNonEmptyLegacyAvailability(legacyAvailFromJson);

    const { unavailabilityBlocks, availability } = migrateStaffAvailabilityShape(
      unavailNonEmpty
        ? { unavailabilityBlocks: unavailFromJson }
        : legacyAvailNonEmpty
          ? { availabilityBlocks: legacyAvailFromJson }
          : {
              availability: normalizeAvailabilityMap(rawAvailability),
              travelBuffers,
            },
    );

    return {
      name: row.name?.trim() || '',
      roles: (row.roles || '').split(/[;,]/).map(r => r.trim().toLowerCase()).filter(Boolean),
      targetHours: parseFloat(row.target_hours) || 0,
      maxHours: parseFloat(row.max_hours) || 0,
      year: parseInt(row.year) || 1,
      unavailabilityBlocks,
      availability,
    };
  });
}

function tmpHasNonEmptyUnavailability(blocks: Record<DayName, UnavailabilityBlock[]>): boolean {
  return DAY_NAMES.some(day => (blocks[day]?.length ?? 0) > 0);
}

function tmpHasNonEmptyLegacyAvailability(blocks: Record<DayName, LegacyAvailabilityBlock[]>): boolean {
  return DAY_NAMES.some(day => (blocks[day]?.length ?? 0) > 0);
}

// ---------------------------------------------------------------------------
// Department CSV Validation
// ---------------------------------------------------------------------------

export function validateDepartmentCsv(content: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push({
        row: err.row,
        message: err.message,
        severity: 'error',
      });
    }
  }

  const headers = parsed.meta.fields || [];

  // Check required columns
  for (const col of REQUIRED_DEPT_COLUMNS) {
    if (!headers.includes(col)) {
      errors.push({
        column: col,
        message: `Missing required column: ${col}`,
        severity: 'error',
      });
    }
  }

  // Validate each row
  const deptNames = new Set<string>();

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNum = i + 2;

    // Department name validation
    const deptName = row.department?.trim();
    if (!deptName) {
      errors.push({
        row: rowNum,
        column: 'department',
        message: 'Department name is required',
        severity: 'error',
      });
    } else if (deptName.toLowerCase().replace(/[\s_]+/g, '_') === 'front_desk') {
      errors.push({
        row: rowNum,
        column: 'department',
        message: 'Front Desk is built in and cannot appear as a custom department row',
        severity: 'error',
      });
    } else if (deptNames.has(deptName.toLowerCase())) {
      errors.push({
        row: rowNum,
        column: 'department',
        message: `Duplicate department: ${deptName}`,
        severity: 'error',
      });
    } else {
      deptNames.add(deptName.toLowerCase());
    }

    // Hours validation
    const targetHours = parseFloat(row.target_hours);
    const maxHours = parseFloat(row.max_hours);

    if (isNaN(targetHours) || targetHours < 0) {
      errors.push({
        row: rowNum,
        column: 'target_hours',
        message: 'target_hours must be a non-negative number',
        severity: 'error',
      });
    }

    if (isNaN(maxHours) || maxHours < 0) {
      errors.push({
        row: rowNum,
        column: 'max_hours',
        message: 'max_hours must be a non-negative number',
        severity: 'error',
      });
    }

    if (!isNaN(targetHours) && !isNaN(maxHours) && targetHours > maxHours) {
      errors.push({
        row: rowNum,
        message: 'target_hours cannot exceed max_hours',
        severity: 'error',
      });
    }

    validateSlotAlignedHours(targetHours, rowNum, 'target_hours', errors);
    validateSlotAlignedHours(maxHours, rowNum, 'max_hours', errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function parseDepartmentCsv(content: string): Department[] {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  return parsed.data.map(row => ({
    name: row.department?.trim() || '',
    targetHours: parseFloat(row.target_hours) || 0,
    maxHours: parseFloat(row.max_hours) || 0,
  }));
}

// ---------------------------------------------------------------------------
// CSV Export Utilities
// ---------------------------------------------------------------------------

export function staffToCsv(
  staff: StaffMember[],
  travelBufferMinutes: number = TRAVEL_BUFFER_MINUTES,
): string {
  const headers = [
    ...REQUIRED_STAFF_COLUMNS,
    ...TRAVEL_BUFFER_COLUMNS,
    UNAVAILABILITY_BLOCKS_JSON_COLUMN,
    ...AVAILABILITY_COLUMNS,
  ];

  const rows = staff.map(member => {
    const row: Record<string, string> = {
      name: member.name,
      roles: member.roles.join(';'),
      target_hours: formatHoursValue(member.targetHours),
      max_hours: formatHoursValue(member.maxHours),
      year: member.year.toString(),
    };

    for (const day of DAY_NAMES) {
      row[TRAVEL_BUFFER_BEFORE_COLUMNS[day]] = '0';
      row[TRAVEL_BUFFER_AFTER_COLUMNS[day]] = '0';
    }

    row[UNAVAILABILITY_BLOCKS_JSON_COLUMN] = JSON.stringify(member.unavailabilityBlocks);

    const derivedAvailability = unavailabilityBlocksToFlatWorkAvailability(
      member.unavailabilityBlocks,
      travelBufferMinutesToSlots(travelBufferMinutes),
    );

    for (const col of AVAILABILITY_COLUMNS) {
      row[col] = derivedAvailability[col] ? '1' : '0';
    }

    return row;
  });

  return Papa.unparse(rows, { columns: headers });
}

export function departmentsToCsv(departments: Department[]): string {
  const rows = departments.map(dept => ({
    department: dept.name,
    target_hours: formatHoursValue(dept.targetHours),
    max_hours: formatHoursValue(dept.maxHours),
  }));

  return Papa.unparse(rows);
}
