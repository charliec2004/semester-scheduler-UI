import type {
  ConfigSnapshot,
  ProjectConfigFileV1,
  ValidationError,
} from '../../main/ipc-types';
import { normalizeConfigSnapshot } from '../../main/ipc-types';

const PROJECT_CONFIG_APP = 'semester-scheduler';
const PROJECT_CONFIG_KIND = 'project-config';
const PROJECT_CONFIG_VERSION = 1;

function normalizeDepartmentName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_]+/g, '_');
}

function normalizeStaffName(name: string): string {
  return name.trim().toLowerCase();
}

function pushError(
  errors: ValidationError[],
  message: string,
  row?: number,
  column?: string,
): void {
  errors.push({
    row,
    column,
    message,
    severity: 'error',
  });
}

export function createProjectConfigFile(config: ConfigSnapshot): ProjectConfigFileV1 {
  return {
    app: PROJECT_CONFIG_APP,
    kind: PROJECT_CONFIG_KIND,
    version: PROJECT_CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    config: normalizeConfigSnapshot(config),
  };
}

export function validateProjectConfigSnapshot(config: ConfigSnapshot): ValidationError[] {
  const errors: ValidationError[] = [];
  const normalized = normalizeConfigSnapshot(config);

  const departmentNames = new Map<string, string>();
  for (const department of normalized.departments) {
    if (!department.name.trim()) {
      pushError(errors, 'Department name is required.');
      continue;
    }

    const key = normalizeDepartmentName(department.name);
    const existing = departmentNames.get(key);
    if (existing) {
      pushError(
        errors,
        `Department names collide after normalization: "${existing}" and "${department.name}".`,
      );
    } else {
      departmentNames.set(key, department.name);
    }
  }

  const staffNames = new Set<string>();
  for (const member of normalized.staff) {
    if (!member.name.trim()) {
      pushError(errors, 'Employee name is required.');
      continue;
    }

    const normalizedName = normalizeStaffName(member.name);
    staffNames.add(normalizedName);

    for (const role of member.roles) {
      const normalizedRole = normalizeDepartmentName(role);
      if (normalizedRole !== 'front_desk' && !departmentNames.has(normalizedRole)) {
        pushError(
          errors,
          `Employee "${member.name}" references unknown department role "${role}".`,
          undefined,
          'roles',
        );
      }
    }
  }

  for (const employeeName of Object.keys(normalized.favoredEmployees)) {
    if (!staffNames.has(normalizeStaffName(employeeName))) {
      pushError(errors, `Favored employee "${employeeName}" does not exist in staff data.`);
    }
  }

  for (const pair of normalized.trainingPairs) {
    if (
      normalizeDepartmentName(pair.department) !== 'front_desk' &&
      !departmentNames.has(normalizeDepartmentName(pair.department))
    ) {
      pushError(errors, `Training pair references unknown department "${pair.department}".`);
    }
    if (!staffNames.has(normalizeStaffName(pair.trainee1))) {
      pushError(errors, `Training pair references unknown employee "${pair.trainee1}".`);
    }
    if (!staffNames.has(normalizeStaffName(pair.trainee2))) {
      pushError(errors, `Training pair references unknown employee "${pair.trainee2}".`);
    }
  }

  for (const department of Object.keys(normalized.favoredDepartments)) {
    if (!departmentNames.has(normalizeDepartmentName(department))) {
      pushError(errors, `Favored department "${department}" does not exist in department data.`);
    }
  }

  for (const department of Object.keys(normalized.favoredFrontDeskDepts)) {
    if (!departmentNames.has(normalizeDepartmentName(department))) {
      pushError(errors, `Front Desk preference references unknown department "${department}".`);
    }
  }

  for (const preference of normalized.favoredEmployeeDepts) {
    if (!staffNames.has(normalizeStaffName(preference.employee))) {
      pushError(errors, `Favored employee/department pair references unknown employee "${preference.employee}".`);
    }
    if (
      normalizeDepartmentName(preference.department) !== 'front_desk' &&
      !departmentNames.has(normalizeDepartmentName(preference.department))
    ) {
      pushError(errors, `Favored employee/department pair references unknown department "${preference.department}".`);
    }
  }

  for (const timeset of normalized.timesets) {
    if (!staffNames.has(normalizeStaffName(timeset.employee))) {
      pushError(errors, `Required assignment references unknown employee "${timeset.employee}".`);
    }
    if (
      normalizeDepartmentName(timeset.department) !== 'front_desk' &&
      !departmentNames.has(normalizeDepartmentName(timeset.department))
    ) {
      pushError(errors, `Required assignment references unknown department "${timeset.department}".`);
    }
  }

  for (const preference of normalized.shiftTimePreferences) {
    if (!staffNames.has(normalizeStaffName(preference.employee))) {
      pushError(errors, `Shift time preference references unknown employee "${preference.employee}".`);
    }
  }

  for (const constraint of normalized.equalityConstraints) {
    if (
      normalizeDepartmentName(constraint.department) !== 'front_desk' &&
      !departmentNames.has(normalizeDepartmentName(constraint.department))
    ) {
      pushError(errors, `Equality constraint references unknown department "${constraint.department}".`);
    }
    if (!staffNames.has(normalizeStaffName(constraint.employee1))) {
      pushError(errors, `Equality constraint references unknown employee "${constraint.employee1}".`);
    }
    if (!staffNames.has(normalizeStaffName(constraint.employee2))) {
      pushError(errors, `Equality constraint references unknown employee "${constraint.employee2}".`);
    }
  }

  return errors;
}

export function parseProjectConfigFile(content: string): {
  config: ConfigSnapshot | null;
  errors: ValidationError[];
} {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      config: null,
      errors: [
        {
          message: 'Configuration file is not valid JSON.',
          severity: 'error',
        },
      ],
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return {
      config: null,
      errors: [
        {
          message: 'Configuration file must be a JSON object.',
          severity: 'error',
        },
      ],
    };
  }

  const candidate = parsed as Partial<ProjectConfigFileV1>;

  const errors: ValidationError[] = [];
  if (candidate.app !== PROJECT_CONFIG_APP) {
    pushError(errors, 'Configuration file app identifier is not supported.');
  }
  if (candidate.kind !== PROJECT_CONFIG_KIND) {
    pushError(errors, 'Configuration file kind is not supported.');
  }
  if (candidate.version !== PROJECT_CONFIG_VERSION) {
    pushError(errors, `Configuration file version must be ${PROJECT_CONFIG_VERSION}.`);
  }
  if (!candidate.config || typeof candidate.config !== 'object') {
    pushError(errors, 'Configuration file is missing project data.');
    return { config: null, errors };
  }

  const normalized = normalizeConfigSnapshot(candidate.config);
  errors.push(...validateProjectConfigSnapshot(normalized));

  return {
    config: errors.length === 0 ? normalized : null,
    errors,
  };
}
