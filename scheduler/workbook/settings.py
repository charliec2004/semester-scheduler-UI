"""Workbook schema constants and setting definitions."""

from __future__ import annotations

from scheduler.config import DAY_END_MINUTES, SLOT_MINUTES, TIME_SLOT_STARTS
from scheduler.workbook.models import WorkbookSettingDefinition

WORKBOOK_SCHEMA_VERSION = 1
WORKBOOK_TEMPLATE_FILENAME = "semester_scheduler_project.xlsx"

README_SHEET = "README"
PROJECT_SHEET = "Project"
STAFF_SHEET = "Staff"
DEPARTMENTS_SHEET = "Departments"
UNAVAILABILITY_SHEET = "Unavailability"
PREFERENCES_SHEET = "Preferences"
CONSTRAINTS_SHEET = "Constraints"
SETTINGS_SHEET = "Settings"
VALIDATION_SHEET = "Validation"
SOLVER_AVAILABILITY_SHEET = "Solver_Availability"

RESULT_SHEET_NAMES = {
    "weekly": "Results_Weekly",
    "formatted": "Results_Formatted",
    "monday": "Results_Mon",
    "tuesday": "Results_Tue",
    "wednesday": "Results_Wed",
    "thursday": "Results_Thu",
    "friday": "Results_Fri",
    "employees": "Results_Employees",
    "departments": "Results_Departments",
    "status": "Results_Status",
}

ALL_WORKBOOK_SHEETS = [
    README_SHEET,
    PROJECT_SHEET,
    STAFF_SHEET,
    DEPARTMENTS_SHEET,
    UNAVAILABILITY_SHEET,
    PREFERENCES_SHEET,
    CONSTRAINTS_SHEET,
    SETTINGS_SHEET,
    VALIDATION_SHEET,
    SOLVER_AVAILABILITY_SHEET,
    *RESULT_SHEET_NAMES.values(),
]

PROJECT_FIELDS = (
    "schema_version",
    "project_name",
    "front_desk_enabled",
    "notes",
)

PREFERENCE_SECTION_HEADERS: dict[str, list[str]] = {
    "Favored Employees": ["employee", "multiplier"],
    "Favored Departments": ["department", "multiplier"],
    "Favored Front Desk Departments": ["department", "multiplier"],
    "Favored Employee Departments": ["employee", "department", "multiplier"],
    "Shift Time Preferences": ["employee", "day", "preference"],
}

CONSTRAINT_SECTION_HEADERS: dict[str, list[str]] = {
    "Training Pairs": ["department", "trainee1", "trainee2"],
    "Timesets": ["employee", "day", "department", "start_time", "end_time"],
    "Equality Constraints": ["department", "employee1", "employee2"],
}

FINAL_EDGE_LABEL = f"{DAY_END_MINUTES // 60:02d}:{DAY_END_MINUTES % 60:02d}"
TIME_VALUE_OPTIONS = tuple([*TIME_SLOT_STARTS, FINAL_EDGE_LABEL])

