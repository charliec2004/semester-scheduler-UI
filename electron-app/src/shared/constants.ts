/**
 * Shared Constants
 * Values shared between main and renderer processes
 */

// Days of the week
export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
export type DayName = typeof DAY_NAMES[number];

// Time slots (30-minute increments, 8am-5pm)
export const TIME_SLOT_STARTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
] as const;

export type TimeSlot = typeof TIME_SLOT_STARTS[number];

// Generate all availability column names
export const AVAILABILITY_COLUMNS = DAY_NAMES.flatMap(day =>
  TIME_SLOT_STARTS.map(time => `${day}_${time}`)
);

// Common roles
export const COMMON_ROLES = [
  'front_desk',
  'career_education',
  'marketing',
  'employer_engagement',
  'events',
  'data_systems',
] as const;

export type Role = typeof COMMON_ROLES[number] | string;

// Solver defaults
export const DEFAULT_SOLVER_MAX_TIME = 180; // seconds
export const DEFAULT_MIN_SLOTS = 4; // 2 hours
export const DEFAULT_MAX_SLOTS = 8; // 4 hours

// Validation limits
export const MAX_HOURS_PER_WEEK = 40;
export const MIN_HOURS_PER_WEEK = 0;
export const MAX_YEAR = 6;
export const MIN_YEAR = 1;
