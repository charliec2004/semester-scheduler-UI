"use strict";
/**
 * Shared Constants
 * Values shared between main and renderer processes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_YEAR = exports.MAX_YEAR = exports.MIN_HOURS_PER_WEEK = exports.MAX_HOURS_PER_WEEK = exports.DEFAULT_MAX_SLOTS = exports.DEFAULT_MIN_SLOTS = exports.DEFAULT_SOLVER_MAX_TIME = exports.COMMON_ROLES = exports.AVAILABILITY_COLUMNS = exports.TIME_SLOT_STARTS = exports.DAY_NAMES = void 0;
// Days of the week
exports.DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
// Time slots (30-minute increments, 8am-5pm)
exports.TIME_SLOT_STARTS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];
// Generate all availability column names
exports.AVAILABILITY_COLUMNS = exports.DAY_NAMES.flatMap(day => exports.TIME_SLOT_STARTS.map(time => `${day}_${time}`));
// Common roles
exports.COMMON_ROLES = [
    'front_desk',
    'career_education',
    'marketing',
    'employer_engagement',
    'events',
    'data_systems',
];
// Solver defaults
exports.DEFAULT_SOLVER_MAX_TIME = 180; // seconds
exports.DEFAULT_MIN_SLOTS = 4; // 2 hours
exports.DEFAULT_MAX_SLOTS = 8; // 4 hours
// Validation limits
exports.MAX_HOURS_PER_WEEK = 40;
exports.MIN_HOURS_PER_WEEK = 0;
exports.MAX_YEAR = 6;
exports.MIN_YEAR = 1;
//# sourceMappingURL=constants.js.map