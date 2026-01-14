/**
 * Shared Constants
 * Values shared between main and renderer processes
 */
export declare const DAY_NAMES: readonly ["Mon", "Tue", "Wed", "Thu", "Fri"];
export type DayName = typeof DAY_NAMES[number];
export declare const TIME_SLOT_STARTS: readonly ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
export type TimeSlot = typeof TIME_SLOT_STARTS[number];
export declare const AVAILABILITY_COLUMNS: string[];
export declare const COMMON_ROLES: readonly ["front_desk", "career_education", "marketing", "employer_engagement", "events", "data_systems"];
export type Role = typeof COMMON_ROLES[number] | string;
export declare const DEFAULT_SOLVER_MAX_TIME = 180;
export declare const DEFAULT_MIN_SLOTS = 4;
export declare const DEFAULT_MAX_SLOTS = 8;
export declare const MAX_HOURS_PER_WEEK = 40;
export declare const MIN_HOURS_PER_WEEK = 0;
export declare const MAX_YEAR = 6;
export declare const MIN_YEAR = 1;
//# sourceMappingURL=constants.d.ts.map