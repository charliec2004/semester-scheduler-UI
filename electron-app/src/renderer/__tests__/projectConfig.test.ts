import { describe, expect, it } from 'vitest';
import type { ConfigSnapshot } from '../../main/ipc-types';
import { createEmptyUnavailabilityBlocks, createFullWorkDayAvailability } from '../../shared/constants';
import { createProjectConfigFile, parseProjectConfigFile, validateProjectConfigSnapshot } from '../utils/projectConfig';

function makeValidSnapshot(): ConfigSnapshot {
  return {
    staff: [
      {
        name: 'Alice',
        roles: ['front_desk', 'marketing'],
        targetHours: 10,
        maxHours: 15,
        year: 2,
        unavailabilityBlocks: createEmptyUnavailabilityBlocks(),
        availability: createFullWorkDayAvailability(),
      },
      {
        name: 'Bob',
        roles: ['events'],
        targetHours: 8,
        maxHours: 12,
        year: 3,
        unavailabilityBlocks: createEmptyUnavailabilityBlocks(),
        availability: createFullWorkDayAvailability(),
      },
    ],
    departments: [
      { name: 'Marketing', targetHours: 20, maxHours: 30 },
      { name: 'Events', targetHours: 15, maxHours: 25 },
    ],
    frontDeskEnabled: false,
    favoredEmployees: { Alice: 1.5 },
    trainingPairs: [{ department: 'Marketing', trainee1: 'Alice', trainee2: 'Bob' }],
    favoredDepartments: { Marketing: 1.25 },
    favoredFrontDeskDepts: { Events: 1 },
    timesets: [{ employee: 'Alice', day: 'Mon', department: 'front_desk', startTime: '08:00', endTime: '09:00' }],
    favoredEmployeeDepts: [{ employee: 'Alice', department: 'front_desk', multiplier: 2 }],
    shiftTimePreferences: [{ employee: 'Bob', day: 'Tue', preference: 'morning' }],
    equalityConstraints: [{ department: 'Events', employee1: 'Alice', employee2: 'Bob' }],
    maxSolveSeconds: 300,
  };
}

describe('project config files', () => {
  it('round-trips a valid project config file', () => {
    const snapshot = makeValidSnapshot();
    const file = createProjectConfigFile(snapshot);
    const parsed = parseProjectConfigFile(JSON.stringify(file));

    expect(parsed.errors).toHaveLength(0);
    expect(parsed.config).toEqual(snapshot);
  });

  it('rejects invalid JSON', () => {
    const parsed = parseProjectConfigFile('{not-json');

    expect(parsed.config).toBeNull();
    expect(parsed.errors[0]?.message).toContain('not valid JSON');
  });

  it('rejects unsupported envelope versions and kinds', () => {
    const parsed = parseProjectConfigFile(JSON.stringify({
      app: 'semester-scheduler',
      kind: 'wrong-kind',
      version: 2,
      config: {},
    }));

    expect(parsed.config).toBeNull();
    expect(parsed.errors.some((error) => error.message.includes('kind is not supported'))).toBe(true);
    expect(parsed.errors.some((error) => error.message.includes('version must be 1'))).toBe(true);
  });

  it('rejects orphaned staff roles', () => {
    const snapshot = makeValidSnapshot();
    snapshot.staff[0].roles = ['career_education'];

    const errors = validateProjectConfigSnapshot(snapshot);
    expect(errors.some((error) => error.message.includes('unknown department role'))).toBe(true);
  });

  it('rejects normalized department collisions', () => {
    const snapshot = makeValidSnapshot();
    snapshot.departments = [
      { name: 'Career Education', targetHours: 20, maxHours: 30 },
      { name: 'career_education', targetHours: 10, maxHours: 20 },
    ];

    const errors = validateProjectConfigSnapshot(snapshot);
    expect(errors.some((error) => error.message.includes('collide after normalization'))).toBe(true);
  });

  it('rejects invalid flag references', () => {
    const snapshot = makeValidSnapshot();
    snapshot.trainingPairs = [{ department: 'Marketing', trainee1: 'Alice', trainee2: 'Charlie' }];

    const errors = validateProjectConfigSnapshot(snapshot);
    expect(errors.some((error) => error.message.includes('unknown employee "Charlie"'))).toBe(true);
  });

  it('allows dormant front desk preferences when front desk is disabled', () => {
    const snapshot = makeValidSnapshot();
    snapshot.frontDeskEnabled = false;

    const errors = validateProjectConfigSnapshot(snapshot);
    expect(errors).toHaveLength(0);
  });
});