WORKBOOK_SETTINGS: tuple[WorkbookSettingDefinition, ...] = (
    WorkbookSettingDefinition("solverMaxTime", 180, "int", "seconds", "Maximum solver runtime.", solver_argument="solver_max_time"),
    WorkbookSettingDefinition("minSlots", 12, "int", f"{SLOT_MINUTES}-minute slots", "Minimum shift length.", solver_argument="min_slots_override"),
    WorkbookSettingDefinition("maxSlots", 24, "int", f"{SLOT_MINUTES}-minute slots", "Maximum shift length.", solver_argument="max_slots_override"),
    WorkbookSettingDefinition("frontDeskCoverageWeight", 10000, "int", "weight", "Priority for front desk coverage.", solver_argument="front_desk_weight_override"),
    WorkbookSettingDefinition("departmentTargetWeight", 1000, "int", "weight", "Priority for department target adherence.", solver_argument="dept_target_weight_override"),
    WorkbookSettingDefinition("officeCoverageWeight", 150, "int", "weight", "Reward for having at least two people working.", solver_argument="office_coverage_weight_override"),
    WorkbookSettingDefinition("singleCoverageWeight", 500, "int", "weight", "Penalty for leaving only one person working.", solver_argument="single_coverage_weight_override"),
    WorkbookSettingDefinition("targetAdherenceWeight", 100, "int", "weight", "Priority for individual target adherence.", solver_argument="target_adherence_weight_override"),
    WorkbookSettingDefinition("collaborativeHoursWeight", 200, "int", "weight", "Priority for collaborative hours.", solver_argument="collab_weight_override"),
    WorkbookSettingDefinition("departmentSpreadWeight", 60, "int", "weight", "Priority for spreading department work across more slots.", solver_argument="department_spread_weight_override"),
    WorkbookSettingDefinition("departmentDayCoverageWeight", 30, "float", "weight", "Priority for covering departments across more days.", solver_argument="department_day_coverage_weight_override"),
    WorkbookSettingDefinition("shiftLengthWeight", 20, "int", "weight", "Reward for fewer, longer shifts.", solver_argument="shift_length_weight_override"),
    WorkbookSettingDefinition("shiftTimePreferenceWeight", 15, "int", "weight", "Priority for matching morning/afternoon preferences.", solver_argument="shift_time_pref_weight_override"),
    WorkbookSettingDefinition("favoredEmployeeDeptWeight", 50, "int", "weight", "Bonus for favored employee-department pairings.", solver_argument="favor_emp_dept_weight_override"),
    WorkbookSettingDefinition("underclassmenFrontDeskWeight", 1, "float", "weight", "Preference for lower-year front desk assignments.", solver_argument="underclassmen_front_desk_weight_override"),
    WorkbookSettingDefinition("departmentTotalWeight", 1 / 3, "float", "weight", "Tie-break reward for total department work.", solver_argument="department_total_weight_override"),
    WorkbookSettingDefinition("equalityConstraintWeight", 67, "int", "weight", "Penalty weight for equality constraints.", solver_argument="equality_weight_override"),
    WorkbookSettingDefinition("departmentHourThreshold", 4, "int", "hours", "Allowable department deviation before the threshold logic applies.", solver_argument="dept_hour_threshold_override"),
    WorkbookSettingDefinition("targetHardDeltaHours", 5, "int", "hours", "Hard maximum deviation from an employee target.", solver_argument="target_hard_delta_override"),
    WorkbookSettingDefinition("weeklyHourCap", 19, "float", "hours", "Universal weekly cap.", solver_argument="weekly_hour_cap_override"),
    WorkbookSettingDefinition("favoredStudentDailyMaxHours", 8, "float", "hours", "Daily maximum for favored students.", solver_argument="favored_student_daily_max_hours_override"),
    WorkbookSettingDefinition("favoredStudentMinShiftHours", 1, "float", "hours", "Minimum shift length for favored students.", solver_argument="favored_student_min_shift_hours_override"),
    WorkbookSettingDefinition("favoredStudentTargetPriority", 10, "float", "multiplier", "Extra target-hour pressure for favored students.", solver_argument="favored_student_target_priority_override"),
    WorkbookSettingDefinition("favoredStudentFillBonus", 67, "int", "weight", "Bonus per worked slot for favored students.", solver_argument="favored_student_fill_bonus_override"),
    WorkbookSettingDefinition("travelBufferMinutes", 10, "int", "minutes", "Travel buffer applied around unavailability blocks.", solver_argument="travel_buffer_minutes_override"),
    WorkbookSettingDefinition("defaultWeeklyMaxHours", 40, "float", "hours", "Fallback weekly max if staff data omits one.", solver_argument="default_weekly_max_hours_override"),
    WorkbookSettingDefinition("defaultTargetHours", 11, "float", "hours", "Fallback target if staff data omits one.", solver_argument="default_target_hours_override"),
    WorkbookSettingDefinition("trainingMinHours", 1, "float", "hours", "Minimum overlap goal for training pairs.", solver_argument="training_min_hours_override"),
    WorkbookSettingDefinition("trainingOverlapTargetPercent", 35, "float", "percent", "Target overlap percent for training pairs.", solver_argument="training_overlap_target_percent_override"),
    WorkbookSettingDefinition("trainingOverlapWeight", 5000, "int", "weight", "Penalty for missing training overlap.", solver_argument="training_overlap_weight_override"),
    WorkbookSettingDefinition("trainingOverlapBonus", 67, "int", "weight", "Bonus per training overlap slot.", solver_argument="training_overlap_bonus_override"),
    WorkbookSettingDefinition("collaborationMinCareerEducationHours", 1, "float", "hours", "Target collaboration hours for Career Education.", solver_argument="collaboration_min_career_education_hours_override"),
    WorkbookSettingDefinition("collaborationMinMarketingHours", 1, "float", "hours", "Target collaboration hours for Marketing.", solver_argument="collaboration_min_marketing_hours_override"),
    WorkbookSettingDefinition("collaborationMinEmployerEngagementHours", 2, "float", "hours", "Target collaboration hours for Employer Engagement.", solver_argument="collaboration_min_employer_engagement_hours_override"),
    WorkbookSettingDefinition("collaborationMinEventsHours", 4, "float", "hours", "Target collaboration hours for Events.", solver_argument="collaboration_min_events_hours_override"),
    WorkbookSettingDefinition("collaborationMinDataSystemsHours", 0, "float", "hours", "Target collaboration hours for Data Systems.", solver_argument="collaboration_min_data_systems_hours_override"),
    WorkbookSettingDefinition("favoredDepartmentTargetMultiplier", 1.5, "float", "multiplier", "Multiplier for favored department target adherence.", solver_argument="favored_department_target_multiplier_override"),
    WorkbookSettingDefinition("favoredDepartmentFocusedBonus", 10, "int", "weight", "Bonus per focused favored-department slot.", solver_argument="favored_department_focused_bonus_override"),
    WorkbookSettingDefinition("favoredDepartmentDualPenalty", 7, "int", "weight", "Penalty per dual-counted favored-department slot.", solver_argument="favored_department_dual_penalty_override"),
    WorkbookSettingDefinition("favoredFrontDeskDeptBonus", 13, "int", "weight", "Bonus per front desk slot filled by a favored department.", solver_argument="favored_frontdesk_dept_bonus_override"),
    WorkbookSettingDefinition("timesetBonusWeight", 20000, "int", "weight", "Bonus for satisfying explicit timesets.", solver_argument="timeset_bonus_weight_override"),
    WorkbookSettingDefinition("departmentScarcityWeight", 8, "int", "weight", "Penalty for using staff from smaller departments at front desk.", solver_argument="department_scarcity_weight_override"),
    WorkbookSettingDefinition("largeDeviationThresholdHours", 2, "float", "hours", "Hours away from target before large deviation penalties apply.", solver_argument="large_deviation_threshold_hours_override"),
    WorkbookSettingDefinition("employeeLargeDeviationPenalty", 5000, "int", "weight", "Penalty for large employee target deviations.", solver_argument="employee_large_deviation_penalty_override"),
    WorkbookSettingDefinition("departmentLargeDeviationPenalty", 4000, "int", "weight", "Penalty for large department target deviations.", solver_argument="department_large_deviation_penalty_override"),
    WorkbookSettingDefinition("year1TargetMultiplier", 1, "float", "multiplier", "Target adherence multiplier for first-year students.", solver_argument="year1_target_multiplier_override"),
    WorkbookSettingDefinition("year2TargetMultiplier", 1.2, "float", "multiplier", "Target adherence multiplier for second-year students.", solver_argument="year2_target_multiplier_override"),
    WorkbookSettingDefinition("year3TargetMultiplier", 1.5, "float", "multiplier", "Target adherence multiplier for third-year students.", solver_argument="year3_target_multiplier_override"),
    WorkbookSettingDefinition("year4TargetMultiplier", 2, "float", "multiplier", "Target adherence multiplier for fourth-year students.", solver_argument="year4_target_multiplier_override"),
    WorkbookSettingDefinition("fontSize", "medium", "enum", "ui", "Workbook/app font size preference.", choices=("small", "medium", "large")),
    WorkbookSettingDefinition("theme", "dark", "enum", "ui", "Workbook/app theme preference.", choices=("system", "dark", "light")),
    WorkbookSettingDefinition("enforceMinDeptBlock", True, "bool", "boolean", "Enforce 2-hour minimum non-front-desk department blocks.", solver_argument="enforce_min_dept_block"),
    WorkbookSettingDefinition("enforceFavoredTwoHourMinimum", True, "bool", "boolean", "Apply 2-hour minimums to favored employees.", solver_argument="enforce_favored_two_hour_minimum"),
)

WORKBOOK_SETTINGS_BY_KEY = {setting.key: setting for setting in WORKBOOK_SETTINGS}
