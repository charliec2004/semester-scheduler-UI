import { describe, expect, it } from 'vitest';
import { getFlagsRunBlockingIssues } from '../components/tabs/FlagsTab';
import type { Department, StaffMember } from '../../main/ipc-types';

const emptyAvailability = {
  Mon_08_00: true,
};

function makeStaffMember(overrides: Partial<StaffMember>): StaffMember {
  return {
    name: 'Alice',
    roles: ['marketing'],
    targetHours: 10,
    maxHours: 15,
    year: 2,
    unavailabilityBlocks: {
      Mon: [],
      Tue: [],
      Wed: [],
      Thu: [],
      Fri: [],
    },
    availability: emptyAvailability,
    ...overrides,
  };
}

const departments: Department[] = [
  { name: 'Marketing', targetHours: 10, maxHours: 15 },
];

describe('Front Desk disabled run validation', () => {
  it('treats front_desk-only employees as having no schedulable role', () => {
    const issues = getFlagsRunBlockingIssues(
      [makeStaffMember({ roles: ['front_desk'] })],
      departments,
      false,
    );

    expect(issues).toContain('Alice has no qualifications.');
  });

  it('does not require a front_desk-qualified employee when front desk is disabled', () => {
    const issues = getFlagsRunBlockingIssues(
      [makeStaffMember({ roles: ['marketing'] })],
      departments,
      false,
    );

    expect(issues).not.toContain('At least one employee must be qualified for Front Desk while Front Desk is enabled.');
  });
});
